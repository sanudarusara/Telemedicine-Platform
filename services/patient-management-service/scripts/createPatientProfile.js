require('dotenv').config();
const mongoose = require('mongoose');
const Patient = require('../models/Patient');

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node createPatientProfile.js <userId>');
  process.exit(1);
}

const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb+srv://Doctor:doctor123@farm.asobfd5.mongodb.net/patient-management?retryWrites=true&w=majority';

const run = async () => {
  await mongoose.connect(mongoURI);
  console.log('[seed] Connected to', mongoURI);

  const existing = await Patient.findOne({ userId });
  if (existing) {
    console.log('[seed] Patient profile already exists for userId', userId);
    process.exit(0);
  }

  const p = new Patient({
    userId,
    dateOfBirth: new Date('1990-01-01'),
    gender: 'OTHER',
    phone: '+10000000020',
    address: { street: '1 Test St', city: 'Testville', state: 'TS', zipCode: '00000', country: 'Testland' },
    emergencyContact: { name: 'EC One', relationship: 'Friend', phone: '+10000000021' }
  });

  await p.save();
  console.log('[seed] Created patient profile for userId', userId);
  process.exit(0);
};

run().catch(err => { console.error('[seed] error', err.message); process.exit(1); });
