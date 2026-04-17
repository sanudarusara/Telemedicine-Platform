/**
 * Seed: telemedicine-service  (DB: telemedicine-service)
 *
 * Creates sample VideoSession records linked to seeded patients and doctors.
 *
 * Run inside container:
 *   docker exec healthcare-telemedicine-service node /seeds/08-telemedicine-service.seed.js
 */

'use strict';

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://Doctor:doctor123@farm.asobfd5.mongodb.net/telemedicine-service?retryWrites=true&w=majority';
const AUTH_DB   = process.env.AUTH_MONGO_URI || 'mongodb+srv://Doctor:doctor123@farm.asobfd5.mongodb.net/auth-management?retryWrites=true&w=majority';

// ── Inline schema ─────────────────────────────────────────────────────────────
const VideoSessionSchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
    doctorId:      { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    patientId:     { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    roomName:      { type: String, required: true, unique: true, trim: true },
    joinUrl:       { type: String, required: true, trim: true },
    status:        { type: String, enum: ['created', 'active', 'ended'], default: 'created', index: true },
    startedAt:     { type: Date, default: Date.now },
    endedAt:       Date,
  },
  { timestamps: true }
);

// ── Entry point ───────────────────────────────────────────────────────────────
async function seed() {
  const teleConn = await mongoose.createConnection(MONGO_URI).asPromise();
  const authConn = await mongoose.createConnection(AUTH_DB).asPromise();
  console.log('[telemedicine-service] Connected to', MONGO_URI);

  const VideoSession = teleConn.model('VideoSession', VideoSessionSchema);
  const usersColl    = authConn.db.collection('users');

  const doctors  = await usersColl.find({ role: 'DOCTOR' }).toArray();
  const patients = await usersColl.find({ role: 'PATIENT' }).toArray();

  if (!doctors.length || !patients.length) {
    console.log('[telemedicine-service] Need doctors + patients. Run 01-auth-service.seed.js first.');
    await teleConn.close(); await authConn.close();
    return;
  }

  const SESSIONS = [
    { status: 'ended',   minutesAgo: 120 },
    { status: 'ended',   minutesAgo: 2880 },
    { status: 'created', minutesAgo: 0 },
    { status: 'active',  minutesAgo: 15 },
  ];

  let created = 0;
  for (let i = 0; i < SESSIONS.length; i++) {
    const s       = SESSIONS[i];
    const doctor  = doctors[i % doctors.length];
    const patient = patients[i % patients.length];

    // Use a dummy appointmentId (ObjectId) so the unique constraint is consistent
    const appointmentId = new mongoose.Types.ObjectId();
    const roomName = `room-seed-${String(i + 1).padStart(3, '0')}`;

    const exists = await VideoSession.findOne({ roomName });
    if (!exists) {
      const startedAt = new Date(Date.now() - s.minutesAgo * 60 * 1000);
      await VideoSession.create({
        appointmentId,
        doctorId:  doctor._id,
        patientId: patient._id,
        roomName,
        joinUrl:   `https://meet.healthcare.local/${roomName}`,
        status:    s.status,
        startedAt,
        endedAt:   s.status === 'ended' ? new Date(startedAt.getTime() + 30 * 60 * 1000) : undefined,
      });
      console.log(`  added session ${roomName} (${s.status})`);
      created++;
    } else {
      console.log(`  skip  session ${roomName}`);
    }
  }

  console.log(`[telemedicine-service] Done — ${created} session(s) inserted.\n`);
  await teleConn.close();
  await authConn.close();
}

seed().catch((err) => {
  console.error('[telemedicine-service] Seed error:', err.message);
  process.exit(1);
});
