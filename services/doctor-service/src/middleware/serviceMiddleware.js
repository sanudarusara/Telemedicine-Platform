/**
 * Internal service middleware for doctor-service.
 * Allows service-to-service calls (e.g. from appointment-service) using only the
 * INTERNAL_API_KEY — no user role required.
 */
const serviceProtect = (req, res, next) => {
  const gatewayKey = req.headers["x-api-key"];
  const EXPECTED_KEY = process.env.INTERNAL_API_KEY;

  if (!gatewayKey || (EXPECTED_KEY && gatewayKey !== EXPECTED_KEY)) {
    return res.status(401).json({ message: "Unauthorized: invalid service key" });
  }
  next();
};

module.exports = { serviceProtect };
