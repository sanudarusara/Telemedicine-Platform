import { useState } from "react";
import axios from "axios";

const DummyPayment = () => {
  const [userId, setUserId] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("usd");
  const [paymentMethod, setPaymentMethod] = useState("STRIPE");

  const handlePayment = async () => {
    try {
      if (paymentMethod === "STRIPE") {
        const res = await axios.post("http://localhost:5002/payments/create", {
          userId,
          appointmentId,
          amount: Number(amount),
          currency,
          paymentMethod: "STRIPE",
        });

        const { checkoutUrl } = res.data;
        window.location.href = checkoutUrl;
      }

      if (paymentMethod === "PAYHERE") {
        const res = await axios.post("http://localhost:5002/payments/payhere-create", {
          userId,
          appointmentId,
          amount: Number(amount),
        });

        const data = res.data;

        const form = document.createElement("form");
        form.method = "POST";
        form.action = "https://sandbox.payhere.lk/pay/checkout";

        Object.keys(data).forEach((key) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = data[key];
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || "Error creating payment");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Dummy Payment Page</h2>

      <input
        type="text"
        placeholder="User ID"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        style={{ display: "block", margin: "1rem 0" }}
      />

      <input
        type="text"
        placeholder="Appointment ID"
        value={appointmentId}
        onChange={(e) => setAppointmentId(e.target.value)}
        style={{ display: "block", margin: "1rem 0" }}
      />

      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ display: "block", margin: "1rem 0" }}
      />

      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        style={{ display: "block", margin: "1rem 0" }}
      >
        <option value="usd">USD</option>
        <option value="lkr">LKR</option>
      </select>

      <select
        value={paymentMethod}
        onChange={(e) => setPaymentMethod(e.target.value)}
        style={{ display: "block", margin: "1rem 0" }}
      >
        <option value="STRIPE">Stripe</option>
        <option value="PAYHERE">PayHere</option>
      </select>

      <button onClick={handlePayment}>
        {paymentMethod === "STRIPE" ? "Pay with Stripe" : "Pay with PayHere"}
      </button>
    </div>
  );
};

export default DummyPayment;