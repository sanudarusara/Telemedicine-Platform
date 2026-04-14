require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

const seed = async () => {
  await connectDB();

  const doctors = [
    { name: 'Dr. Sarah Johnson', email: 'sarah@example.com', password: 'password123', role: 'DOCTOR', specialty: 'Cardiology', fee: 2500, phone: '+10000000001', isVerified: true },
    { name: 'Dr. Michael Chen', email: 'michael@example.com', password: 'password123', role: 'DOCTOR', specialty: 'Dermatology', fee: 2000, phone: '+10000000002', isVerified: true },
    { name: 'Dr. Amanda Perera', email: 'amanda@example.com', password: 'password123', role: 'DOCTOR', specialty: 'General Medicine', fee: 1500, phone: '+10000000003', isVerified: true }
  ];

  for (const doc of doctors) {
    const existing = await User.findOne({ email: doc.email });
    if (existing) {
      console.log(`Skipping existing: ${doc.email}`);
      continue;
    }
    const user = new User(doc);
    await user.save();
    console.log(`Inserted doctor: ${user.email}`);
  }

  console.log('Seed complete.');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed error:', err.message);
  process.exit(1);
});
