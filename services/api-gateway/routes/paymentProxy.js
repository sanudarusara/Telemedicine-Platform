const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

// 🔒 AUTH MIDDLEWARE (commented for now)
// const { authenticate } = require('../middleware/authenticate');
// const { injectGatewayHeaders } = require('../middleware/gatewayHeaders');

const { PAYMENT_SERVICE_URL } = require('../config/services');

const router = express.Router();

// ✅ Handle preflight requests (CORS)
router.options('*', (req, res) => {
  res.sendStatus(200);
});

router.use(
  '/',

  // 🔒 ENABLE THESE WHEN YOU INTEGRATE AUTH LATER
  // authenticate,
  // injectGatewayHeaders,

  createProxyMiddleware({
    target: PAYMENT_SERVICE_URL,
    changeOrigin: true,

    // Remove "/api" prefix before sending to payment service
    pathRewrite: (path, req) => req.originalUrl.replace(/^\/api/, ''),

    onProxyReq: (proxyReq, req, res) => {
      const contentType = req.headers['content-type'] || '';

      // Re-send body because express already consumed it
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