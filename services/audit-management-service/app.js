const express = require('express');

const requestLogger = require('./middleware/requestLogger');
const validateJson  = require('./middleware/validateJson');
const errorHandler  = require('./middleware/errorHandler');
const auditRoutes   = require('./routes/auditRoutes');

const app = express();

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json());

// Handle malformed JSON bodies before they reach route handlers
app.use(validateJson);

// ── Request logging ────────────────────────────────────────────────────────────
app.use(requestLogger);

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:    'ok',
    service:   'audit-management-service',
    timestamp: new Date().toISOString(),
  });
});

// ── API routes ─────────────────────────────────────────────────────────────────
app.use('/api/audit', auditRoutes);

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ── Global error handler (must be last) ───────────────────────────────────────
app.use(errorHandler);

module.exports = app;
