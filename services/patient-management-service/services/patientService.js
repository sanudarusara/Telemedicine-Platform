const patientRepository = require('../repositories/patientRepository');

// Allowed fields a patient can update on their own profile
const UPDATABLE_FIELDS = [
  'dateOfBirth',
  'gender',
  'bloodGroup',
  'phone',
  'address',
  'emergencyContact',
  'allergies',
];

/**
 * PatientService — business logic for patient profile management,
 * prescriptions, and medical history.
 */
class PatientService {
  /** Return the patient profile for a given userId. */
  async getProfile(userId) {
    const patient = await patientRepository.findByUserId(userId);
    if (!patient) throw new Error('Patient profile not found');
    return patient;
  }

  /**
   * Update a patient's own profile.
   * Only fields listed in UPDATABLE_FIELDS are accepted to prevent
   * accidental or malicious overwrites of sensitive data.
   */
  async updateProfile(userId, profileData) {
    const update = {};
    for (const key of UPDATABLE_FIELDS) {
      if (profileData[key] !== undefined) {
        update[key] = profileData[key];
      }
    }
    return patientRepository.update(userId, update);
  }

  /**
   * Add a prescription to a patient's record.
   * Only DOCTOR and ADMIN roles are allowed via route middleware.
   */
  async addPrescription(userId, prescription) {
    const patient = await patientRepository.findByUserId(userId);
    if (!patient) throw new Error('Patient not found');
    return patientRepository.addPrescription(userId, prescription);
  }

  /**
   * Append a new medical-history entry to a patient's record.
   * Only DOCTOR and ADMIN roles are allowed via route middleware.
   */
  async addMedicalHistory(userId, historyEntry) {
    const patient = await patientRepository.findByUserId(userId);
    if (!patient) throw new Error('Patient not found');
    return patientRepository.addMedicalHistory(userId, historyEntry);
  }

  /** Return all prescriptions for a patient. */
  async getPrescriptions(userId) {
    const patient = await patientRepository.findByUserId(userId);
    if (!patient) throw new Error('Patient not found');
    return patient.prescriptions;
  }

  /** Return the full medical history for a patient. */
  async getMedicalHistory(userId) {
    const patient = await patientRepository.findByUserId(userId);
    if (!patient) throw new Error('Patient not found');
    return patient.medicalHistory;
  }

  /** Return all patient profiles (ADMIN only). */
  async getAllPatients() {
    return patientRepository.findAll();
  }
}

module.exports = new PatientService();
