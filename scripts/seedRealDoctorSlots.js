const mongoose = require('mongoose');
require('dotenv').config();

const AUTH_DB = process.env.AUTH_MONGO_URI || 'mongodb+srv://Doctor:doctor123@farm.asobfd5.mongodb.net/auth-management?retryWrites=true&w=majority';
const APPT_DB = process.env.APPOINTMENT_MONGO_URI || 'mongodb+srv://Doctor:doctor123@farm.asobfd5.mongodb.net/appointment-management?retryWrites=true&w=majority';
const DOCTOR_EMAIL = process.env.DOCTOR_EMAIL || 'hemantha.dias@example.com';

async function run() {
  let authConn;
  let apptConn;
  try {
    authConn = await mongoose.createConnection(AUTH_DB).asPromise();
    console.log('[seedReal] Connected to auth DB:', AUTH_DB);

    const usersColl = authConn.db.collection('users');
    const doctor = await usersColl.findOne({ email: DOCTOR_EMAIL });
    if (!doctor) {
      console.error(`[seedReal] Doctor with email ${DOCTOR_EMAIL} not found in auth DB`);
      process.exit(1);
    }
    const doctorId = doctor._id.toString();
    console.log(`[seedReal] Found doctor ${doctor.email} id=${doctorId}`);

    apptConn = await mongoose.createConnection(APPT_DB).asPromise();
    console.log('[seedReal] Connected to appointment DB:', APPT_DB);

    const slotsColl = apptConn.db.collection('slots');

    const today = new Date();
    const days = [0,1,2,3,4];
    const times = ['09:00 AM','10:00 AM','11:00 AM','02:00 PM','03:00 PM'];
    const docs = [];
    for (const d of days) {
      const date = new Date(today);
      date.setDate(today.getDate() + d);
      date.setHours(0,0,0,0);
      for (const t of times) {
        docs.push({ doctorId, date, timeSlot: t, isBooked: false, metadata: { seeded: true } });
      }
    }

    if (docs.length) {
      const res = await slotsColl.insertMany(docs, { ordered: false });
      console.log(`[seedReal] Inserted ${res.insertedCount} slots for doctor ${doctor.email}`);
    }

    await authConn.close();
    await apptConn.close();
    process.exit(0);
  } catch (err) {
    console.error('[seedReal] Error:', err.message);
    try { if (authConn) await authConn.close(); } catch {}
    try { if (apptConn) await apptConn.close(); } catch {}
    process.exit(1);
  }
}

run();
