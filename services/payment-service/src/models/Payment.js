const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    appointmentId: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["PENDING", "SUCCESS", "FAILED"], default: "PENDING" },
    paymentMethod: { type: String },
    transactionId: { type: String }
  },
  { timestamps: true } 
);

module.exports = mongoose.model("Payment", paymentSchema);