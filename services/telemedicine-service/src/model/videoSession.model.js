const mongoose = require("mongoose");

const videoSessionSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
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

    roomName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    joinUrl: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["created", "active", "ended"],
      default: "created",
      index: true,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    endedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("VideoSession", videoSessionSchema);