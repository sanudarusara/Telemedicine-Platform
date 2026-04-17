const mongoose = require('mongoose');
require('dotenv').config();

const APPT_DB = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://Doctor:doctor123@farm.asobfd5.mongodb.net/appointment-management?retryWrites=true&w=majority';
const doctorId = process.argv[2];

if (!doctorId) {
  console.error('Usage: node fixSlotDates.js <doctorId>');
  process.exit(1);
}

async function run() {
  await mongoose.connect(APPT_DB);
  const db = mongoose.connection.db;
  const slots = db.collection('slots');

  const docs = await slots.find({ doctorId }).toArray();
  console.log(`Found ${docs.length} slots to fix for ${doctorId}`);
  let updated = 0;
  for (const s of docs) {
    const d = new Date(s.date);
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    if (utc.getTime() !== d.getTime()) {
      await slots.updateOne({ _id: s._id }, { $set: { date: utc } });
      updated++;
    }
  }
  console.log(`Updated ${updated} slots to UTC-midnight dates`);
  await mongoose.disconnect();
}

run().catch(err => { console.error('Error:', err.message); process.exit(1); });
