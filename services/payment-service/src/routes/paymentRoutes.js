const express = require("express");
const router = express.Router();
const {
  createPayment,
  confirmPayment,
  getAllPayments,
  getPaymentById,
  updatePaymentStatus,
  handleStripeWebhook,
  createPayHerePayment,
  handlePayHereNotify
} = require("../controllers/paymentController");

router.post("/confirm/:paymentId", confirmPayment);

router.post("/create", createPayment);
router.post("/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

router.post("/payhere-create", createPayHerePayment);
router.post("/payhere-notify", handlePayHereNotify);

router.get("/", getAllPayments);
router.patch("/:id/status", updatePaymentStatus);
router.get("/:id", getPaymentById);

module.exports = router;