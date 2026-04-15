const jwt = require("jsonwebtoken");
const Doctor = require("../models/doctor_model");

const protect = async (req, res, next) => {
  const authHeader = req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    console.log("No token found in Authorization header");
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded JWT payload:", decoded);

    let doctor = await Doctor.findById(decoded.id);

    if (!doctor) {
      doctor = await Doctor.findOne({ userId: decoded.id });
    }

    if (!doctor) {
      return res.status(404).json({ message: "Doctor profile not found" });
    }

    req.doctor = doctor;
    next();
  } catch (err) {
    console.log("Error verifying token:", err);
    return res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = { protect };