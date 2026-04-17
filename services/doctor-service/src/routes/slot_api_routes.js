const express = require("express");
const mongoose = require("mongoose");
const Slot = require("../models/slot_model");
const { serviceProtect } = require("../middleware/serviceMiddleware");

const router = express.Router();

// All routes require internal service key
router.use(serviceProtect);

/**
 * GET /api/doctors/:id/available-slots?date=YYYY-MM-DD
 * Returns all slots for a doctor on a given date.
 * Response format is compatible with appointment-service expectations
 * (uses "timeSlot" key = startTime value).
 */
router.get("/:id/available-slots", async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query; // expected "YYYY-MM-DD"

    if (!date) {
      return res.status(400).json({ success: false, message: "date query param required (YYYY-MM-DD)" });
    }

    let doctorId;
    if (mongoose.Types.ObjectId.isValid(id)) {
      doctorId = id;
    } else {
      return res.status(400).json({ success: false, message: "Invalid doctor id" });
    }

    const slots = await Slot.find({ doctorId, date, isActive: true }).sort({ startTime: 1 });

    // Normalize to appointment-service compatible format
    const data = slots.map((s) => ({
      _id: s._id,
      timeSlot: s.startTime,      // appointment-service reads s.timeSlot
      startTime: s.startTime,
      endTime: s.endTime,
      date: s.date,
      isBooked: s.isBooked,
    }));

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error("[slot-api] getAvailableSlots error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/doctors/:id/slots/reserve
 * Body: { date: "YYYY-MM-DD", timeSlot: "HH:MM" }
 * Atomically marks a slot as booked.
 */
router.post("/:id/slots/reserve", async (req, res) => {
  try {
    const { id } = req.params;
    const { date, timeSlot } = req.body;

    if (!date || !timeSlot) {
      return res.status(400).json({ success: false, message: "date and timeSlot required" });
    }

    const slot = await Slot.findOneAndUpdate(
      { doctorId: id, date, startTime: timeSlot, isBooked: false, isActive: true },
      { $set: { isBooked: true } },
      { new: true }
    );

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Slot not found or already booked",
      });
    }

    return res.status(200).json({ success: true, data: { ...slot.toObject(), timeSlot: slot.startTime } });
  } catch (err) {
    console.error("[slot-api] reserveSlot error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/doctors/:id/slots/release
 * Body: { date: "YYYY-MM-DD", timeSlot: "HH:MM" }
 * Marks a previously-booked slot as available again.
 */
router.post("/:id/slots/release", async (req, res) => {
  try {
    const { id } = req.params;
    const { date, timeSlot } = req.body;

    if (!date || !timeSlot) {
      return res.status(400).json({ success: false, message: "date and timeSlot required" });
    }

    const slot = await Slot.findOneAndUpdate(
      { doctorId: id, date, startTime: timeSlot },
      { $set: { isBooked: false } },
      { new: true }
    );

    if (!slot) {
      return res.status(404).json({ success: false, message: "Slot not found" });
    }

    return res.status(200).json({ success: true, data: { ...slot.toObject(), timeSlot: slot.startTime } });
  } catch (err) {
    console.error("[slot-api] releaseSlot error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
