const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { authenticate } = require("../middleware/authenticate");
const { injectGatewayHeaders } = require("../middleware/gatewayHeaders");
const { TELEMEDICINE_SERVICE_URL } = require("../config/services");

const router = express.Router();

const rewriteBody = (proxyReq, req) => {
  const contentType = req.headers["content-type"] || "";

  if (
    req.body &&
    Object.keys(req.body).length > 0 &&
    !contentType.startsWith("multipart/form-data")
  ) {
    const bodyData = JSON.stringify(req.body);
    proxyReq.setHeader("Content-Type", "application/json");
    proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }
};

router.use(
  "/",
  authenticate,
  injectGatewayHeaders,
  createProxyMiddleware({
    target: TELEMEDICINE_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (_path, req) =>
      req.originalUrl.replace(/^\/api\/telemedicine/, "/api/video"),
    onProxyReq: rewriteBody,
  })
);

module.exports = router;