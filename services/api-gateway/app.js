const express = require('express');
const authProxy = require('./routes/authProxy');
const patientProxy = require('./routes/patientProxy');
const auditProxy = require('./routes/auditProxy');
const notificationProxy = require('./routes/notificationProxy');

const app = express();

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Request logging ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── API Gateway Routes ─────────────────────────────────────────────────────────
// Auth routes proxied to auth-service (register/login public, /me protected)
app.use('/api/auth', authProxy);

// Patient Management Service
// Public: /api/patients/auth/* handled above (/api/auth)
// Protected: /api/patients/* (patient medical data)
app.use('/api/patients', patientProxy);

// Reports (also served by Patient Management Service)
// Protected: /api/reports/* (medical report uploads and retrieval)
app.use('/api/reports', patientProxy);

// Audit Management Service
// Protected: All routes (ADMIN + DOCTOR only)
app.use('/api/audit', auditProxy);

// Notification Service
// Protected: All routes (authenticated users)
app.use('/api/notifications', notificationProxy);

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    hint: 'Available services: /api/auth, /api/patients, /api/reports, /api/audit, /api/notifications',
  });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[Gateway Error] ${err.message}`);
  console.error(err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal gateway error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;
