const jwt = require('jsonwebtoken');

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
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email || '',
      name: decoded.name || '',
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please log in again.',
    });
  }
};

/**
 * Optional Authentication Middleware
 *
 * Attempts to verify the token but does not fail if no token is present.
 * Useful for endpoints that behave differently for authenticated vs anonymous users.
 */
const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email || '',
      name: decoded.name || '',
    };
  } catch {
    // Silently ignore invalid/expired tokens for optional auth
  }

  next();
};

module.exports = { authenticate, optionalAuthenticate };

