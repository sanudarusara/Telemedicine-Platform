const express = require('express');
const cors = require('cors');

const authProxy = require('./routes/authProxy');
const patientProxy = require('./routes/patientProxy');
const auditProxy = require('./routes/auditProxy');
const notificationProxy = require('./routes/notificationProxy');
const paymentProxy = require('./routes/paymentProxy');
const appointmentProxy = require('./routes/appointmentProxy');
const doctorProxy = require('./routes/doctorProxy');
const aiSymptomProxy = require('./routes/aiSymptomProxy');

const app = express();

// ── CORS ───────────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:8082'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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
app.use('/api/auth', authProxy);
app.use('/api/patients', patientProxy);
app.use('/api/reports', patientProxy);
app.use('/api/audit', auditProxy);
app.use('/api/notifications', notificationProxy);
app.use('/api/payments', paymentProxy);app.use('/api/appointments', appointmentProxy);
app.use('/api/doctors', doctorProxy);app.use('/api/symptoms', aiSymptomProxy);

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    hint: 'Available services: /api/auth, /api/patients, /api/reports, /api/audit, /api/notifications, /api/payments, /api/appointments, /api/doctors, /api/symptoms',
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