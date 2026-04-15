const express = require("express");
const {
  createVideoRoom,
  getVideoSessionByAppointment,
  endVideoSession,
} = require("../controllers/videoController");
const { protectDoctor } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protectDoctor);

router.post("/create-room", createVideoRoom);
router.get("/appointment/:appointmentId", getVideoSessionByAppointment);
router.patch("/appointment/:appointmentId/end", endVideoSession);

module.exports = router;