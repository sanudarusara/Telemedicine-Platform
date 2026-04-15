const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ensure upload dir exists
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'reports');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadDir);
	},
	filename: function (req, file, cb) {
		const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
		const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-\_]/g, '_');
		cb(null, `${unique}-${safeName}`);
	}
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// Public routes (will add auth later)
router.get('/doctors/search', appointmentController.searchDoctors);
router.get('/doctors/available-slots', appointmentController.getAvailableSlots);

// Appointment CRUD
router.post('/', upload.single('report'), appointmentController.bookAppointment);
router.get('/', appointmentController.getAllAppointments);
router.get('/:id', appointmentController.getAppointmentById);
// Reports: list and download
router.get('/:id/reports', appointmentController.getAppointmentReports);
router.get('/:id/reports/:filename', appointmentController.downloadReport);
router.patch('/:id/status', appointmentController.updateAppointmentStatus);
router.post('/:id/cancel', appointmentController.cancelAppointment);
router.put('/:id/reschedule', appointmentController.rescheduleAppointment);

// Patient-specific routes
router.get('/patient/:patientId/upcoming', appointmentController.getUpcomingAppointments);

// Doctor-specific routes
router.get('/doctor/:doctorId/pending', appointmentController.getPendingAppointmentsForDoctor);

module.exports = router;
