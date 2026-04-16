const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { DOCTOR_SERVICE_URL } = require("../config/services");

const router = express.Router();

const rewriteBody = (proxyReq, req) => {
  if (req.body && Object.keys(req.body).length > 0) {
    const bodyData = JSON.stringify(req.body);
    proxyReq.setHeader("Content-Type", "application/json");
    proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }
};

const proxyOptions = {
  target: DOCTOR_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (_path, req) => req.originalUrl.replace(/^\/api\/doctor-auth/, "/api/auth"),
  onProxyReq: rewriteBody,
};

// Public doctor auth routes
router.post("/register", createProxyMiddleware(proxyOptions));
router.post("/login", createProxyMiddleware(proxyOptions));
router.post("/logout", createProxyMiddleware(proxyOptions));

module.exports = router;