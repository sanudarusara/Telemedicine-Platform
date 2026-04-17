/**
 * Admin-only middleware for doctor-service.
 * Trusts API Gateway headers (same pattern as auth_middleware.js).
 * Only requests forwarded by the gateway with x-user-role: ADMIN are allowed.
 */
const adminProtect = (req, res, next) => {
  const gatewayKey = req.headers["x-api-key"];
  const EXPECTED_KEY = process.env.INTERNAL_API_KEY;

  if (!gatewayKey || (EXPECTED_KEY && gatewayKey !== EXPECTED_KEY)) {
    return res.status(401).json({ message: "Unauthorized: missing gateway key" });
  }

  const userRole = req.headers["x-user-role"];
  if (!userRole || userRole.toUpperCase() !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required" });
  }

  req.adminId = req.headers["x-user-id"] || null;
  next();
};

module.exports = { adminProtect };
