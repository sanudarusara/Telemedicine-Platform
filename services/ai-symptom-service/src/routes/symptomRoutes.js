const express = require("express");
const router = express.Router();
const {
  submitSymptoms,
  getAllChecks,
  getCheckById,
} = require("../controllers/symptomController");

router.post("/analyze", submitSymptoms);
router.get("/", getAllChecks);
router.get("/:id", getCheckById);

module.exports = router;