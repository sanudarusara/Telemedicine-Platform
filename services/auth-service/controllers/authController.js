const authService = require('../services/authService');
const { publishEvent } = require('../config/kafka');
const TOPICS = require('../../shared/kafka/topics');
const EVENTS = require('../../shared/kafka/events');
const { createEvent } = require('../../shared/kafka/eventFactory');

/**
 * AuthController — handles HTTP requests for authentication endpoints.
 * All business logic is delegated to AuthService.
 * Auth events are published to Kafka for audit and downstream services.
 */
class AuthController {
  /**
   * POST /api/auth/register
   * Register a new user account.
   */
  async register(req, res) {
    try {
      const result = await authService.register(req.body);

      if (result && result.user) {
        const event = createEvent({
          eventType: EVENTS.USER_REGISTERED,
          userId: result.user.id,
          userRole: result.user.role,
          serviceName: 'auth-service',
          description: `User registered: ${result.user.email}`,
          status: 'SUCCESS',
          ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
          metadata: {
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
          },
        });

        publishEvent(TOPICS.USER_REGISTERED, event).catch((err) => {
          console.error('[AuthController] Failed to publish user-registered event:', err.message);
        });
      }

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/auth/login
   * Validate credentials and return a JWT.
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      const result = await authService.login(email, password);

      const event = createEvent({
        eventType: EVENTS.LOGIN_SUCCESS,
        userId: result.user.id,
        userRole: result.user.role,
        serviceName: 'auth-service',
        description: `User logged in: ${email}`,
        status: 'SUCCESS',
        ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
        metadata: { email },
      });

      publishEvent(TOPICS.AUTH_EVENTS, event).catch((err) => {
        console.error('[AuthController] Failed to publish login-success event:', err.message);
      });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      if (req.body.email) {
        const failedEvent = createEvent({
          eventType: EVENTS.LOGIN_FAILED,
          userId: req.body.email,
          userRole: 'UNKNOWN',
          serviceName: 'auth-service',
          description: `Login failed for: ${req.body.email}`,
          status: 'FAILED',
          ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
          metadata: { email: req.body.email, reason: error.message },
        });

        publishEvent(TOPICS.AUTH_EVENTS, failedEvent).catch((err) => {
          console.error('[AuthController] Failed to publish login-failed event:', err.message);
        });
      }

      return res.status(401).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/auth/me
   * Return the currently authenticated user's profile.
   * Requires: gateway authentication headers (x-user-id, x-api-key).
   */
  async getMe(req, res) {
    try {
      const user = await authService.getUserById(req.user.id);
      return res.status(200).json({ success: true, data: user });
    } catch (error) {
      return res.status(404).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/auth/deactivate
   * Deactivate the authenticated user's account (soft-delete).
   */
  async deactivateAccount(req, res) {
    try {
      const result = await authService.deactivateAccount(req.user.id);

      const event = createEvent({
        eventType: EVENTS.USER_DEACTIVATED,
        userId: req.user.id,
        userRole: req.user.role,
        serviceName: 'auth-service',
        description: `User account deactivated: ${req.user.email}`,
        status: 'SUCCESS',
        ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
        metadata: { email: req.user.email, role: req.user.role },
      });

      publishEvent(TOPICS.USER_DEACTIVATED, event).catch((err) => {
        console.error('[AuthController] Failed to publish user-deactivated event:', err.message);
      });

      return res.status(200).json({
        success: true,
        message: 'Account deactivated successfully',
        data: result,
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new AuthController();
