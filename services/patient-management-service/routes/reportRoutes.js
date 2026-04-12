const express = require('express');

const router = express.Router();
const reportController = require('../controllers/reportController');
const { validateGatewayRequest, requireRole } = require('../middleware/gatewayAuth');
const upload        = require('../config/multerConfig');

// IMPORTANT — route ordering matters in Express.
// Specific static-segment routes (/upload/... and /single/...) must be
// declared BEFORE dynamic-segment routes (/:userId) to prevent Express from
// treating "upload" or "single" as a userId value.

// @route   POST /api/reports/upload/:userId
// @desc    Upload a medical report file for a patient
// @access  Private – PATIENT, DOCTOR, ADMIN
router.post(
  '/upload/:userId',
  validateGatewayRequest,
  requireRole('PATIENT', 'DOCTOR', 'ADMIN'),
  upload.single('report'),  // multer processes the multipart field named "report"
  reportController.uploadReport.bind(reportController)
);

// @route   GET  /api/reports/single/:reportId
// @desc    Retrieve a single report by its ID
// @access  Private – PATIENT, DOCTOR, ADMIN
router.get(
  '/single/:reportId',
  validateGatewayRequest,
  requireRole('PATIENT', 'DOCTOR', 'ADMIN'),
  reportController.getReportById.bind(reportController)
);

// @route   GET  /api/reports/:userId/type/:reportType
// @desc    Retrieve reports for a patient filtered by type
//          reportType: LAB_RESULT | PRESCRIPTION | IMAGING | DIAGNOSTIC | OTHER
// @access  Private – PATIENT, DOCTOR, ADMIN
router.get(
  '/:userId/type/:reportType',
  validateGatewayRequest,
  requireRole('PATIENT', 'DOCTOR', 'ADMIN'),
  reportController.getReportsByType.bind(reportController)
);

// @route   GET  /api/reports/:userId
// @desc    Retrieve all reports for a patient
// @access  Private – PATIENT, DOCTOR, ADMIN
router.get(
  '/:userId',
  validateGatewayRequest,
  requireRole('PATIENT', 'DOCTOR', 'ADMIN'),
  reportController.getReports.bind(reportController)
);

// @route   DELETE /api/reports/:reportId
// @desc    Delete a report and remove its file from disk
// @access  Private – ADMIN
router.delete(
  '/:reportId',
  validateGatewayRequest,
  requireRole('ADMIN'),
  reportController.deleteReport.bind(reportController)
);

module.exports = router;
