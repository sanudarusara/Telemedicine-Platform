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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "2rem",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "20px",
          padding: "2rem",
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        }}
      >
        <h2
          style={{
            marginBottom: "0.5rem",
            fontSize: "1.8rem",
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          Payment Page
        </h2>

        <p
          style={{
            textAlign: "center",
            color: "#64748b",
            marginBottom: "1.5rem",
          }}
        >
          Enter payment details and continue with your selected payment method
        </p>

        <input
          type="text"
          placeholder="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={inputStyle}
        />

        <input
          type="text"
          placeholder="Appointment ID"
          value={appointmentId}
          onChange={(e) => setAppointmentId(e.target.value)}
          style={inputStyle}
        />

        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={inputStyle}
        />

        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          style={inputStyle}
        >
          <option value="usd">USD</option>
          <option value="lkr">LKR</option>
        </select>

        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          style={inputStyle}
        >
          <option value="STRIPE">Stripe</option>
          <option value="PAYHERE">PayHere</option>
        </select>

        <button onClick={handlePayment} style={buttonStyle}>
          {paymentMethod === "STRIPE" ? "Pay with Stripe" : "Pay with PayHere"}
        </button>
      </div>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  margin: "0 0 1rem 0",
  padding: "0.85rem 1rem",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  fontSize: "1rem",
  outline: "none",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.9rem 1rem",
  borderRadius: "12px",
  border: "none",
  background: "#0f172a",
  color: "#ffffff",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
};

export default DummyPayment;