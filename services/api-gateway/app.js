const express = require("express");
const cors = require("cors");

const authProxy = require("./routes/authProxy");
const patientProxy = require("./routes/patientProxy");
const auditProxy = require("./routes/auditProxy");
const notificationProxy = require("./routes/notificationProxy");
const paymentProxy = require("./routes/paymentProxy");
const appointmentProxy = require('./routes/appointmentProxy');
const doctorProxy = require('./routes/doctorProxy');
const aiSymptomProxy = require("./routes/aiSymptomProxy");

const doctorAuthProxy = require("./routes/doctorAuthProxy");

const telemedicineProxy = require("./routes/telemedicineProxy");

const app = express();

// ── CORS ───────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8082",
  "http://localhost:8083",
];

const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:8082', 'http://localhost:8083'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Request logging ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  // Debug: log incoming auth login requests to help diagnose client payload issues
  if (req.originalUrl && req.originalUrl.includes('/api/auth/login')) {
    try {
      console.log('--- LOGIN DEBUG START ---');
      console.log('Headers:', JSON.stringify(req.headers));
      // req.body is available because body parser is applied before this middleware
      console.log('Body:', JSON.stringify(req.body));
      console.log('--- LOGIN DEBUG END ---');
    } catch (e) {
      console.log('[LOGIN DEBUG] error serializing request:', e.message);
    }
  }
  next();
});

// ── Health check ───────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "api-gateway",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Health passthrough routes (no auth — used by gateway status page) ──────────
// These MUST be registered before the authenticated proxy routes so they
// match first and bypass the authenticate middleware.
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('./config/services');

const makeHealthProxy = (target) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: () => '/health',
  });

app.get('/api/auth/health',          makeHealthProxy(services.AUTH_SERVICE_URL));
app.get('/api/patients/health',      makeHealthProxy(services.PATIENT_SERVICE_URL));
app.get('/api/reports/health',       makeHealthProxy(services.PATIENT_SERVICE_URL));
app.get('/api/audit/health',         makeHealthProxy(services.AUDIT_SERVICE_URL));
app.get('/api/appointments/health',  makeHealthProxy(services.APPOINTMENT_SERVICE_URL));
app.get('/api/doctors/health',       makeHealthProxy(services.DOCTOR_SERVICE_URL));
app.get('/api/symptoms/health',      makeHealthProxy(services.AI_SYMPTOM_SERVICE_URL));
app.get('/api/notifications/health', makeHealthProxy(services.NOTIFICATION_SERVICE_URL));
app.get('/api/payments/health',      makeHealthProxy(services.PAYMENT_SERVICE_URL));
app.get('/api/telemedicine/health',  makeHealthProxy(services.TELEMEDICINE_SERVICE_URL));

// ── API Gateway Routes ─────────────────────────────────────────────────────────
app.use("/api/auth", authProxy);
app.use("/api/patients", patientProxy);
app.use("/api/reports", patientProxy);
app.use("/api/audit", auditProxy);
app.use("/api/notifications", notificationProxy);
app.use("/api/payments", paymentProxy);app.use('/api/appointments', appointmentProxy);
app.use('/api/doctors', doctorProxy);
app.use("/api/doctor-auth", doctorAuthProxy);
app.use("/api/symptoms", aiSymptomProxy);
app.use("/api/telemedicine", telemedicineProxy);

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    hint: "Available services: /api/auth, /api/patients, /api/reports, /api/audit, /api/notifications, /api/payments, /api/appointments, /api/doctors, /api/doctor-auth, /api/symptoms, /api/telemedicine",
  });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[Gateway Error] ${err.message}`);
  console.error(err.stack);

  // return CORS-safe response for blocked origins / other app errors
  if (!res.headersSent) {
    res.header("Vary", "Origin");
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal gateway error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

module.exports = app;