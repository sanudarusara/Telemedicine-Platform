const axios = require("axios");
const Doctor = require("../models/doctor_model");
const Slot = require("../models/slot_model");

const DAY_MAP = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Docker-to-docker call. Do NOT use localhost here.
const API_GATEWAY_URL = String(
  process.env.API_GATEWAY_URL || "http://api-gateway:5400"
).replace(/\/$/, "");

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function getForwardHeaders(req) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (req.headers.authorization) {
    headers.Authorization = req.headers.authorization;
  }

  return headers;
}

function extractArray(response) {
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function parseTimeToMinutes(value) {
  if (!value || typeof value !== "string" || !value.includes(":")) return NaN;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

async function gatewayGet(req, path) {
  return axios.get(`${API_GATEWAY_URL}${path}`, {
    headers: getForwardHeaders(req),
    timeout: 8000,
  });
}

async function gatewayPatch(req, path, body) {
  const url = `${API_GATEWAY_URL}${path}`;
  const headers = getForwardHeaders(req);

  const hasBody =
    body !== undefined &&
    body !== null &&
    (typeof body !== "object" ||
      Array.isArray(body) ||
      Object.keys(body).length > 0);

  if (hasBody) {
    return axios.patch(url, body, {
      headers,
      timeout: 8000,
    });
  }

  return axios({
    method: "patch",
    url,
    headers,
    timeout: 8000,
  });
}

async function generateSlotsForDoctor(doctor, daysAhead = 30) {
  console.log("[slots] Starting generation for doctor:", {
    id: String(doctor?._id),
    email: doctor?.email,
    startTime: doctor?.startTime,
    endTime: doctor?.endTime,
    sessionTime: doctor?.sessionTime,
    workingDays: doctor?.workingDays,
    holidayDates: doctor?.holidayDates,
  });

  const slotsToInsert = [];
  const candidateDates = [];
  const today = new Date();

  const startMin = parseTimeToMinutes(doctor.startTime);
  const endMin = parseTimeToMinutes(doctor.endTime);
  const session = Number(doctor.sessionTime || 30);

  if (Number.isNaN(startMin) || Number.isNaN(endMin)) {
    throw new Error(
      `Invalid doctor time range. startTime=${doctor.startTime}, endTime=${doctor.endTime}`
    );
  }

  if (endMin <= startMin) {
    throw new Error(
      `Invalid doctor time range. endTime must be after startTime. startTime=${doctor.startTime}, endTime=${doctor.endTime}`
    );
  }

  if (!session || session <= 0) {
    throw new Error(`Invalid sessionTime: ${doctor.sessionTime}`);
  }

  for (let i = 1; i <= daysAhead; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const dayName = DAY_MAP[d.getDay()];
    if (!doctor.workingDays || !doctor.workingDays.includes(dayName)) continue;

    const dateStr = d.toISOString().slice(0, 10);
    if (doctor.holidayDates && doctor.holidayDates.includes(dateStr)) continue;

    candidateDates.push(dateStr);
  }

  console.log("[slots] candidateDates:", candidateDates.length);

  if (candidateDates.length === 0) {
    console.log("[slots] No candidate dates found");
    return 0;
  }

  const existingSlots = await Slot.find({
    doctorId: doctor._id,
    date: { $in: candidateDates },
  })
    .select("date")
    .lean();

  const existingDateSet = new Set(existingSlots.map((slot) => slot.date));

  console.log("[slots] existing slots found:", existingSlots.length);

  for (const dateStr of candidateDates) {
    if (existingDateSet.has(dateStr)) continue;

    for (let t = startMin; t + session <= endMin; t += session) {
      const st = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(
        t % 60
      ).padStart(2, "0")}`;
      const etMin = t + session;
      const et = `${String(Math.floor(etMin / 60)).padStart(2, "0")}:${String(
        etMin % 60
      ).padStart(2, "0")}`;

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

  console.log("[slots] slots prepared:", slotsToInsert.length);

  if (slotsToInsert.length > 0) {
    await Slot.insertMany(slotsToInsert, { ordered: false });
    console.log("[slots] insertMany complete");
  } else {
    console.log("[slots] No new slots to insert");
  }

  return slotsToInsert.length;
}

async function resolveAuthUserIdForDoctor(doctor, req) {
  if (doctor.userId) {
    return String(doctor.userId);
  }

  if (!doctor.email) {
    throw new Error("Doctor profile has no email. Cannot match auth-service user.");
  }

  const usersRes = await gatewayGet(req, "/api/auth/users");
  const users = extractArray(usersRes);

  const matchedUser = users.find((user) => {
    return (
      normalize(user.email) === normalize(doctor.email) &&
      String(user.role || "").toUpperCase() === "DOCTOR"
    );
  });

  if (!matchedUser) {
    throw new Error(
      `No matching DOCTOR account found in auth-service for ${doctor.email}`
    );
  }

  return String(matchedUser._id || matchedUser.id);
}

async function syncDoctorVerificationWithAuth(doctor, req) {
  const authUserId = await resolveAuthUserIdForDoctor(doctor, req);

  // Do not send {} here
  await gatewayPatch(req, `/api/auth/users/${authUserId}/verify`);

  if (doctor.schema && doctor.schema.path("userId")) {
    doctor.userId = authUserId;
  }

  return authUserId;
}

const getPendingDoctors = async (req, res) => {
  try {
    const { status = "pending" } = req.query;
    const query = status === "all" ? {} : { status };

    const doctors = await Doctor.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    console.error("getPendingDoctors error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const approveDoctor = async (req, res) => {
  try {
    console.log("[approveDoctor] Approving doctor:", req.params.id);

    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    console.log("[approveDoctor] Doctor found:", {
      id: String(doctor._id),
      email: doctor.email,
      status: doctor.status,
      isActive: doctor.isActive,
    });

    const authUserId = await syncDoctorVerificationWithAuth(doctor, req);

    doctor.status = "approved";
    doctor.isActive = true;
    await doctor.save();

    const slotsGenerated = await generateSlotsForDoctor(doctor, 30);

    console.log("[approveDoctor] Success:", {
      doctorId: String(doctor._id),
      authUserId,
      slotsGenerated,
    });

    return res.status(200).json({
      success: true,
      message: "Doctor approved and verified successfully.",
      data: {
        ...doctor.toObject(),
        password: undefined,
      },
      authUserId,
      slotsGenerated,
    });
  } catch (error) {
    console.error(
      "approveDoctor error:",
      error?.response?.data || error.message || error
    );

    return res.status(error?.response?.status || 500).json({
      success: false,
      message:
        error?.response?.data?.message ||
        error.message ||
        "Failed to approve doctor",
    });
  }
};

const rejectDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", isActive: false },
      { new: true }
    ).select("-password");

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Doctor registration rejected.",
      data: doctor,
    });
  } catch (error) {
    console.error("rejectDoctor error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { getPendingDoctors, approveDoctor, rejectDoctor };