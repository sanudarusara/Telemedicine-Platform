const Payment = require("../models/Payment");
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const crypto = require("crypto");
const axios = require("axios");

// Create Stripe payment
exports.createPayment = async (req, res) => {
  try {
    const { userId, appointmentId, amount, paymentMethod } = req.body;

    if (!userId || !appointmentId || !amount || !paymentMethod) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (paymentMethod !== "STRIPE") {
      return res.status(400).json({ message: "Only STRIPE supported on this route" });
    }

    const normalizedCurrency = "LKR";

    const payment = new Payment({
      userId,
      appointmentId,
      amount,
      currency: normalizedCurrency,
      paymentMethod: "STRIPE",
      status: "PENDING",
    });

    await payment.save();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: normalizedCurrency.toLowerCase(),
            product_data: {
              name: "Doctor Appointment Payment",
            },
            unit_amount: Math.round(Number(amount) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        paymentId: payment._id.toString(),
        userId,
        appointmentId,
      },
      success_url: `${process.env.CLIENT_URL}/appointments?payment=success`,
      cancel_url: `${process.env.CLIENT_URL}/appointments?payment=cancel`,
    });

    payment.transactionId = session.id;
    await payment.save();

    res.status(200).json({
      message: "Stripe session created",
      checkoutUrl: session.url,
      paymentId: payment._id,
    });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ message: "Payment failed" });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    payment.status = "SUCCESS";
    await payment.save();

    res.status(200).json({
      message: "Payment updated to SUCCESS",
      payment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update payment" });
  }
};

exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.status(200).json(payments);
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json(payment);
  } catch (err) {
    console.error("Error fetching payment:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { status, transactionId } = req.body;

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (!["PENDING", "SUCCESS", "FAILED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    payment.status = status;
    if (transactionId) {
      payment.transactionId = transactionId;
    }

    const updatedPayment = await payment.save();
    res.status(200).json({
      message: "Payment updated",
      data: updatedPayment,
    });
  } catch (err) {
    console.error("Error updating payment:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Stripe webhook
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const paymentId = session.metadata?.paymentId;

      if (paymentId) {
        const payment = await Payment.findByIdAndUpdate(
          paymentId,
          {
            status: "SUCCESS",
            transactionId: session.id,
          },
          { new: true }
        );

        if (payment) {
          await axios.patch(
            `http://appointment-service:3001/api/appointments/${payment.appointmentId}/status`,
            {
              paymentStatus: "paid",
            }
          );
        }
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const paymentId = session.metadata?.paymentId;

      if (paymentId) {
        await Payment.findByIdAndUpdate(paymentId, {
          status: "FAILED",
        });
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ message: "Webhook handler failed" });
  }
};

// Create PayHere payment
exports.createPayHerePayment = async (req, res) => {
  try {
    console.log("PayHere req.body:", req.body);
    console.log("PAYHERE_MERCHANT_ID:", process.env.PAYHERE_MERCHANT_ID);
    console.log("PAYHERE_RETURN_URL:", process.env.PAYHERE_RETURN_URL);

    const { userId, appointmentId, amount, paymentMethod } = req.body;

    if (!userId || !appointmentId || !amount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (paymentMethod && paymentMethod !== "PAYHERE") {
      return res.status(400).json({ message: "Only PAYHERE supported on this route" });
    }

    const normalizedCurrency = "LKR";

    const payment = await Payment.create({
      userId,
      appointmentId,
      amount,
      currency: normalizedCurrency,
      paymentMethod: "PAYHERE",
      status: "PENDING",
    });

    const hash = generateHash(
      process.env.PAYHERE_MERCHANT_ID,
      payment._id.toString(),
      amount,
      normalizedCurrency,
      process.env.PAYHERE_MERCHANT_SECRET
    );

    res.status(201).json({
      merchant_id: process.env.PAYHERE_MERCHANT_ID,
      return_url: process.env.PAYHERE_RETURN_URL,
      cancel_url: process.env.PAYHERE_CANCEL_URL,
      notify_url: process.env.PAYHERE_NOTIFY_URL,

      order_id: payment._id.toString(),
      items: "Doctor Appointment Payment",
      amount: Number(amount).toFixed(2),
      currency: normalizedCurrency,
      hash,

      first_name: "Test",
      last_name: "User",
      email: "testuser@gmail.com",
      phone: "0771234567",
      address: "Colombo",
      city: "Colombo",
      country: "Sri Lanka",
    });
  } catch (error) {
    console.error("PayHere create payment error:", error);
    res.status(500).json({ message: "Failed to create PayHere payment" });
  }
};

function generateHash(merchant_id, order_id, amount, currency, merchant_secret) {
  const formattedAmount = Number(amount).toFixed(2);

  const hashedSecret = crypto
    .createHash("md5")
    .update(merchant_secret)
    .digest("hex")
    .toUpperCase();

  return crypto
    .createHash("md5")
    .update(merchant_id + order_id + formattedAmount + currency + hashedSecret)
    .digest("hex")
    .toUpperCase();
}

// PayHere webhook
exports.handlePayHereNotify = async (req, res) => {
  try {
    const {
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      payment_id,
    } = req.body;

    const localMd5 = crypto
      .createHash("md5")
      .update(
        merchant_id +
          order_id +
          payhere_amount +
          payhere_currency +
          status_code +
          crypto
            .createHash("md5")
            .update(process.env.PAYHERE_MERCHANT_SECRET)
            .digest("hex")
            .toUpperCase()
      )
      .digest("hex")
      .toUpperCase();

    if (localMd5 !== md5sig) {
      return res.status(400).send("Invalid signature");
    }

    const payment = await Payment.findById(order_id);
    if (!payment) {
      return res.status(404).send("Payment not found");
    }

    if (status_code === "2") {
      payment.status = "SUCCESS";
      payment.transactionId = payment_id || payment.transactionId;

      await payment.save();

      await axios.patch(
        `http://appointment-service:3001/api/appointments/${payment.appointmentId}/status`,
        {
          paymentStatus: "paid",
        }
      );
    } else if (status_code === "-1" || status_code === "-2") {
      payment.status = "FAILED";
      await payment.save();
    } else {
      payment.status = "PENDING";
      await payment.save();
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("PayHere notify error:", error);
    return res.status(500).send("Server error");
  }
};