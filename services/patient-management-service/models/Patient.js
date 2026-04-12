const mongoose = require('mongoose');

// ─── Sub-schema: a single prescription entry ──────────────────────────────────
const PrescriptionSchema = new mongoose.Schema(
  {
    medication: { type: String, required: true, trim: true },
    dosage:     { type: String, trim: true },
    frequency:  { type: String, trim: true },
    notes:      { type: String, trim: true },
    // ObjectId of the DOCTOR / ADMIN who prescribed (stored as ref to auth-service)
    prescribedBy: { type: mongoose.Schema.Types.ObjectId },
    prescribedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// ─── Sub-schema: a single medical-history entry ───────────────────────────────
const HistorySchema = new mongoose.Schema(
  {
    condition:  { type: String, required: true, trim: true },
    diagnosis:  { type: String, trim: true },
    treatment:  { type: String, trim: true },
    notes:      { type: String, trim: true },
    date:       { type: Date, default: Date.now },
    // ObjectId of the DOCTOR who recorded this entry (stored as ref to auth-service)
    doctorId: { type: mongoose.Schema.Types.ObjectId },
  },
  { _id: true }
);

/**
 * Patient profile — extends a User account with medical / personal details.
 * One-to-one relationship with User (via userId).
 */
const PatientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
    },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER'],
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    phone: { type: String, trim: true },
    address: {
      street:  { type: String, trim: true },
      city:    { type: String, trim: true },
      state:   { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, trim: true },
    },
    emergencyContact: {
      name:         { type: String, trim: true },
      relationship: { type: String, trim: true },
      phone:        { type: String, trim: true },
    },
    allergies:      [{ type: String, trim: true }],
    prescriptions:  [PrescriptionSchema],
    medicalHistory: [HistorySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Patient', PatientSchema);
