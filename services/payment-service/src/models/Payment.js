const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    appointmentId: { type: String, required: true },
    amount: { type: Number, required: true },

    currency: {
      type: String,
      enum: ["LKR", "USD"],
      default: "LKR",
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["STRIPE", "PAYHERE"],
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING",
    },

    transactionId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);