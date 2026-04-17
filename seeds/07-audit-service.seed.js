/**
 * Seed: audit-management-service  (DB: audit-management)
 *
 * Inserts 40 realistic audit log entries covering all event types and services.
 *
 * Run inside container:
 *   docker exec healthcare-audit-service node /seeds/07-audit-service.seed.js
 */

'use strict';

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://Doctor:doctor123@farm.asobfd5.mongodb.net/audit-management?retryWrites=true&w=majority';

// ── Inline schema ─────────────────────────────────────────────────────────────
const AuditLogSchema = new mongoose.Schema(
  {
    userId:      { type: String, required: true, index: true },
    userRole:    { type: String, enum: ['PATIENT', 'DOCTOR', 'ADMIN', 'UNKNOWN'], default: 'UNKNOWN' },
    serviceName: { type: String, required: true, index: true },
    action:      { type: String, required: true, index: true },
    description: { type: String, required: true },
    timestamp:   { type: Date, default: Date.now, index: true },
    status:      { type: String, enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS' },
    ipAddress:   String,
    metadata:    { type: Object, default: {} },
    topic:       String,
  },
  { timestamps: false }
);

// ── Event catalog ─────────────────────────────────────────────────────────────
const EVENT_CATALOG = [
  { action: 'LOGIN_SUCCESS',         service: 'auth-service',         desc: 'User logged in successfully',           topic: 'auth-events',        role: 'PATIENT' },
  { action: 'LOGIN_SUCCESS',         service: 'auth-service',         desc: 'Doctor logged in successfully',          topic: 'auth-events',        role: 'DOCTOR' },
  { action: 'LOGIN_FAILED',          service: 'auth-service',         desc: 'Failed login attempt — bad password',   topic: 'auth-events',        role: 'PATIENT', status: 'FAILED' },
  { action: 'USER_REGISTERED',       service: 'api-gateway',          desc: 'New patient account created',           topic: 'user-registered',    role: 'PATIENT' },
  { action: 'USER_REGISTERED',       service: 'api-gateway',          desc: 'New doctor account created',            topic: 'user-registered',    role: 'DOCTOR' },
  { action: 'PATIENT_REGISTERED',    service: 'patient-service',      desc: 'Patient profile created',               topic: 'patient-events',     role: 'PATIENT' },
  { action: 'PROFILE_UPDATED',       service: 'patient-service',      desc: 'Patient updated profile details',       topic: 'patient-events',     role: 'PATIENT' },
  { action: 'REPORT_UPLOADED',       service: 'patient-service',      desc: 'Medical report uploaded',               topic: 'report-uploaded',    role: 'PATIENT' },
  { action: 'APPOINTMENT_BOOKED',    service: 'appointment-service',  desc: 'Appointment successfully booked',       topic: 'appointment-events', role: 'PATIENT' },
  { action: 'APPOINTMENT_BOOKED',    service: 'appointment-service',  desc: 'Follow-up appointment booked',          topic: 'appointment-events', role: 'PATIENT' },
  { action: 'APPOINTMENT_CANCELLED', service: 'appointment-service',  desc: 'Appointment cancelled by patient',      topic: 'appointment-events', role: 'PATIENT' },
  { action: 'PAYMENT_COMPLETED',     service: 'payment-service',      desc: 'Payment processed successfully',        topic: 'payment-events',     role: 'PATIENT' },
  { action: 'PAYMENT_COMPLETED',     service: 'payment-service',      desc: 'Appointment fee paid via card',         topic: 'payment-events',     role: 'PATIENT' },
  { action: 'DOCTOR_VERIFIED',       service: 'doctor-service',       desc: 'Doctor credentials verified by admin', topic: 'doctor-events',      role: 'ADMIN' },
  { action: 'DOCTOR_VERIFIED',       service: 'doctor-service',       desc: 'New doctor account approved',           topic: 'doctor-events',      role: 'ADMIN' },
  { action: 'PRESCRIPTION_ADDED',    service: 'doctor-service',       desc: 'Prescription issued after consultation',topic: 'patient-events',     role: 'DOCTOR' },
  { action: 'MEDICAL_HISTORY_ADDED', service: 'patient-service',      desc: 'Medical history entry recorded',        topic: 'patient-events',     role: 'DOCTOR' },
  { action: 'ROLE_UPDATED',          service: 'auth-service',         desc: 'User role updated by administrator',    topic: 'admin-events',       role: 'ADMIN' },
  { action: 'USER_DELETED',          service: 'auth-service',         desc: 'Inactive user account deleted',         topic: 'admin-events',       role: 'ADMIN' },
  { action: 'USER_DEACTIVATED',      service: 'api-gateway',          desc: 'User account deactivated on request',  topic: 'user-deactivated',   role: 'PATIENT' },
];

const USER_IDS = Array.from({ length: 15 }, (_, i) => `user-${String(i + 1).padStart(3, '0')}`);

const rand     = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randIp   = () => [Math.floor(Math.random() * 223) + 1, Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 254) + 1].join('.');
const randTs   = () => new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

// ── Entry point ───────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('[audit-service] Connected to', MONGO_URI);

  const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

  const logs = Array.from({ length: 40 }, (_, i) => {
    const ev = EVENT_CATALOG[i % EVENT_CATALOG.length];
    return {
      userId:      rand(USER_IDS),
      userRole:    ev.role,
      serviceName: ev.service,
      action:      ev.action,
      description: ev.desc,
      status:      ev.status || (Math.random() > 0.15 ? 'SUCCESS' : 'FAILED'),
      ipAddress:   randIp(),
      timestamp:   randTs(),
      topic:       ev.topic,
      metadata:    { seeded: true, index: i },
    };
  });

  const result = await AuditLog.insertMany(logs, { ordered: false });
  console.log(`[audit-service] Done — ${result.length} audit log(s) inserted.\n`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[audit-service] Seed error:', err.message);
  process.exit(1);
});
