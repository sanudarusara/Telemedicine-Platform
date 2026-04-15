const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { AI_SYMPTOM_SERVICE_URL } = require('../config/services');

const router = express.Router();

/**
 * AI Symptom Service Routes
 *
 * Proxies symptom analysis requests to ai-symptom-service.
 * Exposed through gateway as /api/symptoms/*
 *
 * Currently left public. If needed, authentication can be added later.
 */

router.use(
  '/',
  createProxyMiddleware({
    target: AI_SYMPTOM_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl.replace(/^\/api/, ''),
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
  })
);

module.exports = router;