const mongoose = require('mongoose');

const APPT_DB = process.env.APPOINTMENT_MONGO_URI || 'mongodb://localhost:27017/appointment-service';
const doctorId = process.argv[2];
const dateArg = process.argv[3];

if (!doctorId) {
  console.error('Usage: node queryAppointmentSlots.js <doctorId> [YYYY-MM-DD]');
  process.exit(1);
}

async function run() {
  await mongoose.connect(APPT_DB);
  const db = mongoose.connection.db;
  const slots = db.collection('slots');

  const query = { doctorId };
  if (dateArg) {
    const d = new Date(dateArg);
    d.setHours(0,0,0,0);
    const d2 = new Date(d);
    d2.setHours(23,59,59,999);
    query.date = { $gte: d, $lte: d2 };
  }

  const docs = await slots.find(query).sort({ date: 1, timeSlot: 1 }).toArray();
  console.log(`Found ${docs.length} slot(s) for doctor ${doctorId}${dateArg ? ' on '+dateArg : ''}`);
  for (const s of docs) {
    console.log({ _id: s._id.toString(), date: s.date.toISOString().slice(0,10), timeSlot: s.timeSlot, isBooked: s.isBooked, metadata: s.metadata });
  }

  await mongoose.disconnect();
}

run().catch(err => { console.error('Error:', err.message); process.exit(1); });
