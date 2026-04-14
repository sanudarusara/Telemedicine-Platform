const express = require("express");
const Slot = require("../models/slot.model");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

// Protect the routes
router.use(protect);

// Create a slot manually (for now)
router.post("/slots", async (req, res) => {
  try {
    const { startTime, endTime, date } = req.body;

    const slot = new Slot({
      doctorId: req.doctor._id,
      startTime,
      endTime,
      date,
    });

    await slot.save();
    res.status(201).json(slot);
  } catch (error) {
    res.status(500).json({ message: "Error creating slot" });
  }
});

// Get slots for the doctor
router.get("/slots", async (req, res) => {
  try {
    const slots = await Slot.find({ doctorId: req.doctor._id, isActive: true });
    res.status(200).json(slots);
  } catch (error) {
    res.status(500).json({ message: "Error fetching slots" });
  }
});

module.exports = router;