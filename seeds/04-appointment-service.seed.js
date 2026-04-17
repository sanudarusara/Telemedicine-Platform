/**
 * Seed: appointment-service  (DB: appointment-management)
 *
 * Creates available Slots for each real doctor (pulled from auth-management DB).
 * Slots span the next 5 days, 5 time slots per day per doctor.
 *
 * Run inside container:
 *   docker exec healthcare-appointment-service node /seeds/04-appointment-service.seed.js
 */

'use strict';

const mongoose = require('mongoose');

const APPT_DB = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://Doctor:doctor123@farm.asobfd5.mongodb.net/appointment-management?retryWrites=true&w=majority';
const AUTH_DB = process.env.AUTH_MONGO_URI || 'mongodb+srv://Doctor:doctor123@farm.asobfd5.mongodb.net/auth-management?retryWrites=true&w=majority';

// ── Inline schema ─────────────────────────────────────────────────────────────
const SlotSchema = new mongoose.Schema(
  {
    doctorId:  { type: String, required: true, index: true },
    date:      { type: Date, required: true, index: true },
    timeSlot:  { type: String, required: true },
    isBooked:  { type: Boolean, default: false },
    metadata:  { type: Object, default: {} },
  },
  { timestamps: true }
);
SlotSchema.index({ doctorId: 1, date: 1, timeSlot: 1 }, { unique: true });

const TIME_SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];

/** Returns Date objects for the next N days (time zeroed) */
function nextNDays(n) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

// ── Entry point ───────────────────────────────────────────────────────────────
async function seed() {
  const apptConn = await mongoose.createConnection(APPT_DB).asPromise();
  const authConn = await mongoose.createConnection(AUTH_DB).asPromise();
  console.log('[appointment-service] Connected to', APPT_DB);

  const Slot      = apptConn.model('Slot', SlotSchema);
  const usersColl = authConn.db.collection('users');

  const doctors = await usersColl.find({ role: 'DOCTOR' }).toArray();
  if (doctors.length === 0) {
    console.log('[appointment-service] No doctors found in auth-management. Run 01-auth-service.seed.js first.');
    await apptConn.close(); await authConn.close();
    return;
  }

  const dates = nextNDays(5);
  let created = 0;

  for (const doc of doctors) {
    for (const date of dates) {
      for (const timeSlot of TIME_SLOTS) {
        try {
          await Slot.create({ doctorId: doc._id.toString(), date, timeSlot, isBooked: false });
          created++;
        } catch (err) {
          if (err.code !== 11000) throw err; // ignore duplicate key
        }
      }
    }
    console.log(`  seeded slots for ${doc.email}`);
  }

  console.log(`[appointment-service] Done — ${created} slot(s) inserted.\n`);
  await apptConn.close();
  await authConn.close();
}

seed().catch((err) => {
  console.error('[appointment-service] Seed error:', err.message);
  process.exit(1);
});
