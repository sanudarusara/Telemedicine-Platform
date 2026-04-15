const jwt = require("jsonwebtoken");
const User = require("../models/doctorChanneling/user.model");
const Doctor = require("../models/doctorChanneling/doctor.model");

const protectDoctorRoute = async (req, res, next) => {
  try {
    let userId = null;

    // 1) Try Bearer token first
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      const token = req.headers.authorization.split(" ")[1];

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
      }
    }

    // 2) Fallback to session
    if (!userId && req.session && req.session.userId) {
      userId = req.session.userId;
    }

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.role !== "doctor") {
      return res.status(403).json({ message: "Not authorized as a doctor" });
    }

    const doctor = await Doctor.findOne({ userId: user._id });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor profile not found" });
    }

    req.userId = user._id;
    req.role = user.role;
    req.user = user;
    req.doctor = doctor;

    next();
  } catch (error) {
    console.error("Error in protectDoctorRoute middleware:", error);
    return res.status(401).json({ message: "Not authorized" });
  }
};

module.exports = { protectDoctorRoute };