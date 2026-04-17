/**
 * Seed: payment-service  (DB: payment-service)
 *
 * Creates sample payment records tied to the seeded users.
 *
 * Run inside container:
 *   docker exec healthcare-payment-service node /seeds/05-payment-service.seed.js
 */

'use strict';

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/payment-service';
const AUTH_DB   = process.env.AUTH_MONGO_URI || 'mongodb://mongodb:27017/auth-management';

// ── Inline schema ─────────────────────────────────────────────────────────────
const PaymentSchema = new mongoose.Schema(
  {
    userId:        { type: String, required: true },
    appointmentId: { type: String, required: true },
    amount:        { type: Number, required: true },
    status:        { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' },
    paymentMethod: String,
    transactionId: String,
  },
  { timestamps: true }
);

// ── Entry point ───────────────────────────────────────────────────────────────
async function seed() {
  const payConn  = await mongoose.createConnection(MONGO_URI).asPromise();
  const authConn = await mongoose.createConnection(AUTH_DB).asPromise();
  console.log('[payment-service] Connected to', MONGO_URI);

  const Payment   = payConn.model('Payment', PaymentSchema);
  const usersColl = authConn.db.collection('users');

  const patients = await usersColl.find({ role: 'PATIENT' }).toArray();
  if (patients.length === 0) {
    console.log('[payment-service] No patients found. Run 01-auth-service.seed.js first.');
    await payConn.close(); await authConn.close();
    return;
  }

  const METHODS = ['CARD', 'CASH', 'ONLINE'];
  const STATUSES = ['SUCCESS', 'SUCCESS', 'SUCCESS', 'PENDING', 'FAILED'];

  const PAYMENTS = [
    { appointmentId: 'APT-SEED-001', amount: 2500 },
    { appointmentId: 'APT-SEED-002', amount: 2000 },
    { appointmentId: 'APT-SEED-003', amount: 1500 },
    { appointmentId: 'APT-SEED-004', amount: 1200 },
    { appointmentId: 'APT-SEED-005', amount: 2500 },
  ];

  let created = 0;
  for (let i = 0; i < PAYMENTS.length; i++) {
    const patient = patients[i % patients.length];
    const p = PAYMENTS[i];
    const exists = await Payment.findOne({ appointmentId: p.appointmentId });
    if (!exists) {
      const status = STATUSES[i % STATUSES.length];
      await Payment.create({
        userId:        patient._id.toString(),
        appointmentId: p.appointmentId,
        amount:        p.amount,
        status,
        paymentMethod: METHODS[i % METHODS.length],
        transactionId: status === 'SUCCESS' ? `TXN-${Date.now()}-${i}` : null,
      });
      console.log(`  added payment ${p.appointmentId} (${status})`);
      created++;
    } else {
      console.log(`  skip  payment ${p.appointmentId}`);
    }
  }

  console.log(`[payment-service] Done — ${created} payment(s) inserted.\n`);
  await payConn.close();
  await authConn.close();
}

seed().catch((err) => {
  console.error('[payment-service] Seed error:', err.message);
  process.exit(1);
});
