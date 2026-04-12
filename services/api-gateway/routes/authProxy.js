const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { authenticate } = require('../middleware/authenticate');
const { injectGatewayHeaders } = require('../middleware/gatewayHeaders');
const { AUTH_SERVICE_URL } = require('../config/services');

const router = express.Router();

/**
 * Auth Service Proxy Routes
 *
 * Public endpoints (register, login) are forwarded directly to auth-service.
 * Protected endpoints (me, deactivate) require a valid JWT first — the gateway
 * verifies the token, injects user headers, then proxies to auth-service.
 *
 * The gateway no longer holds any authentication logic itself; it only
 * verifies the JWT signature statelessly and routes the request.
 */

// ── Helper: rewrite body after express json parser has consumed the stream ────
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

// ── Protected: me & deactivate ─────────────────────────────────────────────────
// Gateway verifies JWT, injects headers, then proxies to auth-service
router.use(
  '/',
  authenticate,
  injectGatewayHeaders,
  createProxyMiddleware(proxyOptions)
);

module.exports = router;
