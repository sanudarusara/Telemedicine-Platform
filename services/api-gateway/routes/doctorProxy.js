const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { authenticate, optionalAuthenticate } = require('../middleware/authenticate');
const { injectGatewayHeaders } = require('../middleware/gatewayHeaders');
const { DOCTOR_SERVICE_URL } = require('../config/services');

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
    const contentType = req.headers['content-type'] || '';
    if (
      req.body &&
      Object.keys(req.body).length > 0 &&
      !contentType.startsWith('multipart/form-data')
    ) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
};

// ── Protected Doctor Routes (authentication required) ─────────────────────────
// Doctor profile, availability, appointments management
router.use(
  '/',
  authenticate,
  injectGatewayHeaders,
  createProxyMiddleware(proxyOptions)
);

module.exports = router;
