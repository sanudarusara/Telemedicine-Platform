const Doctor = require("../models/doctor_model");

const VALID_WORKING_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function normalizeWorkingDays(workingDays) {
  if (!Array.isArray(workingDays) || workingDays.length === 0) {
    return ["mon", "tue", "wed", "thu", "fri"];
  }

  const cleaned = [
    ...new Set(
      workingDays
        .map((d) => String(d).trim().toLowerCase())
        .filter((d) => VALID_WORKING_DAYS.includes(d))
    ),
  ];

  return cleaned.length ? cleaned : ["mon", "tue", "wed", "thu", "fri"];
}

function normalizeHolidayDates(holidayDates) {
  if (!Array.isArray(holidayDates) || holidayDates.length === 0) {
    return [];
  }

  return [
    ...new Set(
      holidayDates
        .map((d) => String(d).trim())
        .filter(Boolean)
    ),
  ];
}

function isValidHHMM(value) {
  if (!value) return false;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value).trim());
}

const getProfile = async (req, res) => {
  try {
    console.log("req.doctor in getProfile:", req.doctor);

    if (!req.doctor || !req.doctor._id) {
      return res.status(400).json({ message: "Doctor ID not found in request" });
    }

    const doctor = await Doctor.findById(req.doctor._id).select("-password");

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.status(200).json(doctor);
  } catch (error) {
    console.error("Error fetching doctor profile:", error);
    res.status(500).json({ message: "Error fetching doctor profile" });
  }
};

const updateProfile = async (req, res) => {
  try {
    console.log("req.doctor in updateProfile:", req.doctor);

    if (!req.doctor || !req.doctor._id) {
      return res.status(400).json({ message: "Doctor ID not found in request" });
    }

    const {
      name,
      specialization,
      clinic,
      fee,
      phone,
      startTime,
      endTime,
      sessionTime,
      workingDays,
      holidayDates,
    } = req.body;

    if (!name || !specialization || !clinic || fee === undefined || !phone) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (startTime !== undefined && !isValidHHMM(startTime)) {
      return res.status(400).json({ message: "startTime must be in HH:mm format" });
    }

    if (endTime !== undefined && !isValidHHMM(endTime)) {
      return res.status(400).json({ message: "endTime must be in HH:mm format" });
    }

    if (
      sessionTime !== undefined &&
      (!Number.isInteger(Number(sessionTime)) || Number(sessionTime) <= 0)
    ) {
      return res.status(400).json({
        message: "sessionTime must be a positive integer",
      });
    }

    const updateData = {
      name,
      specialization,
      clinic,
      fee,
      phone,
    };

    if (startTime !== undefined) {
      updateData.startTime = String(startTime).trim();
    }

    if (endTime !== undefined) {
      updateData.endTime = String(endTime).trim();
    }

    if (sessionTime !== undefined) {
      updateData.sessionTime = Number(sessionTime);
    }

    if (workingDays !== undefined) {
      updateData.workingDays = normalizeWorkingDays(workingDays);
    }

    if (holidayDates !== undefined) {
      updateData.holidayDates = normalizeHolidayDates(holidayDates);
    }

    const updatedDoctor = await Doctor.findByIdAndUpdate(
      req.doctor._id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedDoctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.status(200).json(updatedDoctor);
  } catch (error) {
    console.error("Error updating doctor profile:", error);
    res.status(500).json({ message: "Error updating doctor profile" });
  }
};

module.exports = { getProfile, updateProfile };