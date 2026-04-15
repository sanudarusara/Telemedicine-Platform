const jwt = require("jsonwebtoken");

const protectDoctor = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: "Not authorized, token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.doctor = {
      _id: decoded.id,
      role: decoded.role,
      accountType: decoded.accountType,
    };

    if (
      String(req.doctor.role).toLowerCase() !== "doctor" &&
      String(req.doctor.accountType).toLowerCase() !== "doctor"
    ) {
      return res.status(403).json({ message: "Doctor access only" });
    }

    next();
  } catch (error) {
    console.error("Telemedicine auth error:", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = { protectDoctor };