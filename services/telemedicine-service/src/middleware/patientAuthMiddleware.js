/**
 * Patient auth middleware that trusts the API Gateway.
 * Validates x-api-key + x-gateway headers, then attaches req.patient from
 * the injected x-user-* headers.
 */
const protectPatient = (req, res, next) => {
  const gatewayKey = req.headers["x-api-key"];
  const isFromGateway = req.headers["x-gateway"] === "true";
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!isFromGateway || (expectedKey && gatewayKey !== expectedKey)) {
    return res.status(401).json({ message: "Unauthorized: missing gateway key" });
  }

  const userId = req.headers["x-user-id"];
  const userRole = req.headers["x-user-role"];

  if (!userId || !userRole) {
    return res.status(401).json({ message: "Not authorized, token missing" });
  }

  if (String(userRole).toUpperCase() !== "PATIENT") {
    return res.status(403).json({ message: "Patient access only" });
  }

  req.patient = {
    _id: userId,
    role: userRole,
    email: req.headers["x-user-email"] || "",
  };

  next();
};

module.exports = { protectPatient };
