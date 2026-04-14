const express = require("express");
const { protect } = require("../middleware/auth_middleware");  // Make sure this middleware is correctly implemented
const DoctorController = require("../controllers/doctor_controller");  // Ensure the controller functions are correctly defined

const router = express.Router();

// Protect all routes to ensure only authenticated doctors can access
router.use(protect);

// Routes for managing the doctor profile
router.get("/profile", DoctorController.getProfile);
router.put("/profile", DoctorController.updateProfile);

module.exports = router;