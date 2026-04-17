/**
 * Seed: auth-service  (DB: auth-management)
 *
 * Creates:
 *  - 1 ADMIN user
 *  - 4 DOCTOR users (specialties: Cardiology, Dermatology, General Medicine x2)
 *  - 3 PATIENT users
 *
 * Run inside the container:
 *   docker exec healthcare-auth-service node /seeds/01-auth-service.seed.js
 *
 * Or via the master runner:
 *   node seeds/run-all-seeds.js
 */

'use strict';

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/auth-management';

// ── Inline schema (mirrors services/auth-service/models/User.js) ─────────────
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:    { type: String, required: true },
    role:        { type: String, enum: ['PATIENT', 'DOCTOR', 'ADMIN'], default: 'PATIENT' },
    specialty:   { type: String },
    fee:         { type: Number },
    phone:       { type: String },
    isVerified:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// ── Seed data ─────────────────────────────────────────────────────────────────
const USERS = [
  // Admin
  { name: 'Super Admin',        email: 'admin@healthcare.com',           password: 'Admin@1234',   role: 'ADMIN' },

  // Doctors
  { name: 'Dr. Sarah Johnson',  email: 'sarah@example.com',              password: 'password123', role: 'DOCTOR', specialty: 'Cardiology',       fee: 2500, phone: '+10000000001', isVerified: true },
  { name: 'Dr. Michael Chen',   email: 'michael@example.com',            password: 'password123', role: 'DOCTOR', specialty: 'Dermatology',      fee: 2000, phone: '+10000000002', isVerified: true },
  { name: 'Dr. Amanda Perera',  email: 'amanda@example.com',             password: 'password123', role: 'DOCTOR', specialty: 'General Medicine', fee: 1500, phone: '+10000000003', isVerified: true },
  { name: 'Dr. Hemantha Dias',  email: 'hemantha.dias@example.com',      password: 'password123', role: 'DOCTOR', specialty: 'General Medicine', fee: 1200, phone: '+94771234567', isVerified: true },

  // Patients
  { name: 'Jane Patient',       email: 'jane.patient@healthcare.com',    password: 'Patient@1234', role: 'PATIENT' },
  { name: 'John Patient',       email: 'john.patient@healthcare.com',    password: 'Patient@1234', role: 'PATIENT' },
  { name: 'Alice Fernandez',    email: 'alice.fernandez@healthcare.com', password: 'Patient@1234', role: 'PATIENT' },
];

// ── Entry point ───────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('[auth-service] Connected:', MONGO_URI);

  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  let created = 0;
  for (const u of USERS) {
    const exists = await User.findOne({ email: u.email.toLowerCase() });
    if (exists) {
      console.log(`  skip  ${u.role.padEnd(7)} ${u.email}`);
      continue;
    }
    await new User(u).save();
    console.log(`  added ${u.role.padEnd(7)} ${u.email}`);
    created++;
  }

  console.log(`[auth-service] Done — ${created} new user(s) inserted.\n`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[auth-service] Seed error:', err.message);
  process.exit(1);
});
