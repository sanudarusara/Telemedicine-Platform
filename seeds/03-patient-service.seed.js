/**
 * Seed: patient-management-service  (DB: patient-management)
 *
 * Creates Patient profiles linked to the PATIENT users seeded in auth-service.
 * Also seeds a couple of medical Reports per patient.
 *
 * Run inside container:
 *   docker exec healthcare-patient-service node /seeds/03-patient-service.seed.js
 */

'use strict';

const mongoose = require('mongoose');

const MONGO_URI  = process.env.MONGO_URI  || 'mongodb://mongodb:27017/patient-management';
const AUTH_DB    = process.env.AUTH_MONGO_URI || 'mongodb://mongodb:27017/auth-management';

// ── Inline schemas ────────────────────────────────────────────────────────────
const PrescriptionSchema = new mongoose.Schema({
  medication: { type: String, required: true },
  dosage: String, frequency: String, notes: String,
  prescribedBy: mongoose.Schema.Types.ObjectId,
  prescribedAt: { type: Date, default: Date.now },
});

const HistorySchema = new mongoose.Schema({
  condition: { type: String, required: true },
  diagnosis: String, treatment: String, notes: String,
  date: { type: Date, default: Date.now },
  doctorId: mongoose.Schema.Types.ObjectId,
});

const PatientSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
    dateOfBirth: Date,
    gender:      { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
    bloodGroup:  { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    phone:       String,
    address:     { street: String, city: String, state: String, country: String, postalCode: String },
    emergencyContact: { name: String, phone: String, relationship: String },
    medicalHistory:  { type: [HistorySchema], default: [] },
    prescriptions:   { type: [PrescriptionSchema], default: [] },
    allergies:       { type: [String], default: [] },
    chronicConditions: { type: [String], default: [] },
  },
  { timestamps: true }
);

const ReportSchema = new mongoose.Schema(
  {
    patientId:  { type: mongoose.Schema.Types.ObjectId, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    title:      { type: String, required: true, trim: true },
    description: String,
    fileUrl:    String,
    fileName:   String,
    fileType:   String,
    fileSize:   Number,
    reportType: { type: String, enum: ['LAB_RESULT', 'PRESCRIPTION', 'IMAGING', 'DIAGNOSTIC', 'OTHER'], default: 'OTHER' },
  },
  { timestamps: true }
);

// ── Seed data templates ───────────────────────────────────────────────────────
const PATIENT_TEMPLATES = [
  {
    email: 'jane.patient@healthcare.com',
    profile: {
      dateOfBirth: new Date('1990-05-15'),
      gender: 'FEMALE', bloodGroup: 'B+',
      phone: '+94771000001',
      address: { street: '10 Rose Lane', city: 'Colombo', country: 'Sri Lanka' },
      emergencyContact: { name: 'James Patient', phone: '+94771000010', relationship: 'Spouse' },
      medicalHistory: [
        { condition: 'Hypertension', diagnosis: 'Diagnosed 2020', treatment: 'Amlodipine 5mg daily' },
        { condition: 'Type 2 Diabetes', diagnosis: 'Diagnosed 2022', treatment: 'Metformin 500mg twice daily' },
      ],
      prescriptions: [
        { medication: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', notes: 'Take in the morning' },
      ],
      allergies: ['Penicillin'],
      chronicConditions: ['Hypertension', 'Type 2 Diabetes'],
    },
    reports: [
      { title: 'Blood Sugar Test', description: 'Fasting glucose 112 mg/dL', reportType: 'LAB_RESULT', fileName: 'blood-sugar-jan2026.pdf', fileType: 'application/pdf', fileSize: 102400 },
      { title: 'Chest X-Ray', description: 'Normal cardiac silhouette', reportType: 'IMAGING', fileName: 'chest-xray-mar2026.jpg', fileType: 'image/jpeg', fileSize: 512000 },
    ],
  },
  {
    email: 'john.patient@healthcare.com',
    profile: {
      dateOfBirth: new Date('1985-11-22'),
      gender: 'MALE', bloodGroup: 'O+',
      phone: '+94771000002',
      address: { street: '45 Lake Road', city: 'Kandy', country: 'Sri Lanka' },
      emergencyContact: { name: 'Mary Patient', phone: '+94771000020', relationship: 'Mother' },
      medicalHistory: [
        { condition: 'Asthma', diagnosis: 'Diagnosed 2015', treatment: 'Salbutamol inhaler as needed' },
      ],
      prescriptions: [
        { medication: 'Salbutamol', dosage: '100mcg', frequency: 'As needed', notes: 'Use rescue inhaler' },
      ],
      allergies: ['Aspirin', 'Dust mites'],
      chronicConditions: ['Asthma'],
    },
    reports: [
      { title: 'Spirometry Report', description: 'Mild obstructive pattern', reportType: 'DIAGNOSTIC', fileName: 'spirometry-feb2026.pdf', fileType: 'application/pdf', fileSize: 204800 },
    ],
  },
  {
    email: 'alice.fernandez@healthcare.com',
    profile: {
      dateOfBirth: new Date('1995-03-08'),
      gender: 'FEMALE', bloodGroup: 'A+',
      phone: '+94771000003',
      address: { street: '7 Sunset Blvd', city: 'Galle', country: 'Sri Lanka' },
      emergencyContact: { name: 'Carlos Fernandez', phone: '+94771000030', relationship: 'Father' },
      medicalHistory: [],
      prescriptions: [],
      allergies: [],
      chronicConditions: [],
    },
    reports: [
      { title: 'Annual Full Blood Count', description: 'All values within normal range', reportType: 'LAB_RESULT', fileName: 'fbc-apr2026.pdf', fileType: 'application/pdf', fileSize: 98304 },
    ],
  },
];

// ── Entry point ───────────────────────────────────────────────────────────────
async function seed() {
  const patientConn = await mongoose.createConnection(MONGO_URI).asPromise();
  const authConn    = await mongoose.createConnection(AUTH_DB).asPromise();
  console.log('[patient-service] Connected to', MONGO_URI);

  const Patient  = patientConn.model('Patient',  PatientSchema);
  const Report   = patientConn.model('Report',   ReportSchema);
  const usersColl = authConn.db.collection('users');

  let patCreated = 0;
  let repCreated = 0;

  for (const tpl of PATIENT_TEMPLATES) {
    const authUser = await usersColl.findOne({ email: tpl.email });
    if (!authUser) {
      console.log(`  skip  patient (auth user not found): ${tpl.email}`);
      continue;
    }

    let patient = await Patient.findOne({ userId: authUser._id });
    if (!patient) {
      patient = await Patient.create({ userId: authUser._id, ...tpl.profile });
      console.log(`  added patient ${tpl.email}`);
      patCreated++;
    } else {
      console.log(`  skip  patient ${tpl.email}`);
    }

    // Reports
    for (const r of tpl.reports) {
      const exists = await Report.findOne({ patientId: patient._id, title: r.title });
      if (!exists) {
        await Report.create({ patientId: patient._id, uploadedBy: authUser._id, ...r });
        repCreated++;
      }
    }
  }

  console.log(`[patient-service] Done — ${patCreated} patient(s), ${repCreated} report(s) inserted.\n`);
  await patientConn.close();
  await authConn.close();
}

seed().catch((err) => {
  console.error('[patient-service] Seed error:', err.message);
  process.exit(1);
});
