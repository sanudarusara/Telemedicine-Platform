const Doctor = require("../models/doctor_model");

/**
 * Doctor profile registration.
 * Creates the doctor's profile record in this service's DB.
 * Authentication (JWT) is handled exclusively by auth-service.
 */
// Doctor registration (Sign Up) — creates doctor profile only
const registerDoctor = async (req, res) => {
  try {
    const { name, email, password, specialization, clinic, fee, phone } = req.body;

    // Check if doctor already exists
    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({ message: "Doctor already exists" });
    }

    // Create a new doctor with "pending" status
    const doctor = new Doctor({
      name,
      email,
      password,
      specialization,
      clinic,
      fee,
      phone,
      status: "pending",
    });

    await doctor.save();

    res.status(201).json({
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
    console.error(error);
    res.status(500).json({ message: "Server error" });
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