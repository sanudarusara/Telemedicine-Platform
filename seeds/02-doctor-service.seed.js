/**
 * Seed: doctor-service  (DB: doctor-service)
 *
 * Creates Doctor profiles (matching the doctors already seeded in auth-service).
 * Also seeds Slots for the next 5 working days.
 *
 * Run inside container:
 *   docker exec healthcare-doctor-service node /seeds/02-doctor-service.seed.js
 */

'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/doctor-service';

// ── Inline schema (mirrors services/doctor-service/src/models/doctor_model.js) ─
const DoctorSchema = new mongoose.Schema(
  {
    name:           { type: String, required: true, trim: true },
    email:          { type: String, required: true, unique: true, trim: true },
    password:       { type: String, required: true },
    specialization: { type: String, required: true, trim: true },
    clinic:         { type: String, required: true, trim: true },
    fee:            { type: Number, required: true, min: 0 },
    phone:          { type: String, required: true, trim: true },
    role:           { type: String, default: 'doctor' },
    status:         { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    isActive:       { type: Boolean, default: true },
    startTime:      { type: String, default: '09:00', trim: true },
    endTime:        { type: String, default: '17:00', trim: true },
    sessionTime:    { type: Number, default: 30, min: 1 },
    workingDays:    { type: [String], default: ['mon', 'tue', 'wed', 'thu', 'fri'] },
    holidayDates:   { type: [String], default: [] },
  },
  { timestamps: true }
);

DoctorSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

const SlotSchema = new mongoose.Schema(
  {
    doctorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    startTime: { type: String, required: true },
    endTime:   { type: String, required: true },
    date:      { type: String, required: true }, // "YYYY-MM-DD"
    isBooked:  { type: Boolean, default: false },
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ── Seed data ─────────────────────────────────────────────────────────────────
const DOCTORS = [
  { name: 'Dr. Sarah Johnson', email: 'sarah@example.com',         password: 'password123', specialization: 'Cardiology',       clinic: 'Heart Care Centre',      fee: 2500, phone: '+10000000001' },
  { name: 'Dr. Michael Chen',  email: 'michael@example.com',       password: 'password123', specialization: 'Dermatology',      clinic: 'Skin & Wellness Clinic', fee: 2000, phone: '+10000000002' },
  { name: 'Dr. Amanda Perera', email: 'amanda@example.com',        password: 'password123', specialization: 'General Medicine', clinic: 'City Medical Centre',    fee: 1500, phone: '+10000000003' },
  { name: 'Dr. Hemantha Dias', email: 'hemantha.dias@example.com', password: 'password123', specialization: 'General Medicine', clinic: 'Lanka Health Hub',       fee: 1200, phone: '+94771234567' },
];

/** Generate YYYY-MM-DD strings for the next N calendar days */
function nextNDays(n) {
  const days = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

const SLOT_PAIRS = [
  { startTime: '09:00', endTime: '09:30' },
  { startTime: '09:30', endTime: '10:00' },
  { startTime: '10:00', endTime: '10:30' },
  { startTime: '10:30', endTime: '11:00' },
  { startTime: '14:00', endTime: '14:30' },
  { startTime: '14:30', endTime: '15:00' },
  { startTime: '15:00', endTime: '15:30' },
  { startTime: '15:30', endTime: '16:00' },
];

// ── Entry point ───────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('[doctor-service] Connected:', MONGO_URI);

  const Doctor = mongoose.models.Doctor || mongoose.model('Doctor', DoctorSchema);
  const Slot   = mongoose.models.Slot   || mongoose.model('Slot', SlotSchema, 'slots');

  let docCreated = 0;
  let slotCreated = 0;
  const dates = nextNDays(5);

  for (const d of DOCTORS) {
    let doctor = await Doctor.findOne({ email: d.email });
    if (!doctor) {
      doctor = await new Doctor(d).save();
      console.log(`  added doctor ${doctor.email}`);
      docCreated++;
    } else {
      console.log(`  skip  doctor ${doctor.email}`);
    }

    // seed slots for each day
    for (const date of dates) {
      for (const pair of SLOT_PAIRS) {
        const exists = await Slot.findOne({ doctorId: doctor._id, date, startTime: pair.startTime });
        if (!exists) {
          await Slot.create({ doctorId: doctor._id, ...pair, date });
          slotCreated++;
        }
      }
    }
  }

  console.log(`[doctor-service] Done — ${docCreated} doctor(s), ${slotCreated} slot(s) inserted.\n`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[doctor-service] Seed error:', err.message);
  process.exit(1);
});
