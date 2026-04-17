const Doctor = require("../models/doctor_model");

/**
 * Doctor profile registration.
 * Creates the doctor profile in this service's DB AND registers the auth-service
 * user account via an internal HTTP call so doctors only need a single API call.
 */
// Doctor registration (Sign Up) — creates doctor profile AND auth-service user
const registerDoctor = async (req, res) => {
  try {
    const {
      name, email, password,
      specialization, clinic, fee, phone,
      startTime, endTime, sessionTime, workingDays,
    } = req.body;

    if (!name || !email || !password || !specialization || !clinic || !phone || fee === undefined) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // 1. Check if doctor profile already exists
    const existingDoctor = await Doctor.findOne({ email: email.toLowerCase().trim() });
    if (existingDoctor) {
      return res.status(400).json({ message: "A doctor with this email already exists" });
    }

    // 2. Create doctor profile (status: pending until admin approves)
    const doctor = new Doctor({
      name,
      email: email.toLowerCase().trim(),
      password,
      specialization,
      clinic,
      fee: Number(fee),
      phone,
      startTime: startTime || "09:00",
      endTime: endTime || "17:00",
      sessionTime: sessionTime ? Number(sessionTime) : 30,
      workingDays: workingDays || ["mon", "tue", "wed", "thu", "fri"],
      status: "pending",
      isActive: false,
    });

    await doctor.save();

    // 3. Register auth-service account (role: DOCTOR) — fire and don't block on error
    const authServiceURL = process.env.AUTH_SERVICE_URL || "http://auth-service:5000";
    try {
      const authRes = await fetch(`${authServiceURL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: email.toLowerCase().trim(), password, role: "DOCTOR" }),
        signal: AbortSignal.timeout(8000),
      });
      if (!authRes.ok) {
        const body = await authRes.json().catch(() => ({}));
        // "already exists" is fine — doctor may be re-registering profile after auth account existed
        if (!body?.message?.toLowerCase().includes("already exists")) {
          console.warn("[registerDoctor] auth-service returned non-OK:", authRes.status, body?.message);
        }
      } else {
        console.log("[registerDoctor] auth-service account created for", email);
      }
    } catch (authErr) {
      // Non-fatal: profile is saved; auth account can be re-synced
      console.error("[registerDoctor] Failed to create auth-service account:", authErr.message);
    }

    return res.status(201).json({
      message: "Doctor registration successful. Awaiting admin approval.",
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        specialization: doctor.specialization,
        status: doctor.status,
      },
    });
  } catch (error) {
    console.error("[registerDoctor] error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "A doctor with this email already exists" });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

// Doctor login — handled by auth-service; this endpoint is deprecated
const loginDoctor = async (req, res) => {
  return res.status(410).json({
    message: "Doctor login is handled by auth-service. Use /api/auth/login.",
  });
};

// Doctor logout
const logoutDoctor = (req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
};

module.exports = { registerDoctor, loginDoctor, logoutDoctor };