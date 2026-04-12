const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { injectGatewayHeaders } = require('../middleware/gatewayHeaders');
const { AUDIT_SERVICE_URL } = require('../config/services');

const router = express.Router();

/**
 * Audit Management Service Routes
 * 
 * All audit endpoints require authentication and are restricted to:
 * - ADMIN: Full access (read + delete)
 * - DOCTOR: Read-only access
 * 
 * Patients cannot access audit logs.
 */

// ── All audit routes require authentication and specific roles ────────────────
router.use(
  '/',
  authenticate,
  authorize('ADMIN', 'DOCTOR'),
  injectGatewayHeaders,
  createProxyMiddleware({
    target: AUDIT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl,
    onProxyReq: (proxyReq, req, res) => {
      if (req.body) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
  })
);

module.exports = router;
