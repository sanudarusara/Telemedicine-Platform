const express = require("express");
const { adminProtect } = require("../middleware/adminMiddleware");
const {
  getPendingDoctors,
  approveDoctor,
  rejectDoctor,
} = require("../controllers/admin_controller");

const router = express.Router();

router.use((req, res, next) => {
  console.log("\n[admin_routes] Incoming admin route request");
  console.log("[admin_routes] Time:", new Date().toISOString());
  console.log("[admin_routes] Method:", req.method);
  console.log("[admin_routes] URL:", req.originalUrl);
  console.log("[admin_routes] Params:", req.params || {});
  console.log("[admin_routes] Query:", req.query || {});
  console.log("[admin_routes] Body:", req.body || {});
  console.log(
    "[admin_routes] Has Authorization Header:",
    !!req.headers.authorization
  );
  next();
});

router.use(adminProtect);

// GET /api/doctors/admin?status=pending|approved|rejected|all
router.get("/", (req, res, next) => {
  console.log("[admin_routes] GET / - getPendingDoctors hit");
  next();
}, getPendingDoctors);

// POST /api/doctors/admin/:id/approve
router.post("/:id/approve", (req, res, next) => {
  console.log("[admin_routes] POST /:id/approve hit");
  console.log("[admin_routes] Doctor ID:", req.params.id);
  next();
}, approveDoctor);

// POST /api/doctors/admin/:id/reject
router.post("/:id/reject", (req, res, next) => {
  console.log("[admin_routes] POST /:id/reject hit");
  console.log("[admin_routes] Doctor ID:", req.params.id);
  next();
}, rejectDoctor);

module.exports = router;