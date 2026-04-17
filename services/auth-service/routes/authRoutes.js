const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateGatewayRequest } = require('../middleware/gatewayAuth');

// @route   POST /api/auth/register
router.post('/register', authController.register.bind(authController));

// @route   POST /api/auth/login
router.post('/login', authController.login.bind(authController));

// @route   GET /api/auth/me
router.get('/me', validateGatewayRequest, authController.getMe.bind(authController));

// @route   POST /api/auth/deactivate
router.post('/deactivate', validateGatewayRequest, authController.deactivateAccount.bind(authController));

// ── Admin-only user management ─────────────────────────────────────────────────

// @route   GET /api/auth/users  (ADMIN)
router.get('/users', validateGatewayRequest, authController.getAllUsers.bind(authController));

// @route   GET /api/auth/doctors  (internal)
router.get('/doctors', validateGatewayRequest, authController.getDoctors.bind(authController));

// @route   GET /api/auth/doctors/:id  (internal)
router.get('/doctors/:id', validateGatewayRequest, authController.getDoctorById.bind(authController));

// @route   GET /api/auth/doctors/:id/slots
router.get('/doctors/:id/slots', validateGatewayRequest, authController.getDoctorSlots.bind(authController));

// @route   POST /api/auth/doctors/:id/slots/reserve
router.post('/doctors/:id/slots/reserve', validateGatewayRequest, authController.reserveDoctorSlot.bind(authController));

// @route   POST /api/auth/doctors/:id/slots/release
router.post('/doctors/:id/slots/release', validateGatewayRequest, authController.releaseDoctorSlot.bind(authController));

// @route   PATCH /api/auth/users/:userId/status  (ADMIN)
router.patch('/users/:userId/status', validateGatewayRequest, authController.updateUserStatus.bind(authController));

// @route   PATCH /api/auth/users/:userId/role  (ADMIN)
router.patch('/users/:userId/role', validateGatewayRequest, authController.updateUserRole.bind(authController));

// @route   DELETE /api/auth/users/:userId  (ADMIN)
router.delete('/users/:userId', validateGatewayRequest, authController.deleteUser.bind(authController));

// @route   PATCH /api/auth/users/:userId/verify  (ADMIN)
router.patch('/users/:userId/verify', validateGatewayRequest, authController.verifyDoctor.bind(authController));

module.exports = router;
