const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { authenticate } = require('../middleware/authenticate');
const { injectGatewayHeaders } = require('../middleware/gatewayHeaders');
const { PATIENT_SERVICE_URL } = require('../config/services');

const router = express.Router();

/**
 * Patient Management Service Routes
 * 
 * Auth routes are now handled directly by the gateway at /api/auth
 * All routes here are protected and require authentication
 */

// ── Protected Patient Routes (authentication required) ─────────────────────────
// All requests here go through authenticate → injectGatewayHeaders → proxy
router.use(
  '/',
  authenticate,
  injectGatewayHeaders,
  createProxyMiddleware({
    target: PATIENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl,
    onProxyReq: (proxyReq, req, res) => {
      const contentType = req.headers['content-type'] || '';
      // Skip body rewriting for multipart/form-data — the raw stream must pass
      // through untouched. For JSON/urlencoded bodies, re-write them because
      // express body-parser has already consumed the stream.
      if (req.body && Object.keys(req.body).length > 0 && !contentType.startsWith('multipart/form-data')) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
  })
);

module.exports = router;
