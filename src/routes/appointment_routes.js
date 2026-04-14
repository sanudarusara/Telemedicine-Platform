const express = require("express");
const { protect } = require("../middleware/auth_middleware");
const AppointmentController = require("../controllers/appointment_controller");

const router = express.Router();

router.use(protect);

router.get("/appointments", AppointmentController.getDoctorAppointments);
router.get("/appointments/:id", AppointmentController.getDoctorAppointmentById);
router.post("/appointments/:id/accept", AppointmentController.acceptAppointment);
router.post("/appointments/:id/reject", AppointmentController.rejectAppointment);

module.exports = router;