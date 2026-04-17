/**
 * Auth middleware that trusts the API Gateway.
 * The gateway verifies the JWT and injects x-user-id / x-user-role / x-user-email.
 * We validate the x-api-key and x-gateway headers to confirm the request came
 * through the gateway, then attach req.doctor from the injected headers.
 */
const protectDoctor = async (req, res, next) => {
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

  if (String(userRole).toUpperCase() !== "DOCTOR") {
    return res.status(403).json({ message: "Doctor access only" });
  }

  req.doctor = {
    _id: userId,
    role: userRole,
    email: req.headers["x-user-email"] || "",
  };

  next();
};

module.exports = { protectDoctor };