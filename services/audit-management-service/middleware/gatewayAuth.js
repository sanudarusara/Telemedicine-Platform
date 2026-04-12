/**
 * Gateway Authentication Middleware
 * 
 * Validates that the request came from the API Gateway by checking:
 * 1. x-api-key header matches the shared internal API key
 * 2. x-gateway header is present
 * 
 * If valid, extracts user information from gateway-injected headers:
 * - x-user-id
 * - x-user-role
 * - x-user-email
 * - x-user-name
 * 
 * SECURITY: This middleware should ONLY be used when the service is behind
 * the API Gateway. Never expose these endpoints directly to the internet.
 */
const validateGatewayRequest = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const isFromGateway = req.headers['x-gateway'] === 'true';

  // Check if request came from gateway
  if (!isFromGateway) {
    return res.status(401).json({
      success: false,
      message: 'Direct access not allowed. Requests must come through API Gateway.',
    });
  }

  // Validate API key
  const expectedApiKey = process.env.INTERNAL_API_KEY || 'gateway-secret-key-change-in-production';
  
  if (apiKey !== expectedApiKey) {
    return res.status(401).json({
      success: false,
      message: 'Invalid API key. Unauthorized service-to-service request.',
    });
  }

  // Extract user information from gateway headers
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];
  const userEmail = req.headers['x-user-email'];
  const userName = req.headers['x-user-name'];

  if (!userId || !userRole) {
    return res.status(401).json({
      success: false,
      message: 'Missing user authentication headers from gateway.',
    });
  }

  // Attach user info to request (same format as old JWT middleware)
  req.user = {
    id: userId,
    role: userRole,
    email: userEmail,
    name: userName,
  };

  next();
};

/**
 * Role-based Authorization Middleware Factory
 * 
 * Use after validateGatewayRequest to restrict access by role.
 * 
 * Usage:
 *   router.get('/admin-only', validateGatewayRequest, requireRole('ADMIN'), handler)
 *   router.get('/doctors-and-admins', validateGatewayRequest, requireRole('DOCTOR', 'ADMIN'), handler)
 * 
 * @param  {...string} roles  One or more allowed roles (PATIENT | DOCTOR | ADMIN)
 * @returns Express middleware function
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    // Guard: validateGatewayRequest should always run first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This endpoint requires one of the following roles: ${roles.join(', ')}.`,
      });
    }

    next();
  };
};

module.exports = { validateGatewayRequest, requireRole };
