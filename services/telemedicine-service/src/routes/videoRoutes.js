const express = require("express");
const {
  createVideoRoom,
  getVideoSessionByAppointment,
  endVideoSession,
  joinRoom,
} = require("../controllers/videoController");
const { protectDoctor } = require("../middleware/authMiddleware");
const { protectPatient } = require("../middleware/patientAuthMiddleware");

const router = express.Router();

// Doctor-only routes
router.post("/create-room", protectDoctor, createVideoRoom);
router.get("/appointment/:appointmentId", protectDoctor, getVideoSessionByAppointment);
router.patch("/appointment/:appointmentId/end", protectDoctor, endVideoSession);

// Patient-only routes
router.post("/join-room", protectPatient, joinRoom);

module.exports = router;