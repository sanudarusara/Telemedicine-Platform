const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { authenticate, optionalAuthenticate } = require('../middleware/authenticate');
const { injectGatewayHeaders } = require('../middleware/gatewayHeaders');
const { NOTIFICATION_SERVICE_URL } = require('../config/services');

const router = express.Router();

/**
 * Notification Service Routes
 * 
 * Routes to notification service when it's implemented.
 * Adjust authentication requirements based on your needs.
 */

router.use(
  '/',
  authenticate,
  injectGatewayHeaders,
  createProxyMiddleware({
    target: NOTIFICATION_SERVICE_URL,
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
