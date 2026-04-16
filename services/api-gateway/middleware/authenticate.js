const jwt = require("jsonwebtoken");

/**
 * Gateway Authentication Middleware — Stateless JWT Verification
 *
 * The gateway no longer connects to MongoDB. It verifies the JWT signature
 * only, extracting the user's id, role, email, and name from the token payload.
 * auth-service embeds those fields when signing the token, so no DB lookup
 * is required here.
 *
 * On success, attaches req.user = { id, email, role, name }
 * Downstream services receive this as trusted headers via injectGatewayHeaders.
 */
const authenticate = (req, res, next) => {
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: "Gateway JWT configuration missing.",
    });
  }

  // Allow trusted service-to-gateway calls using the internal API key.
  const incomingApiKey = req.headers["x-api-key"] || req.headers["x_api_key"];
  if (incomingApiKey && incomingApiKey === process.env.INTERNAL_API_KEY) {
    req.user = {
      id: req.headers["x-user-id"] || process.env.SERVICE_USER_ID || "service",
      role: req.headers["x-user-role"] || "SERVICE",
      email: req.headers["x-user-email"] || "",
      name: req.headers["x-user-name"] || process.env.SERVICE_USER_NAME || "",
    };
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email || "",
      name: decoded.name || "",
    };

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please log in again.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid token. Please log in again.",
    });
  }
};

/**
 * Optional Authentication Middleware
 *
 * Attempts to verify the token but does not fail if no token is present.
 */
const optionalAuthenticate = (req, res, next) => {
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const incomingApiKey = req.headers["x-api-key"] || req.headers["x_api_key"];
    if (incomingApiKey && incomingApiKey === process.env.INTERNAL_API_KEY) {
      req.user = {
        id: req.headers["x-user-id"] || process.env.SERVICE_USER_ID || "service",
        role: req.headers["x-user-role"] || "SERVICE",
        email: req.headers["x-user-email"] || "",
        name: req.headers["x-user-name"] || process.env.SERVICE_USER_NAME || "",
      };
    }
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email || "",
      name: decoded.name || "",
    };
  } catch {
    // ignore invalid token in optional auth
  }

  return next();
};

module.exports = { authenticate, optionalAuthenticate };