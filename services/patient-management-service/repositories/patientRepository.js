const Patient = require('../models/Patient');

/**
 * PatientRepository — all direct Mongoose queries for the Patient collection.
 */
class PatientRepository {
  /** Create a new Patient profile document. */
  async create(patientData) {
    const patient = new Patient(patientData);
    return patient.save();
  }

  /** Find a patient by their linked User ID. */
  async findByUserId(userId) {
    return Patient.findOne({ userId });
  }

  /** Find a patient by their own _id. */
  async findById(id) {
    return Patient.findById(id);
  }

  /**
   * Update a patient's profile fields.
   * upsert:true — creates the profile if it doesn't exist yet (safety net).
   */
  async update(userId, updateData) {
    return Patient.findOneAndUpdate({ userId }, updateData, {
      new: true,
      upsert: true,
      runValidators: true,
    });
  }

  /** Push a new prescription sub-document into the prescriptions array. */
  async addPrescription(userId, prescription) {
    return Patient.findOneAndUpdate(
      { userId },
      { $push: { prescriptions: prescription } },
      { new: true }
    );
  }

  /** Push a new history entry sub-document into the medicalHistory array. */
  async addMedicalHistory(userId, historyEntry) {
    return Patient.findOneAndUpdate(
      { userId },
      { $push: { medicalHistory: historyEntry } },
      { new: true }
    );
  }

  /** Return all patient profiles. */
  async findAll() {
    return Patient.find();
  }
}

module.exports = new PatientRepository();
