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
      console.log('[AuthController] Registration request received:', {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role
      });

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
      console.error('[AuthController] Registration error:', error.message);
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

      console.log('[AuthController] Login request received for email:', email);

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
      console.error('[AuthController] Login error:', error.message);
      
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

  /**
   * GET /api/auth/users  (ADMIN only)
   * List all user accounts.
   */
  async getAllUsers(req, res) {
    try {
      const users = await authService.getAllUsers();
      return res.status(200).json({ success: true, count: users.length, data: users });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PATCH /api/auth/users/:userId/status  (ADMIN only)
   * Activate or deactivate any user account.
   * Body: { isActive: true | false }
   */
  async updateUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ success: false, message: 'isActive must be a boolean' });
      }
      const updated = await authService.updateUserStatus(userId, isActive);

      publishEvent(TOPICS.AUTH_EVENTS, createEvent({
        eventType: isActive ? EVENTS.USER_REGISTERED : EVENTS.USER_DEACTIVATED,
        userId: updated.id.toString(),
        userRole: updated.role,
        serviceName: 'auth-service',
        description: `Admin ${isActive ? 'activated' : 'deactivated'} user: ${updated.email}`,
        status: 'SUCCESS',
        ipAddress: req.ip || '0.0.0.0',
        metadata: { targetUserId: userId, adminId: req.user.id },
      })).catch(() => {});

      return res.status(200).json({ success: true, message: `User ${isActive ? 'activated' : 'deactivated'} successfully`, data: updated });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * PATCH /api/auth/users/:userId/role  (ADMIN only)
   * Update a user's role (e.g. verify a DOCTOR registration).
   * Body: { role: 'PATIENT' | 'DOCTOR' | 'ADMIN' }
   */
  async updateUserRole(req, res) {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const updated = await authService.updateUserRole(userId, role);

      publishEvent(TOPICS.AUTH_EVENTS, createEvent({
        eventType: EVENTS.ROLE_UPDATED,
        userId: updated.id.toString(),
        userRole: updated.role,
        serviceName: 'auth-service',
        description: `Admin updated role for user ${updated.email} to ${role}`,
        status: 'SUCCESS',
        ipAddress: req.ip || '0.0.0.0',
        metadata: { targetUserId: userId, newRole: role, adminId: req.user.id },
      })).catch(() => {});

      return res.status(200).json({ success: true, message: 'User role updated successfully', data: updated });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * PATCH /api/auth/users/:userId/verify  (ADMIN only)
   * Verify a doctor's registration — sets isVerified = true.
   * Only applicable to users with role DOCTOR.
   */
  async verifyDoctor(req, res) {
    try {
      const { userId } = req.params;
      const updated = await authService.verifyDoctor(userId);

      publishEvent(TOPICS.AUTH_EVENTS, createEvent({
        eventType: EVENTS.DOCTOR_VERIFIED,
        userId: updated.id.toString(),
        userRole: updated.role,
        serviceName: 'auth-service',
        description: `Admin verified doctor: ${updated.email}`,
        status: 'SUCCESS',
        ipAddress: req.ip || '0.0.0.0',
        metadata: { targetUserId: userId, adminId: req.user.id },
      })).catch(() => {});

      return res.status(200).json({ success: true, message: 'Doctor verified successfully', data: updated });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/auth/doctors
   * List doctors. Accessible to internal services via gateway headers.
   */
  async getDoctors(req, res) {
    try {
      const filters = {};
      if (req.query.specialty) filters.specialty = req.query.specialty;
      if (req.query.name) filters.name = new RegExp(req.query.name, 'i');

      const doctors = await authService.getDoctors(filters);
      return res.status(200).json({ success: true, count: doctors.length, data: doctors });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/auth/doctors/:id
   * Return single doctor by id.
   */
  async getDoctorById(req, res) {
    try {
      const { id } = req.params;
      const doctor = await authService.getDoctorById(id);
      return res.status(200).json({ success: true, data: doctor });
    } catch (error) {
      return res.status(404).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/auth/doctors/:id/slots
   * Query doctor-owned slots (date optional)
   */
  async getDoctorSlots(req, res) {
    try {
      const { id } = req.params;
      const { date } = req.query;
      const slotService = require('../services/slotService');
      const slots = await slotService.getSlotsForDoctor(id, date);
      return res.status(200).json({ success: true, count: slots.length, data: slots });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/auth/doctors/:id/slots/reserve
   * Body: { date: 'YYYY-MM-DD', timeSlot: '09:00 AM' }
   * Atomically reserve a slot.
   */
  async reserveDoctorSlot(req, res) {
    try {
      const { id } = req.params;
      const { date, timeSlot } = req.body;
      if (!date || !timeSlot) return res.status(400).json({ success: false, message: 'date and timeSlot are required' });
      const slotService = require('../services/slotService');
      const reserved = await slotService.reserve(id, date, timeSlot);
      if (!reserved) return res.status(409).json({ success: false, message: 'Slot already reserved or not found' });
      return res.status(200).json({ success: true, data: reserved });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/auth/doctors/:id/slots/release
   * Body: { date, timeSlot }
   */
  async releaseDoctorSlot(req, res) {
    try {
      const { id } = req.params;
      const { date, timeSlot } = req.body;
      if (!date || !timeSlot) return res.status(400).json({ success: false, message: 'date and timeSlot are required' });
      const slotService = require('../services/slotService');
      const released = await slotService.release(id, date, timeSlot);
      if (!released) return res.status(404).json({ success: false, message: 'Slot not found' });
      return res.status(200).json({ success: true, data: released });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new AuthController();
