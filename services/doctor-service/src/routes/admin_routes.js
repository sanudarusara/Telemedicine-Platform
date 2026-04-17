const express = require("express");
const { adminProtect } = require("../middleware/adminMiddleware");
const { getPendingDoctors, approveDoctor, rejectDoctor } = require("../controllers/admin_controller");

const router = express.Router();

router.use(adminProtect);

// GET /api/doctors/admin?status=pending|approved|rejected|all
router.get("/", getPendingDoctors);

// POST /api/doctors/admin/:id/approve
router.post("/:id/approve", approveDoctor);

// POST /api/doctors/admin/:id/reject
router.post("/:id/reject", rejectDoctor);

module.exports = router;
