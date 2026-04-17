const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { authenticate, optionalAuthenticate } = require("../middleware/authenticate");
const { injectGatewayHeaders } = require("../middleware/gatewayHeaders");
const { DOCTOR_SERVICE_URL } = require("../config/services");

const router = express.Router();

/**
 * Doctor Service Routes
 *
 * Proxies doctor management requests to doctor-service.
 * Some routes are public (viewing doctor profiles), others are protected (doctor-specific operations).
 */

const proxyOptions = {
  target: DOCTOR_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (_path, req) => req.originalUrl,

  onProxyReq: (proxyReq, req, res) => {
    console.log("\n================ API-GATEWAY -> DOCTOR PROXY REQUEST ================");
    console.log("Time:", new Date().toISOString());
    console.log("Incoming Method:", req.method);
    console.log("Incoming URL:", req.originalUrl);
    console.log("Target:", DOCTOR_SERVICE_URL);
    console.log("Has Authorization Header:", !!req.headers.authorization);
    console.log("Body:", req.body || {});

    const contentType = req.headers["content-type"] || "";
    if (
      req.body &&
      Object.keys(req.body).length > 0 &&
      !contentType.startsWith("multipart/form-data")
    ) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader("Content-Type", "application/json");
      proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },

  onProxyRes: (proxyRes, req, res) => {
    console.log("---------------- API-GATEWAY <- DOCTOR PROXY RESPONSE ---------------");
    console.log("Method:", req.method);
    console.log("URL:", req.originalUrl);
    console.log("Proxy Status:", proxyRes.statusCode);
    console.log("====================================================================\n");
  },

  onError: (err, req, res) => {
    console.error("\n================ API-GATEWAY DOCTOR PROXY ERROR =====================");
    console.error("Time:", new Date().toISOString());
    console.error("Method:", req.method);
    console.error("URL:", req.originalUrl);
    console.error("Target:", DOCTOR_SERVICE_URL);
    console.error("Error message:", err.message);
    console.error("Stack:", err.stack);
    console.error("====================================================================\n");

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Doctor service proxy error",
        error: err.message,
      });
    }
  },
};

router.use((req, res, next) => {
  console.log("\n[api-gateway doctor_routes] Incoming request");
  console.log("[api-gateway doctor_routes] Time:", new Date().toISOString());
  console.log("[api-gateway doctor_routes] Method:", req.method);
  console.log("[api-gateway doctor_routes] URL:", req.originalUrl);
  console.log(
    "[api-gateway doctor_routes] Has Authorization Header:",
    !!req.headers.authorization
  );
  next();
});

// ── Protected Doctor Routes (authentication required) ─────────────────────────
// Doctor profile, availability, appointments management
router.use(
  "/",
  authenticate,
  injectGatewayHeaders,
  createProxyMiddleware(proxyOptions)
);

module.exports = router;