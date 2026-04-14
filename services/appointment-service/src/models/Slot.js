const mongoose = require('mongoose');

/**
 * Slot schema — stores available time slots per doctor and date.
 * Appointment-service owns slot availability for local scheduling logic.
 */
const SlotSchema = new mongoose.Schema(
  {
    doctorId: { type: String, required: true, index: true },
    date: { type: Date, required: true, index: true },
    timeSlot: { type: String, required: true },
    isBooked: { type: Boolean, default: false },
    metadata: { type: Object, default: {} }
  },
  { timestamps: true }
);

SlotSchema.index({ doctorId: 1, date: 1, timeSlot: 1 }, { unique: true });

module.exports = mongoose.model('Slot', SlotSchema);
