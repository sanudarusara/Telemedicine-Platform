/**
 * Seed: notification-service  (DB: notification-service)
 *
 * Creates sample in-app notification records for seeded users.
 *
 * Run inside container:
 *   docker exec healthcare-notification-service node /seeds/06-notification-service.seed.js
 */

'use strict';

const mongoose = require('mongoose');
const crypto   = require('crypto');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://Doctor:doctor123@farm.asobfd5.mongodb.net/notification-service?retryWrites=true&w=majority';
const AUTH_DB   = process.env.AUTH_MONGO_URI || 'mongodb+srv://Doctor:doctor123@farm.asobfd5.mongodb.net/auth-management?retryWrites=true&w=majority';

// ── Inline schema ─────────────────────────────────────────────────────────────
const NotificationSchema = new mongoose.Schema({
  notificationId:      { type: String, required: true, unique: true },
  userId:              { type: String, required: true, index: true },
  userType:            { type: String, enum: ['patient', 'doctor', 'admin'], required: true },
  type:                { type: String, enum: ['email', 'sms', 'whatsapp', 'push'], required: true },
  recipient:           { email: String, phone: String },
  subject:             String,
  message:             { type: String, required: true },
  htmlContent:         String,
  appointmentId:       String,
  appointmentStatus:   { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed', 'rescheduled'] },
  appointmentSnapshot: { doctorName: String, patientName: String, date: Date, timeSlot: String, status: String, clinic: String },
  read:                { type: Boolean, default: false },
  status:              { type: String, enum: ['pending', 'sent', 'failed'], default: 'sent' },
  sentAt:              Date,
  createdAt:           { type: Date, default: Date.now, index: true },
});

// ── Templates ─────────────────────────────────────────────────────────────────
const NOTIFICATION_TEMPLATES = [
  { subject: 'Appointment Confirmed', message: 'Your appointment with Dr. Sarah Johnson on April 18, 2026 at 09:00 AM has been confirmed.', userType: 'patient', type: 'email', appointmentStatus: 'confirmed' },
  { subject: 'Appointment Reminder', message: 'Reminder: You have an appointment tomorrow at 10:00 AM with Dr. Michael Chen.', userType: 'patient', type: 'push', appointmentStatus: 'confirmed' },
  { subject: 'Appointment Cancelled', message: 'Your appointment on April 20, 2026 has been cancelled. Please rebook at your convenience.', userType: 'patient', type: 'email', appointmentStatus: 'cancelled' },
  { subject: 'New Appointment Booked', message: 'A new appointment has been booked for you. Patient: Jane Patient at 09:00 AM.', userType: 'doctor', type: 'push', appointmentStatus: 'confirmed' },
  { subject: 'Payment Received', message: 'Payment of LKR 2,500 has been received for appointment APT-SEED-001.', userType: 'patient', type: 'email' },
  { subject: 'Welcome to HealthCare Platform', message: 'Welcome! Your account has been created. Start by booking your first appointment.', userType: 'patient', type: 'email' },
  { subject: 'Profile Updated', message: 'Your profile information was successfully updated.', userType: 'patient', type: 'push' },
  { subject: 'Doctor Credentials Verified', message: 'Your doctor credentials have been verified. Your account is now active.', userType: 'doctor', type: 'email' },
];

// ── Entry point ───────────────────────────────────────────────────────────────
async function seed() {
  const notifConn = await mongoose.createConnection(MONGO_URI).asPromise();
  const authConn  = await mongoose.createConnection(AUTH_DB).asPromise();
  console.log('[notification-service] Connected to', MONGO_URI);

  const Notification = notifConn.model('Notification', NotificationSchema);
  const usersColl    = authConn.db.collection('users');

  const users = await usersColl.find({}).toArray();
  if (users.length === 0) {
    console.log('[notification-service] No users found. Run 01-auth-service.seed.js first.');
    await notifConn.close(); await authConn.close();
    return;
  }

  let created = 0;
  for (let i = 0; i < NOTIFICATION_TEMPLATES.length; i++) {
    const tpl  = NOTIFICATION_TEMPLATES[i];
    const user = users[i % users.length];
    const notifId = `NOTIF-SEED-${String(i + 1).padStart(3, '0')}`;

    const exists = await Notification.findOne({ notificationId: notifId });
    if (!exists) {
      await Notification.create({
        notificationId: notifId,
        userId:         user._id.toString(),
        userType:       tpl.userType,
        type:           tpl.type,
        recipient:      { email: user.email },
        subject:        tpl.subject,
        message:        tpl.message,
        appointmentStatus: tpl.appointmentStatus,
        read:           i % 3 === 0,
        status:         'sent',
        sentAt:         new Date(Date.now() - i * 3600000),
        createdAt:      new Date(Date.now() - i * 3600000),
      });
      console.log(`  added notification: ${tpl.subject}`);
      created++;
    } else {
      console.log(`  skip  notification: ${tpl.subject}`);
    }
  }

  console.log(`[notification-service] Done — ${created} notification(s) inserted.\n`);
  await notifConn.close();
  await authConn.close();
}

seed().catch((err) => {
  console.error('[notification-service] Seed error:', err.message);
  process.exit(1);
});
