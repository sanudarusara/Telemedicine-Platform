const express = require("express");
const mongoose = require("mongoose");
const Slot = require("../models/slot_model");
const Doctor = require("../models/doctor_model");
const { serviceProtect } = require("../middleware/serviceMiddleware");

const router = express.Router();

// All routes require internal service key
router.use(serviceProtect);

function normalizeDateInput(dateValue) {
  if (!dateValue) return "";

  const raw = String(dateValue).trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  // ISO date or full datetime
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return raw;
}

/**
 * GET /api/doctors?name=&specialty=
 * List/search active+approved doctors. Used by appointment-service.
 */
router.get("/", async (req, res) => {
  try {
    const { name, specialty } = req.query;
    const filter = { status: "approved", isActive: true };

    if (name) filter.name = { $regex: name, $options: "i" };
    if (specialty) filter.specialization = { $regex: specialty, $options: "i" };

    console.log("[slot-api] listDoctors query:", req.query);
    console.log("[slot-api] listDoctors mongo filter:", filter);

    const docs = await Doctor.find(filter).select("-password").lean();

    const data = docs.map((d) => ({
      id: d._id.toString(),
      _id: d._id,
      name: d.name,
      specialty: d.specialization,
      specialization: d.specialization,
      clinic: d.clinic,
      fee: d.fee,
      email: d.email,
      phone: d.phone,
      status: d.status,
      isActive: d.isActive,
    }));

    console.log("[slot-api] listDoctors result count:", data.length);

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error("[slot-api] listDoctors error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/doctors/:id/available-slots?date=YYYY-MM-DD
 * Returns all slots for a doctor on a given date.
 */
router.get("/:id/available-slots", async (req, res) => {
  try {
    const { id } = req.params;
    const rawDate = req.query.date;
    const date = normalizeDateInput(rawDate);

    console.log("[slot-api] getAvailableSlots raw params:", {
      id,
      rawDate,
      normalizedDate: date,
      headers: {
        internalApiKeyPresent: !!req.headers["x-internal-api-key"],
        authPresent: !!req.headers.authorization,
      },
    });

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date query param required (YYYY-MM-DD)",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.warn("[slot-api] invalid doctor id:", id);
      return res.status(400).json({
        success: false,
        message: "Invalid doctor id",
      });
    }

    const doctor = await Doctor.findById(id)
      .select("name email specialization status isActive")
      .lean();

    console.log("[slot-api] doctor lookup:", doctor);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const slots = await Slot.find({
      doctorId: id,
      date,
      isActive: true,
    }).sort({ startTime: 1 });

    console.log("[slot-api] slots found:", slots.length);
    if (slots.length > 0) {
      console.log(
        "[slot-api] first few slots:",
        slots.slice(0, 5).map((s) => ({
          id: s._id,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          isBooked: s.isBooked,
          isActive: s.isActive,
        }))
      );
    }

    const data = slots.map((s) => ({
      _id: s._id,
      timeSlot: s.startTime,
      startTime: s.startTime,
      endTime: s.endTime,
      date: s.date,
      isBooked: s.isBooked,
    }));

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("[slot-api] getAvailableSlots error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/doctors/:id/slots/reserve
 * Body: { date: "YYYY-MM-DD", timeSlot: "HH:MM" }
 */
router.post("/:id/slots/reserve", async (req, res) => {
  try {
    const { id } = req.params;
    const { date: rawDate, timeSlot } = req.body;
    const date = normalizeDateInput(rawDate);

    console.log("[slot-api] reserveSlot request:", { id, rawDate, date, timeSlot });

    if (!date || !timeSlot) {
      return res.status(400).json({
        success: false,
        message: "date and timeSlot required",
      });
    }

    const slot = await Slot.findOneAndUpdate(
      { doctorId: id, date, startTime: timeSlot, isBooked: false, isActive: true },
      { $set: { isBooked: true } },
      { new: true }
    );

    if (!slot) {
      console.warn("[slot-api] reserveSlot not found/already booked:", {
        doctorId: id,
        date,
        timeSlot,
      });
      return res.status(404).json({
        success: false,
        message: "Slot not found or already booked",
      });
    }

    return res.status(200).json({
      success: true,
      data: { ...slot.toObject(), timeSlot: slot.startTime },
    });
  } catch (err) {
    console.error("[slot-api] reserveSlot error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/doctors/:id/slots/release
 * Body: { date: "YYYY-MM-DD", timeSlot: "HH:MM" }
 */
router.post("/:id/slots/release", async (req, res) => {
  try {
    const { id } = req.params;
    const { date: rawDate, timeSlot } = req.body;
    const date = normalizeDateInput(rawDate);

    console.log("[slot-api] releaseSlot request:", { id, rawDate, date, timeSlot });

    if (!date || !timeSlot) {
      return res.status(400).json({
        success: false,
        message: "date and timeSlot required",
      });
    }

    const slot = await Slot.findOneAndUpdate(
      { doctorId: id, date, startTime: timeSlot },
      { $set: { isBooked: false } },
      { new: true }
    );

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Slot not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: { ...slot.toObject(), timeSlot: slot.startTime },
    });
  } catch (err) {
    console.error("[slot-api] releaseSlot error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/doctors/:id
 * Return a single doctor profile by doctor-service _id.
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next();
    }

    const doc = await Doctor.findById(id).select("-password").lean();

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const data = {
      id: doc._id.toString(),
      _id: doc._id,
      name: doc.name,
      specialty: doc.specialization,
      specialization: doc.specialization,
      clinic: doc.clinic,
      fee: doc.fee,
      email: doc.email,
      phone: doc.phone,
      status: doc.status,
      isActive: doc.isActive,
    };

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("[slot-api] getDoctorById error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;