require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

const argv = require('yargs')
  .option('email', { type: 'string', demandOption: true })
  .option('password', { type: 'string', demandOption: true })
  .option('name', { type: 'string', default: 'Seeded User' })
  .option('role', { type: 'string', choices: ['PATIENT', 'DOCTOR', 'ADMIN'], default: 'PATIENT' })
  .help()
  .argv;

const seed = async () => {
  await connectDB();

  const { email, password, name, role } = argv;

  let existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    console.log('User already exists:', existing._id.toString());
    process.exit(0);
  }

  const u = new User({ name, email, password, role });
  await u.save();
  console.log('Created user id:', u._id.toString());
  process.exit(0);
};

seed().catch((err) => {
  console.error('Error seeding user:', err.message);
  process.exit(1);
});
