require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const Slot = require('../src/models/Slot');

const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://Doctor:doctor123@farm.asobfd5.mongodb.net/appointment-management?retryWrites=true&w=majority';

const seed = async () => {
  await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('[seed] Connected to', mongoURI);

  // fetch doctors from auth-service
  const doctorServiceUrl = process.env.DOCTOR_SERVICE_URL || 'http://localhost:3000';
  const headers = {
    'x-gateway': 'true',
    'x-api-key': process.env.INTERNAL_API_KEY || 'gateway-secret-key-change-in-production',
    'x-user-id': process.env.SERVICE_USER_ID || 'appointment-seed',
    'x-user-role': 'SERVICE'
  };

  let doctors = [];
  try {
    const res = await axios.get(`${doctorServiceUrl}/api/auth/doctors`, { headers, timeout: 5000 });
    if (res && res.data && res.data.data) doctors = res.data.data;
  } catch (err) {
    console.warn('[seed] Failed to fetch doctors from auth-service:', err.message);
  }

  if (doctors.length === 0) {
    console.log('[seed] No doctors found from auth-service; creating sample slots for placeholder doctor ids');
    doctors = [{ id: 'DOC001' }, { id: 'DOC002' }, { id: 'DOC003' }];
  }

  const dates = [new Date(), new Date(Date.now() + 24*60*60*1000)];
  for (const doc of doctors) {
    for (const d of dates) {
      const slotDate = new Date(d);
      slotDate.setHours(0,0,0,0);
      const times = ['09:00 AM','10:00 AM','11:00 AM','02:00 PM','03:00 PM'];
      for (const t of times) {
        try {
          await Slot.create({ doctorId: doc._id ? doc._id.toString() : doc.id, date: slotDate, timeSlot: t, isBooked: false });
        } catch (err) {
          // ignore duplicates
        }
      }
    }
    console.log(`[seed] seeded slots for doctor ${doc.email || doc.id}`);
  }

  console.log('[seed] Slots seeded');
  process.exit(0);
};

seed().catch((err) => { console.error('[seed] error', err.message); process.exit(1); });
