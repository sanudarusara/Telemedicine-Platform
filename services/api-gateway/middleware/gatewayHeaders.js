const { INTERNAL_API_KEY } = require('../config/services');

/**
 * Gateway Headers Middleware
 * 
 * Injects trusted headers into requests forwarded to downstream services.
 * Services can trust these headers because they're only accessible via the gateway.
 * 
 * Added headers:
 * - x-user-id: Authenticated user's ID
 * - x-user-role: User's role (PATIENT, DOCTOR, ADMIN)
 * - x-user-email: User's email
 * - x-user-name: User's display name
 * - x-api-key: Internal API key for service-to-service auth
 * - x-gateway: Flag indicating request came through gateway
 * 
 * SECURITY: Services must validate x-api-key to ensure requests came from gateway.
 */
const injectGatewayHeaders = (req, res, next) => {
  // Only inject if user is authenticated
  if (req.user) {
    req.headers['x-user-id'] = req.user.id;
    req.headers['x-user-role'] = req.user.role;
    req.headers['x-user-email'] = req.user.email;
    req.headers['x-user-name'] = req.user.name;
  }

  // Always inject gateway identification and API key
  req.headers['x-api-key'] = INTERNAL_API_KEY;
  req.headers['x-gateway'] = 'true';

  next();
};

module.exports = { injectGatewayHeaders };
