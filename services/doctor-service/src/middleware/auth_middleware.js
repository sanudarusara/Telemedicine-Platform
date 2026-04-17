const Doctor = require("../models/doctor_model");

/**
 * Auth middleware that trusts the API Gateway.
 * The gateway verifies the JWT (issued by auth-service) and injects
 * x-user-email / x-user-id / x-user-role as trusted headers.
 * We use the email to locate the corresponding doctor profile.
 */
const protect = async (req, res, next) => {
  // Gateway must identify itself
  const gatewayKey = req.headers["x-api-key"];
  const EXPECTED_KEY = process.env.INTERNAL_API_KEY;

  if (!gatewayKey || (EXPECTED_KEY && gatewayKey !== EXPECTED_KEY)) {
    return res.status(401).json({ message: "Unauthorized: missing gateway key" });
  }

  const userEmail = req.headers["x-user-email"];
  const userRole  = req.headers["x-user-role"];

  if (!userEmail) {
    return res.status(401).json({ message: "No authenticated user context" });
  }

  if (userRole && userRole.toUpperCase() !== "DOCTOR") {
    return res.status(403).json({ message: "Access restricted to doctors" });
  }

  try {
    const doctor = await Doctor.findOne({ email: userEmail });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor profile not found" });
    }

    if (doctor.status === "pending") {
      return res.status(403).json({
        message: "Your account is pending admin approval. Please wait for verification.",
        status: "pending",
      });
    }

    if (doctor.status === "rejected") {
      return res.status(403).json({
        message: "Your account registration has been rejected. Please contact support.",
        status: "rejected",
      });
    }

    req.doctor = doctor;
    // Expose the auth-service userId (from gateway header) so controllers
    // can query appointments/prescriptions that were created with the auth userId
    req.doctorAuthId = userEmail ? req.headers['x-user-id'] || null : null;
    next();
  } catch (err) {
    console.error("Error in doctor auth middleware:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { protect };