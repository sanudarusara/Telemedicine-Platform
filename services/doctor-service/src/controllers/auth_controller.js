const jwt = require("jsonwebtoken");
const Doctor = require("../models/doctor_model");
const JWT_SECRET = process.env.JWT_SECRET;

// Doctor registration (Sign Up)
const registerDoctor = async (req, res) => {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({ message: "JWT configuration missing" });
    }

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
      status: "pending",  // Status will be "pending" until admin approval
    });

    // Save doctor in database
    await doctor.save();

    // Create JWT token for doctor
    const payload = { id: doctor._id, accountType: "doctor", role: doctor.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    // Store the doctor in the session
    req.session.userId = doctor._id;
    req.session.accountType = "doctor";

    res.status(201).json({ message: "Doctor registration successful. Awaiting admin approval.", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Doctor login (Sign In)
const loginDoctor = async (req, res) => {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({ message: "JWT configuration missing" });
    }

    const { email, password } = req.body;

    // Find doctor by email
    const doctor = await Doctor.findOne({ email });
    if (!doctor) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare passwords
    const isMatch = await doctor.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create JWT token
    const payload = { id: doctor._id, accountType: "doctor", role: doctor.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    // Store JWT in session
    req.session.userId = doctor._id;
    req.session.accountType = "doctor";

    res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Doctor logout
const logoutDoctor = (req, res) => {
  try {
    // Destroy the session to log out
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { registerDoctor, loginDoctor, logoutDoctor };