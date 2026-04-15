const express = require("express");
const { protect } = require("../middleware/auth_middleware");
const PrescriptionController = require("../controllers/prescription_controller");

const router = express.Router();

router.use(protect);

router.post("/prescriptions", PrescriptionController.createPrescription);
router.get("/prescriptions", PrescriptionController.getPrescriptions);
router.get("/prescriptions/:id", PrescriptionController.getPrescriptionById);

module.exports = router;