require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

const seed = async () => {
  await connectDB();

  const patient = {
    name: 'Test Patient',
    email: 'test.patient@example.com',
    password: 'TestPass123',
    role: 'PATIENT',
    phone: '+10000000010',
    isVerified: true
  };

  let existing = await User.findOne({ email: patient.email });
  if (existing) {
    console.log('Patient user exists:', existing._id.toString());
    process.exit(0);
  }

  const u = new User(patient);
  await u.save();
  console.log('Created patient user id:', u._id.toString());
  process.exit(0);
};

seed().catch(err => { console.error('Error:', err.message); process.exit(1); });
