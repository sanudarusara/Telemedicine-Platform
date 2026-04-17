const patientService = require('../services/patientService');
const { publishEvent } = require('../kafka');
const TOPICS = require('../../shared/kafka/topics');
const EVENTS = require('../../shared/kafka/events');
const { createEvent } = require('../../shared/kafka/eventFactory');

/**
 * PatientController — handles HTTP requests for patient profile, prescriptions,
 * and medical history endpoints.
 */
class PatientController {
  /**
   * GET /api/patients/profile
   * Return the profile for the currently authenticated patient.
   */
  async getProfile(req, res) {
    try {
      const patient = await patientService.getProfile(req.user.id);
      return res.status(200).json({ success: true, data: patient });
    } catch (error) {
      return res.status(404).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/patients/profile
   * Update the currently authenticated patient's profile.
   * Body: any subset of { dateOfBirth, gender, bloodGroup, phone,
   *                       address, emergencyContact, allergies }
   */
  async updateProfile(req, res) {
    try {
      const patient = await patientService.updateProfile(req.user.id, req.body);
      
      // Publish patient profile update event
      const event = createEvent({
        eventType: EVENTS.PROFILE_UPDATED,
        userId: req.user.id,
        userRole: 'PATIENT',
        serviceName: 'patient-management-service',
        description: `Patient profile updated: ${req.user.id}`,
        status: 'SUCCESS',
        ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
        metadata: {
          patientId: patient?._id?.toString(),
          updatedFields: Object.keys(req.body),
        },
      });

      publishEvent(TOPICS.PATIENT_EVENTS, event).catch(() => {});

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: patient,
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/patients  (ADMIN only)
   * Return all patient profiles.
   */
  async getAllPatients(req, res) {
    try {
      const patients = await patientService.getAllPatients();
      return res.status(200).json({
        success: true,
        count: patients.length,
        data: patients,
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/patients/:userId/prescriptions  (DOCTOR, ADMIN)
   * Add a new prescription to a patient's record.
   * Params: userId — the User._id of the patient
   * Body:   { medication, dosage?, frequency?, notes? }
   */
  async addPrescription(req, res) {
    try {
      const patient = await patientService.addPrescription(req.params.userId, {
        ...req.body,
        prescribedBy: req.user.id, // automatically set to the requesting doctor
      });

      // Publish prescription added event
      const event = createEvent({
        eventType: EVENTS.PRESCRIPTION_ADDED,
        userId: req.params.userId,
        userRole: 'PATIENT',
        serviceName: 'patient-management-service',
        description: `Prescription added for patient by ${req.user.role}`,
        status: 'SUCCESS',
        ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
        metadata: {
          patientId: patient?._id?.toString(),
          prescribedBy: req.user.id,
          medication: req.body.medication,
        },
      });

      publishEvent(TOPICS.PATIENT_EVENTS, event).catch(() => {});

      return res.status(201).json({
        success: true,
        message: 'Prescription added successfully',
        data: patient,
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/patients/:userId/prescriptions  (PATIENT, DOCTOR, ADMIN)
   * Return all prescriptions for a patient.
   */
  async getPrescriptions(req, res) {
    try {
      const prescriptions = await patientService.getPrescriptions(
        req.params.userId
      );
      return res.status(200).json({ success: true, data: prescriptions });
    } catch (error) {
      return res.status(404).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/patients/:userId/history  (DOCTOR, ADMIN)
   * Append a medical-history entry to a patient's record.
   * Params: userId — User._id of the patient
   * Body:   { condition, diagnosis?, treatment?, notes?, date? }
   */
  async addMedicalHistory(req, res) {
    try {
      const patient = await patientService.addMedicalHistory(req.params.userId, {
        ...req.body,
        doctorId: req.user.id, // record which doctor made the entry
      });

      // Publish medical history added event
      const event = createEvent({
        eventType: EVENTS.MEDICAL_HISTORY_ADDED,
        userId: req.params.userId,
        userRole: 'PATIENT',
        serviceName: 'patient-management-service',
        description: `Medical history entry added by ${req.user.role}`,
        status: 'SUCCESS',
        ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
        metadata: {
          patientId: patient?._id?.toString(),
          doctorId: req.user.id,
          condition: req.body.condition,
        },
      });

      publishEvent(TOPICS.PATIENT_EVENTS, event).catch(() => {});

      return res.status(201).json({
        success: true,
        message: 'Medical history entry added successfully',
        data: patient,
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/patients/:userId/history  (PATIENT, DOCTOR, ADMIN)
   * Return the full medical history for a patient.
   */
  async getMedicalHistory(req, res) {
    try {
      const history = await patientService.getMedicalHistory(req.params.userId);
      return res.status(200).json({ success: true, data: history });
    } catch (error) {
      return res.status(404).json({ success: false, message: error.message });
    }
  }
}

module.exports = new PatientController();
