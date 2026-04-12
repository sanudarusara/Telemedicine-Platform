/**
 * Gateway Authentication Middleware — Auth Service
 *
 * Validates that the request arrived through the API Gateway by checking:
 *   1. x-gateway header is present and set to 'true'
 *   2. x-api-key header matches the shared INTERNAL_API_KEY
 *
 * On success, extracts user context from gateway-injected headers and
 * attaches req.user = { id, role, email, name }.
 *
 * SECURITY: This middleware must only be applied to routes that are
 * accessed through the gateway. Never expose these endpoints directly.
 */
const validateGatewayRequest = (req, res, next) => {
  const isFromGateway = req.headers['x-gateway'] === 'true';

  if (!isFromGateway) {
    return res.status(401).json({
      success: false,
      message: 'Direct access not allowed. Requests must come through API Gateway.',
    });
  }

  const expectedApiKey = process.env.INTERNAL_API_KEY || 'gateway-secret-key-change-in-production';
  const apiKey = req.headers['x-api-key'];

  if (apiKey !== expectedApiKey) {
    return res.status(401).json({
      success: false,
      message: 'Invalid API key. Unauthorized service-to-service request.',
    });
  }

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

  req.user = {
    id: userId,
    role: userRole,
    email: userEmail || '',
    name: userName || '',
  };

  next();
};

module.exports = { validateGatewayRequest };
