const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

// Public routes (will add auth later)
router.get('/doctors/search', appointmentController.searchDoctors);
router.get('/doctors/available-slots', appointmentController.getAvailableSlots);

// Appointment CRUD
router.post('/', appointmentController.bookAppointment);
router.get('/', appointmentController.getAllAppointments);
router.get('/:id', appointmentController.getAppointmentById);
router.patch('/:id/status', appointmentController.updateAppointmentStatus);
router.post('/:id/cancel', appointmentController.cancelAppointment);
router.put('/:id/reschedule', appointmentController.rescheduleAppointment);

// Patient-specific routes
router.get('/patient/:patientId/upcoming', appointmentController.getUpcomingAppointments);

// Doctor-specific routes
router.get('/doctor/:doctorId/pending', appointmentController.getPendingAppointmentsForDoctor);

module.exports = router;
