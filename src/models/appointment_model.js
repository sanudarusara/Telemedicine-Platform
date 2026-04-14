const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    appointmentNo: {
      type: String,
      unique: true,
      index: true,
      sparse: true,
    },

    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },

    note: { type: String, trim: true },

    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "no_show", "cancelled"],
      default: "pending",
      index: true,
    },

    payment: {
      status: {
        type: String,
        enum: ["unpaid", "paid", "refunded"],
        default: "unpaid",
        index: true,
      },
      method: {
        type: String,
        enum: ["cash", "card"],
        default: "cash",
      },
      amount: { type: Number, required: true, min: 0 },
      currency: { type: String, default: "LKR" },
      paidAt: { type: Date },
      paidBy: { type: String, enum: ["receptionist"] },
    },

    statusUpdatedAt: Date,
    statusUpdatedBy: {
      type: String,
      enum: ["doctor", "system"],
    },
  },
  { timestamps: true }
);

appointmentSchema.pre("save", async function () {
  if (!this.isNew || this.appointmentNo) {
    return;
  }

  const Appointment =
    mongoose.models.Appointment || mongoose.model("Appointment");

  let appointmentNo;
  let exists = true;

  while (exists) {
    const count = await Appointment.countDocuments();
    const nextNumber = count + 1;
    appointmentNo = `APT-${String(nextNumber).padStart(6, "0")}`;

    const existing = await Appointment.findOne({ appointmentNo });
    exists = !!existing;

    if (exists) {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      appointmentNo = `APT-${String(nextNumber + randomSuffix).padStart(
        6,
        "0"
      )}`;
      const existingRetry = await Appointment.findOne({ appointmentNo });
      exists = !!existingRetry;
    }
  }

  this.appointmentNo = appointmentNo;
});

module.exports = mongoose.model("Appointment", appointmentSchema);