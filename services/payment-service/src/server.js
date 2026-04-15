const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./db");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();
connectDB();

app.use(cors({
  origin: ["http://localhost:8082", "http://localhost:5173"],
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  credentials: true
}));

app.use("/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/payments", paymentRoutes);

const PORT = process.env.PORT || 5004;
app.listen(PORT, () => console.log(`Payment Service running on port ${PORT}`));