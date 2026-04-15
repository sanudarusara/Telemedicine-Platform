const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { authenticate, optionalAuthenticate } = require('../middleware/authenticate');
const { injectGatewayHeaders } = require('../middleware/gatewayHeaders');
const { APPOINTMENT_SERVICE_URL } = require('../config/services');

const router = express.Router();

/**
 * Appointment Service Routes
 *
 * Proxies appointment management requests to appointment-service.
 * Public routes for searching doctors and slots (no auth required).
 * Protected routes for booking and managing appointments (auth required).
 */

// ── Public routes (no authentication required) ─────────────────────────────────
router.get(
  '/doctors/search',
  createProxyMiddleware({
    target: APPOINTMENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl,
  })
);

router.get(
  '/doctors/available-slots',
  createProxyMiddleware({
    target: APPOINTMENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl,
  })
);

// ── Protected routes (authentication required) ──────────────────────────────────
router.use(
  '/',
  authenticate,
  injectGatewayHeaders,
  createProxyMiddleware({
    target: APPOINTMENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl,
    onProxyReq: (proxyReq, req, res) => {
      const contentType = req.headers['content-type'] || '';

      // Skip body rewriting for multipart/form-data — the raw stream must pass
      // through untouched. For JSON/urlencoded bodies, re-write them because
      // express body-parser has already consumed the stream.
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
  })
);

module.exports = router;
