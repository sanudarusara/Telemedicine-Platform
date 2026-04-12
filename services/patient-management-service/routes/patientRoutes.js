const express = require('express');

const router = express.Router();
const patientController = require('../controllers/patientController');
const { validateGatewayRequest, requireRole } = require('../middleware/gatewayAuth');

// ─── Own profile (PATIENT) ────────────────────────────────────────────────────

// @route   GET  /api/patients/profile
// @desc    Get the authenticated patient's own profile
// @access  Private – PATIENT
router.get(
  '/profile',
  validateGatewayRequest,
  requireRole('PATIENT'),
  patientController.getProfile.bind(patientController)
);

// @route   PUT  /api/patients/profile
// @desc    Update the authenticated patient's own profile
// @access  Private – PATIENT
router.put(
  '/profile',
  validateGatewayRequest,
  requireRole('PATIENT'),
  patientController.updateProfile.bind(patientController)
);

// ─── All patients (ADMIN) ─────────────────────────────────────────────────────

// @route   GET  /api/patients
// @desc    Retrieve all patient profiles
// @access  Private – ADMIN
router.get(
  '/',
  validateGatewayRequest,
  requireRole('ADMIN'),
  patientController.getAllPatients.bind(patientController)
);

// ─── Prescriptions ────────────────────────────────────────────────────────────

// @route   POST /api/patients/:userId/prescriptions
// @desc    Add a prescription to a patient's record
// @access  Private – DOCTOR, ADMIN
router.post(
  '/:userId/prescriptions',
  validateGatewayRequest,
  requireRole('DOCTOR', 'ADMIN'),
  patientController.addPrescription.bind(patientController)
);

// @route   GET  /api/patients/:userId/prescriptions
// @desc    Retrieve all prescriptions for a patient
// @access  Private – PATIENT, DOCTOR, ADMIN
router.get(
  '/:userId/prescriptions',
  validateGatewayRequest,
  requireRole('PATIENT', 'DOCTOR', 'ADMIN'),
  patientController.getPrescriptions.bind(patientController)
);

// ─── Medical history ──────────────────────────────────────────────────────────

// @route   POST /api/patients/:userId/history
// @desc    Append a medical-history entry to a patient's record
// @access  Private – DOCTOR, ADMIN
router.post(
  '/:userId/history',
  validateGatewayRequest,
  requireRole('DOCTOR', 'ADMIN'),
  patientController.addMedicalHistory.bind(patientController)
);

// @route   GET  /api/patients/:userId/history
// @desc    Retrieve the full medical history for a patient
// @access  Private – PATIENT, DOCTOR, ADMIN
router.get(
  '/:userId/history',
  validateGatewayRequest,
  requireRole('PATIENT', 'DOCTOR', 'ADMIN'),
  patientController.getMedicalHistory.bind(patientController)
);

module.exports = router;
