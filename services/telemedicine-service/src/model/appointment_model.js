// models/appointment.model.js
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
  videoLink: { type: String, required: false },  // Optional: store the video consultation link
  scheduledTime: { type: Date, required: true },
});

module.exports = mongoose.model('Appointment', appointmentSchema);