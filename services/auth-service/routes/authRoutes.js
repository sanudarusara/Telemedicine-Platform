const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateGatewayRequest } = require('../middleware/gatewayAuth');

// @route   POST /api/auth/register
// @desc    Register a new user account
// @access  Public
router.post('/register', authController.register.bind(authController));

// @route   POST /api/auth/login
// @desc    Authenticate credentials and return a signed JWT
// @access  Public
router.post('/login', authController.login.bind(authController));

// @route   GET /api/auth/me
// @desc    Return the profile of the currently authenticated user
// @access  Private — gateway must authenticate before proxying here
router.get('/me', validateGatewayRequest, authController.getMe.bind(authController));

// @route   POST /api/auth/deactivate
// @desc    Deactivate the authenticated user's account (soft-delete)
// @access  Private — gateway must authenticate before proxying here
router.post('/deactivate', validateGatewayRequest, authController.deactivateAccount.bind(authController));

module.exports = router;
