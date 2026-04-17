/**
 * Seed Script — Audit Management Service
 *
 * Generates 40 realistic sample audit logs and inserts them into MongoDB.
 * Uses shared topics, events, and eventFactory to remain consistent with
 * the rest of the platform — no hardcoded strings.
 *
 * Usage:
 *   node seed.js
 *   (Set MONGO_URI in .env or environment before running)
 */

require('dotenv').config();

const mongoose     = require('mongoose');
const AuditLog     = require('./models/AuditLog');
const TOPICS       = require('../shared/kafka/topics');
const EVENTS       = require('../shared/kafka/events');
const { createEvent } = require('../shared/kafka/eventFactory');

// ── Constants ──────────────────────────────────────────────────────────────────

const ROLES    = ['PATIENT', 'DOCTOR', 'ADMIN'];
const STATUSES = ['SUCCESS', 'FAILED'];

const EVENT_VALUES = Object.values(EVENTS);

/** Maps each event type to the most appropriate Kafka topic */
const TOPIC_FOR_EVENT = {
  [EVENTS.PATIENT_REGISTERED]:   TOPICS.PATIENT_EVENTS,
  [EVENTS.PROFILE_UPDATED]:      TOPICS.PATIENT_EVENTS,
  [EVENTS.REPORT_UPLOADED]:      TOPICS.REPORT_UPLOADED,
  [EVENTS.APPOINTMENT_BOOKED]:   TOPICS.APPOINTMENT_EVENTS,
  [EVENTS.APPOINTMENT_CANCELLED]:TOPICS.APPOINTMENT_EVENTS,
  [EVENTS.PAYMENT_COMPLETED]:    TOPICS.PAYMENT_EVENTS,
  [EVENTS.PRESCRIPTION_ADDED]:   TOPICS.PATIENT_EVENTS,
  [EVENTS.LOGIN_SUCCESS]:        TOPICS.AUTH_EVENTS,
  [EVENTS.LOGIN_FAILED]:         TOPICS.AUTH_EVENTS,
  [EVENTS.DOCTOR_VERIFIED]:      TOPICS.DOCTOR_EVENTS,
  [EVENTS.USER_DELETED]:         TOPICS.ADMIN_EVENTS,
  [EVENTS.ROLE_UPDATED]:         TOPICS.ADMIN_EVENTS,
  [EVENTS.STAFF_SELECTED]:       TOPICS.ADMIN_EVENTS,
  [EVENTS.USER_REGISTERED]:      TOPICS.USER_REGISTERED,
  [EVENTS.USER_DEACTIVATED]:     TOPICS.USER_DEACTIVATED,
  [EVENTS.PATIENT_UPDATED]:      TOPICS.PATIENT_UPDATED,
  [EVENTS.REPORT_DELETED]:       TOPICS.REPORT_DELETED,
  [EVENTS.MEDICAL_HISTORY_ADDED]: TOPICS.PATIENT_EVENTS,
};

/** Maps each Kafka topic to the owning service name */
const SERVICE_FOR_TOPIC = {
  [TOPICS.PATIENT_EVENTS]:      'patient-service',
  [TOPICS.DOCTOR_EVENTS]:       'doctor-service',
  [TOPICS.APPOINTMENT_EVENTS]:  'appointment-service',
  [TOPICS.PAYMENT_EVENTS]:      'payment-service',
  [TOPICS.NOTIFICATION_EVENTS]: 'notification-service',
  [TOPICS.AUTH_EVENTS]:         'auth-service',
  [TOPICS.ADMIN_EVENTS]:        'admin-service',
  [TOPICS.USER_REGISTERED]:     'api-gateway',
  [TOPICS.USER_DEACTIVATED]:    'api-gateway',
  [TOPICS.PATIENT_REGISTERED]:  'patient-service',
  [TOPICS.PATIENT_UPDATED]:     'patient-service',
  [TOPICS.PATIENT_DEACTIVATED]: 'patient-service',
  [TOPICS.REPORT_UPLOADED]:     'patient-service',
  [TOPICS.REPORT_DELETED]:      'patient-service',
};

/** Human-readable description per event type */
const DESCRIPTIONS = {
  [EVENTS.PATIENT_REGISTERED]:    'New patient registered in the system',
  [EVENTS.PROFILE_UPDATED]:       'User profile was updated',
  [EVENTS.REPORT_UPLOADED]:       'Medical report uploaded successfully',
  [EVENTS.APPOINTMENT_BOOKED]:    'Appointment successfully booked',
  [EVENTS.APPOINTMENT_CANCELLED]: 'Appointment was cancelled',
  [EVENTS.PAYMENT_COMPLETED]:     'Payment transaction completed',
  [EVENTS.PRESCRIPTION_ADDED]:    'Prescription added by doctor',
  [EVENTS.LOGIN_SUCCESS]:         'User logged in successfully',
  [EVENTS.LOGIN_FAILED]:          'Failed login attempt detected',
  [EVENTS.DOCTOR_VERIFIED]:       'Doctor credentials verified by admin',
  [EVENTS.USER_DELETED]:          'User account permanently deleted',
  [EVENTS.ROLE_UPDATED]:          'User role updated by admin',
  [EVENTS.STAFF_SELECTED]:        'Staff member selected for position',
  [EVENTS.USER_REGISTERED]:       'New user account created',
  [EVENTS.USER_DEACTIVATED]:      'User account deactivated',
  [EVENTS.PATIENT_UPDATED]:       'Patient profile updated',
  [EVENTS.REPORT_DELETED]:        'Medical report deleted',
  [EVENTS.MEDICAL_HISTORY_ADDED]: 'Medical history entry added',
};

/** Representative metadata payloads per event type */
const METADATA_SAMPLES = {
  [EVENTS.PATIENT_REGISTERED]:    { registrationSource: 'web-portal', verificationCode: 'VER-8821' },
  [EVENTS.PROFILE_UPDATED]:       { updatedFields: ['email', 'phone'], previousEmail: 'old@example.com' },
  [EVENTS.REPORT_UPLOADED]:       { fileName: 'blood-test-2025.pdf', fileSize: '2.3MB', reportType: 'LAB' },
  [EVENTS.APPOINTMENT_BOOKED]:    { appointmentId: 'APT-00123', doctorId: 'DOC-401', slot: '2025-04-15T10:00:00Z' },
  [EVENTS.APPOINTMENT_CANCELLED]: { appointmentId: 'APT-00124', reason: 'Patient requested cancellation' },
  [EVENTS.PAYMENT_COMPLETED]:     { paymentId: 'PAY-9876', amount: 150.00, currency: 'USD', method: 'CARD' },
  [EVENTS.PRESCRIPTION_ADDED]:    { prescriptionId: 'RX-4567', medications: ['Amoxicillin 500mg', 'Ibuprofen 400mg'] },
  [EVENTS.LOGIN_SUCCESS]:         { browser: 'Chrome 120', os: 'Windows 11', device: 'Desktop' },
  [EVENTS.LOGIN_FAILED]:          { reason: 'Incorrect password', attemptCount: 3, lockoutTriggered: false },
  [EVENTS.DOCTOR_VERIFIED]:       { licenseNumber: 'LIC-20230089', specialization: 'Cardiology', issuingBody: 'GMC' },
  [EVENTS.USER_DELETED]:          { deletedBy: 'admin-001', reason: 'Violation of terms of service' },
  [EVENTS.ROLE_UPDATED]:          { previousRole: 'PATIENT', newRole: 'DOCTOR', approvedBy: 'admin-002' },
  [EVENTS.STAFF_SELECTED]:        { position: 'Nurse', department: 'Emergency', startDate: '2025-05-01' },
  [EVENTS.USER_REGISTERED]:       { email: 'newuser@example.com', name: 'New User', role: 'PATIENT' },
  [EVENTS.USER_DEACTIVATED]:      { email: 'user@example.com', role: 'PATIENT', reason: 'User requested' },
  [EVENTS.PATIENT_UPDATED]:       { patientId: 'PAT-001', updatedFields: ['phone', 'address'] },
  [EVENTS.REPORT_DELETED]:        { reportId: 'REP-001', reportTitle: 'X-Ray Report', deletedBy: 'admin-001' },
  [EVENTS.MEDICAL_HISTORY_ADDED]: { condition: 'Hypertension', doctorId: 'DOC-123', date: '2026-01-15' },
};

// ── Utility helpers ────────────────────────────────────────────────────────────

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const randomIp = () =>
  [
    Math.floor(Math.random() * 223) + 1,
    Math.floor(Math.random() * 255),
    Math.floor(Math.random() * 255),
    Math.floor(Math.random() * 254) + 1,
  ].join('.');

/** Random timestamp within the last 30 days */
const randomTimestamp = () => {
  const now          = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  return new Date(now - Math.random() * thirtyDaysMs);
};

// ── Log generation ─────────────────────────────────────────────────────────────

const generateLogs = (count) => {
  const logs = [];

  for (let i = 0; i < count; i++) {
    const userId    = `user-${String(Math.floor(Math.random() * 20) + 1).padStart(3, '0')}`;
    const eventType = randomFrom(EVENT_VALUES);
    const topic     = TOPIC_FOR_EVENT[eventType];
    const service   = SERVICE_FOR_TOPIC[topic];

    // 80 % success rate — mirrors realistic production distribution
    const status = Math.random() > 0.2 ? 'SUCCESS' : 'FAILED';

    // Build standardized event via factory (validates required fields)
    const event = createEvent({
      eventType,
      userId,
      userRole:    randomFrom(ROLES),
      serviceName: service,
      description: DESCRIPTIONS[eventType] || `Event: ${eventType}`,
      status,
      ipAddress:   randomIp(),
      metadata:    { ...METADATA_SAMPLES[eventType] },
    });

    logs.push({
      userId:      event.userId,
      userRole:    event.userRole,
      serviceName: event.serviceName,
      action:      event.eventType,
      description: event.description,
      timestamp:   randomTimestamp(),
      status:      event.status,
      ipAddress:   event.ipAddress,
      metadata:    event.metadata,
      topic,
    });
  }

  return logs;
};

// ── Seed entry point ───────────────────────────────────────────────────────────

const seed = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://Doctor:doctor123@farm.asobfd5.mongodb.net/audit-management?retryWrites=true&w=majority';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB');

    // Wipe existing documents so re-runs are idempotent
    const { deletedCount } = await AuditLog.deleteMany({});
    console.log(`[Seed] Cleared ${deletedCount} existing audit log(s)`);

    // Insert fresh sample data
    const logs     = generateLogs(40);
    const inserted = await AuditLog.insertMany(logs);

    // ── Summary breakdown ──────────────────────────────────────────────────
    const tally = (key) =>
      inserted.reduce((acc, log) => {
        acc[log[key]] = (acc[log[key]] || 0) + 1;
        return acc;
      }, {});

    const byRole    = tally('userRole');
    const byAction  = tally('action');
    const byStatus  = tally('status');
    const byService = tally('serviceName');

    console.log(`\n[Seed] ✓ Inserted ${inserted.length} audit logs\n`);

    console.log('── By Role ──────────────────────');
    Object.entries(byRole).forEach(([k, v]) => console.log(`  ${k.padEnd(10)} ${v}`));

    console.log('\n── By Status ────────────────────');
    Object.entries(byStatus).forEach(([k, v]) => console.log(`  ${k.padEnd(10)} ${v}`));

    console.log('\n── By Service ───────────────────');
    Object.entries(byService).forEach(([k, v]) => console.log(`  ${k.padEnd(25)} ${v}`));

    console.log('\n── By Action ────────────────────');
    Object.entries(byAction).forEach(([k, v]) => console.log(`  ${k.padEnd(30)} ${v}`));

  } catch (err) {
    console.error('[Seed] Error:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('\n[Seed] Disconnected from MongoDB');
  }
};

seed();
