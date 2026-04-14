const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { injectGatewayHeaders } = require('../middleware/gatewayHeaders');
const { AUTH_SERVICE_URL } = require('../config/services');

const router = express.Router();

const rewriteBody = (proxyReq, req) => {
  if (req.body && Object.keys(req.body).length > 0) {
    const bodyData = JSON.stringify(req.body);
    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }
};

const proxyOptions = {
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (_path, req) => req.originalUrl,
  onProxyReq: rewriteBody,
};

// ── Public: register & login ───────────────────────────────────────────────────
router.post('/register', createProxyMiddleware(proxyOptions));
router.post('/login', createProxyMiddleware(proxyOptions));

// ── Admin: user management ────────────────────────────────────────────────────
router.get('/users', authenticate, authorize('ADMIN'), injectGatewayHeaders, createProxyMiddleware(proxyOptions));
router.patch('/users/:userId/status', authenticate, authorize('ADMIN'), injectGatewayHeaders, createProxyMiddleware(proxyOptions));
router.patch('/users/:userId/role', authenticate, authorize('ADMIN'), injectGatewayHeaders, createProxyMiddleware(proxyOptions));
router.patch('/users/:userId/verify', authenticate, authorize('ADMIN'), injectGatewayHeaders, createProxyMiddleware(proxyOptions));

// ── Protected: me & deactivate ─────────────────────────────────────────────────
router.use('/', authenticate, injectGatewayHeaders, createProxyMiddleware(proxyOptions));

module.exports = router;
