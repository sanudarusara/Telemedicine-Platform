require('dotenv').config();
const mongoose = require('mongoose');
const Slot = require('../models/Slot');
const User = require('../models/User');

const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/auth-service';

const seed = async () => {
  await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('[seed] Connected to', mongoURI);

  const doctors = await User.find({ role: 'DOCTOR' }).limit(20);
  if (!doctors || doctors.length === 0) {
    console.log('[seed] No doctors found to seed slots for. Run seedDoctors first.');
    process.exit(0);
  }

  const dates = [new Date(), new Date(Date.now() + 24*60*60*1000)];
  for (const doc of doctors) {
    for (const d of dates) {
      const slotDate = new Date(d);
      slotDate.setHours(0,0,0,0);
      const times = ['09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','02:00 PM','02:30 PM'];
      for (const t of times) {
        try {
          await Slot.create({ doctorId: doc._id, date: slotDate, timeSlot: t, isBooked: false });
        } catch (err) {
          // ignore duplicates
        }
      }
    }
    console.log(`[seed] seeded slots for doctor ${doc.email}`);
  }

  console.log('[seed] Doctor slots seeded');
  process.exit(0);
};

seed().catch((err) => { console.error('[seed] error', err.message); process.exit(1); });
