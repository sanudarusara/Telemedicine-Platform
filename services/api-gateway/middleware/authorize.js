/**
 * Role-Based Authorization Middleware
 * 
 * Must be used AFTER authenticate middleware.
 * Checks if the authenticated user has one of the required roles.
 * 
 * Usage:
 *   router.get('/admin-only', authenticate, authorize('ADMIN'), ...)
 *   router.get('/medical-staff', authenticate, authorize('DOCTOR', 'ADMIN'), ...)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Guard: authenticate middleware must run first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
};

module.exports = { authorize };
