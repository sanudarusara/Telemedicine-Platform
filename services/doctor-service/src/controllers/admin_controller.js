const Doctor = require("../models/doctor_model");
const Slot = require("../models/slot_model");

const DAY_MAP = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/**
 * Generate appointment slots for a doctor for the next `daysAhead` days.
 * Respects workingDays, holidayDates, startTime, endTime, sessionTime.
 */
async function generateSlotsForDoctor(doctor, daysAhead = 30) {
  const slotsToInsert = [];
  const today = new Date();

  for (let i = 1; i <= daysAhead; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const dayName = DAY_MAP[d.getDay()];
    if (!doctor.workingDays.includes(dayName)) continue;

    const dateStr = d.toISOString().slice(0, 10);
    if (doctor.holidayDates && doctor.holidayDates.includes(dateStr)) continue;

    // Check for existing slots on this date to avoid duplicates
    const existingCount = await Slot.countDocuments({
      doctorId: doctor._id,
      date: dateStr,
    });
    if (existingCount > 0) continue;

    const [sh, sm] = doctor.startTime.split(":").map(Number);
    const [eh, em] = doctor.endTime.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const session = doctor.sessionTime || 30;

    for (let t = startMin; t + session <= endMin; t += session) {
      const st = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
      const etMin = t + session;
      const et = `${String(Math.floor(etMin / 60)).padStart(2, "0")}:${String(etMin % 60).padStart(2, "0")}`;
      slotsToInsert.push({
        doctorId: doctor._id,
        startTime: st,
        endTime: et,
        date: dateStr,
        isBooked: false,
        isActive: true,
      });
    }
  }

  if (slotsToInsert.length > 0) {
    await Slot.insertMany(slotsToInsert, { ordered: false });
  }
  return slotsToInsert.length;
}

/**
 * GET /api/doctors/admin?status=pending|approved|rejected|all
 * List doctor profiles filtered by status.
 */
const getPendingDoctors = async (req, res) => {
  try {
    const { status = "pending" } = req.query;
    const query = status === "all" ? {} : { status };
    const doctors = await Doctor.find(query)
      .select("-password")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: doctors.length, data: doctors });
  } catch (error) {
    console.error("getPendingDoctors error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/doctors/admin/:id/approve
 * Approve a doctor, set isActive=true, generate slots for next 30 days.
 */
const approveDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    if (doctor.status === "approved") {
      return res.status(400).json({ message: "Doctor is already approved" });
    }

    doctor.status = "approved";
    doctor.isActive = true;
    await doctor.save();

    const slotCount = await generateSlotsForDoctor(doctor, 30);

    console.log(`[admin] Approved doctor ${doctor.email}, generated ${slotCount} slots`);

    return res.status(200).json({
      success: true,
      message: `Doctor approved and ${slotCount} slots generated for the next 30 days.`,
      data: { ...doctor.toObject(), password: undefined },
      slotsGenerated: slotCount,
    });
  } catch (error) {
    console.error("approveDoctor error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/doctors/admin/:id/reject
 * Reject a doctor registration. Body: { reason?: string }
 */
const rejectDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", isActive: false },
      { new: true }
    ).select("-password");

    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    console.log(`[admin] Rejected doctor ${doctor.email}`);

    return res.status(200).json({
      success: true,
      message: "Doctor registration rejected.",
      data: doctor,
    });
  } catch (error) {
    console.error("rejectDoctor error:", error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { getPendingDoctors, approveDoctor, rejectDoctor };
