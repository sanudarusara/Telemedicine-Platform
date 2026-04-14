const mongoose = require("mongoose");

const prescriptionItemSchema = new mongoose.Schema(
  {
    medicineName: { type: String, required: true, trim: true },
    quantity: { type: Number, min: 1, required: true },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionNo: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true,
      index: true,
    },

    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },

    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true,
      index: true,
    },

    diagnosis: {
      type: String,
      trim: true,
      required: true,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    items: {
      type: [prescriptionItemSchema],
      default: [],
      validate: {
        validator: function (value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "At least one prescription item is required",
      },
    },

    status: {
      type: String,
      enum: ["draft", "issued", "dispensed", "cancelled"],
      default: "issued",
      index: true,
    },

    pharmacy: {
      dispensedAt: { type: Date },
      dispensedBy: { type: String, trim: true },
      remarks: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

prescriptionSchema.index({ doctorId: 1, createdAt: -1 });

module.exports = mongoose.model("Prescription", prescriptionSchema, "prescriptions");