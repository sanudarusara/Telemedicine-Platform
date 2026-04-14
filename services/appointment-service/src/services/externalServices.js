const axios = require('axios');
const Slot = require('../models/Slot');

class ExternalServices {
    constructor() {
        this.patientServiceURL = process.env.PATIENT_SERVICE_URL || 'http://localhost:3002';
        this.doctorServiceURL = process.env.DOCTOR_SERVICE_URL || 'http://localhost:3003';
        this.notificationServiceURL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3002';
    }
    async getPatientDetails(patientId) {
        // Try fetching the patient's profile via the API Gateway
        // The patient-management-service expects gateway-injected headers (x-gateway, x-api-key, x-user-id, x-user-role)
        try {
            const url = `${this.patientServiceURL}/api/patients/profile`;
            const headers = {
                'Content-Type': 'application/json',
                'x-gateway': 'true',
                'x-api-key': process.env.INTERNAL_API_KEY || 'gateway-secret-key-change-in-production',
                'x-user-id': patientId,
                'x-user-role': 'PATIENT',
                // optionally include name/email via environment if you want to proxy a specific user
                'x-user-email': process.env.INTERNAL_USER_EMAIL || undefined,
                'x-user-name': process.env.INTERNAL_USER_NAME || undefined
            };
            // Optional bearer token if configured
            if (process.env.INTERNAL_API_TOKEN) headers.Authorization = `Bearer ${process.env.INTERNAL_API_TOKEN}`;
            console.log(`[EXTERNAL] Fetching patient ${patientId} from ${url} with headers x-user-id=${headers['x-user-id']} x-user-role=${headers['x-user-role']}`);
            const res = await axios.get(url, { headers, timeout: 5000 });
                if (res && res.data && res.data.data) {
                    const patient = res.data.data;
                    // If patient profile lacks basic contact info, try to enrich from auth-service
                    if ((!patient.name || !patient.email) && this.doctorServiceURL) {
                        try {
                            const authUrl = `${this.doctorServiceURL}/api/auth/users`;
                            const aheaders = {
                                'Content-Type': 'application/json',
                                'x-gateway': 'true',
                                'x-api-key': process.env.INTERNAL_API_KEY || 'gateway-secret-key-change-in-production',
                                'x-user-id': process.env.SERVICE_USER_ID || 'appointment-service',
                                'x-user-role': 'SERVICE'
                            };
                            const ares = await axios.get(authUrl, { headers: aheaders, timeout: 5000 });
                            if (ares && ares.data && Array.isArray(ares.data.data)) {
                                const found = ares.data.data.find(u => (u._id && u._id.toString() === patientId.toString()) || (u.id && u.id === patientId));
                                if (found) {
                                    patient.name = patient.name || found.name || '';
                                    patient.email = patient.email || found.email || '';
                                    patient.phone = patient.phone || found.phone || '';
                                    console.log(`[EXTERNAL] Enriched patient ${patientId} from auth-service user record`);
                                }
                            }
                        } catch (e) {
                            console.warn(`[EXTERNAL] Failed to enrich patient from auth-service: ${e.message}`);
                        }
                    }

                    return patient;
                } else {
                    console.warn(`[EXTERNAL] Patient service returned status ${res?.status} body: ${JSON.stringify(res?.data)}`);
                }
        } catch (err) {
            console.warn(`[EXTERNAL] Failed to fetch patient from API: ${err?.response?.status} ${err?.response?.data ? JSON.stringify(err.response.data) : err.message}. Falling back to mock.`);
        }

        // Fallback mock data (keeps current behavior if patient API is unavailable)
        console.log(`[MOCK] Returning fallback patient details for ID: ${patientId}`);
        const mockPatients = {
            'P001': { id: 'P001', name: 'John Doe', email: 'john@gmail.com', phone: '+94762047659' },
            'P002': { id: 'P002', name: 'Jane Smith', email: 'jane@example.com', phone: '+94729911398' },
            'default': { id: patientId, name: 'Test Patient', email: 'test@gmail.com', phone: '+94729911398' }
        };
        return mockPatients[patientId] || mockPatients.default;
    }

    async getDoctorDetails(doctorId) {
        try {
            const url = `${this.doctorServiceURL}/api/auth/doctors/${doctorId}`;
            const headers = {
                'Content-Type': 'application/json',
                'x-gateway': 'true',
                'x-api-key': process.env.INTERNAL_API_KEY || 'gateway-secret-key-change-in-production',
                'x-user-id': process.env.SERVICE_USER_ID || 'appointment-service',
                'x-user-role': 'SERVICE'
            };
            console.log(`[EXTERNAL] Fetching doctor ${doctorId} from ${url}`);
            const res = await axios.get(url, { headers, timeout: 5000 });
            if (res && res.data && res.data.data) return res.data.data;
            console.warn(`[EXTERNAL] Unexpected response when fetching doctor ${doctorId}: ${JSON.stringify(res?.data)}`);
        } catch (err) {
            console.warn(`[EXTERNAL] Failed to fetch doctor from auth-service: ${err?.response?.status} ${err?.response?.data ? JSON.stringify(err.response.data) : err.message}. Falling back to mock.`);
        }

        // Fallback mock
        console.log(`[MOCK] Returning fallback doctor details for ID: ${doctorId}`);
        const mockDoctors = {
            'DOC001': { id: 'DOC001', name: 'Dr. Sarah Johnson', specialty: 'Cardiologist', fee: 2500, email: 'sarah@gmail.com', phone: '+94729911398' },
            'DOC002': { id: 'DOC002', name: 'Dr. Michael Chen', specialty: 'Dermatologist', fee: 2000, email: 'michael@gmail.com', phone: '+94729911398' },
            'DOC003': { id: 'DOC003', name: 'Dr. Amanda Perera', specialty: 'General Physician', fee: 1500, email: 'amanda@gmail.com', phone: '+94729911398' },
            'default': { id: doctorId, name: 'Dr. Default', specialty: 'General Medicine', fee: 1500, email: 'default@gmail.com', phone: '+94729911398' }
        };
        return mockDoctors[doctorId] || mockDoctors.default;
    }

    async searchDoctors(specialty, name, date) {
        try {
            const params = {};
            if (specialty) params.specialty = specialty;
            if (name) params.name = name;
            const url = `${this.doctorServiceURL}/api/auth/doctors`;
            const headers = {
                'Content-Type': 'application/json',
                'x-gateway': 'true',
                'x-api-key': process.env.INTERNAL_API_KEY || 'gateway-secret-key-change-in-production',
                'x-user-id': process.env.SERVICE_USER_ID || 'appointment-service',
                'x-user-role': 'SERVICE'
            };
            console.log(`[EXTERNAL] Searching doctors from ${url} params=${JSON.stringify(params)}`);
            const res = await axios.get(url, { headers, params, timeout: 5000 });
            if (res && res.data && res.data.data) return res.data.data;
        } catch (err) {
            console.warn(`[EXTERNAL] Failed to search doctors: ${err?.message}. Falling back to mock.`);
        }

        // Fallback mock
        console.log(`[MOCK] Searching doctors - Specialty: ${specialty}, Name: ${name}`);
        const mockDoctors = [
            { id: 'DOC001', name: 'Dr. Sarah Johnson', specialty: 'Cardiologist', available: true, fee: 2500 },
            { id: 'DOC002', name: 'Dr. Michael Chen', specialty: 'Dermatologist', available: true, fee: 2000 },
            { id: 'DOC003', name: 'Dr. Amanda Perera', specialty: 'General Physician', available: true, fee: 1500 },
            { id: 'DOC004', name: 'Dr. David Wilson', specialty: 'Cardiologist', available: true, fee: 3000 },
            { id: 'DOC005', name: 'Dr. Emily Brown', specialty: 'Pediatrician', available: true, fee: 1800 },
        ];
        let results = mockDoctors;
        if (specialty) results = results.filter(d => d.specialty.toLowerCase().includes(specialty.toLowerCase()));
        if (name) results = results.filter(d => d.name.toLowerCase().includes(name.toLowerCase()));
        return results;
    }

    async getAvailableSlots(doctorId, date) {
        try {
            if (!date) return [];
            const url = `${this.doctorServiceURL}/api/auth/doctors/${doctorId}/slots`;
            const headers = {
                'Content-Type': 'application/json',
                'x-gateway': 'true',
                'x-api-key': process.env.INTERNAL_API_KEY || 'gateway-secret-key-change-in-production',
                'x-user-id': process.env.SERVICE_USER_ID || 'appointment-service',
                'x-user-role': 'SERVICE'
            };
            const res = await axios.get(url, { headers, params: { date }, timeout: 5000 });
            if (res && res.data && Array.isArray(res.data.data)) {
                return res.data.data.filter(s => !s.isBooked).map(s => s.timeSlot);
            }
        } catch (err) {
            console.warn(`[EXTERNAL] Failed to fetch slots from auth-service: ${err?.message}. Falling back to local Slot model.`);
        }

        // fallback to local Slot model
        try {
            if (!date) return [];
            const startDate = new Date(date);
            startDate.setHours(0,0,0,0);
            const endDate = new Date(date);
            endDate.setHours(23,59,59,999);

            const slots = await Slot.find({ doctorId: doctorId, date: { $gte: startDate, $lte: endDate }, isBooked: false }).sort({ timeSlot: 1 });
            return slots.map(s => s.timeSlot);
        } catch (err) {
            console.warn(`[EXTERNAL] Failed to read local Slot model: ${err.message}. Falling back to mock slots.`);
        }

        // final fallback
        console.log(`[MOCK] Getting available slots for doctor ${doctorId} on ${date}`);
        const allSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];
        return allSlots;
    }

    async checkAvailability(doctorId, date, timeSlot) {
        try {
            if (!date) return false;
            const url = `${this.doctorServiceURL}/api/auth/doctors/${doctorId}/slots`;
            const headers = {
                'Content-Type': 'application/json',
                'x-gateway': 'true',
                'x-api-key': process.env.INTERNAL_API_KEY || 'gateway-secret-key-change-in-production',
                'x-user-id': process.env.SERVICE_USER_ID || 'appointment-service',
                'x-user-role': 'SERVICE'
            };
            const res = await axios.get(url, { headers, params: { date }, timeout: 5000 });
            if (res && res.data && Array.isArray(res.data.data)) {
                const slot = res.data.data.find(s => s.timeSlot === timeSlot);
                return !!slot && !slot.isBooked;
            }
        } catch (err) {
            console.warn(`[EXTERNAL] Failed to check availability from auth-service: ${err?.message}. Falling back to local Slot model.`);
        }

        try {
            const startDate = new Date(date);
            startDate.setHours(0,0,0,0);
            const endDate = new Date(date);
            endDate.setHours(23,59,59,999);

            const slot = await Slot.findOne({ doctorId, date: { $gte: startDate, $lte: endDate }, timeSlot });
            if (!slot) return false;
            return !slot.isBooked;
        } catch (err) {
            console.warn(`[MOCK] Failed to check Slot model availability: ${err.message}. Defaulting to available.`);
            return true;
        }
    }

    async reserveDoctorSlot(doctorId, date, timeSlot) {
        try {
            const url = `${this.doctorServiceURL}/api/auth/doctors/${doctorId}/slots/reserve`;
            const headers = {
                'Content-Type': 'application/json',
                'x-gateway': 'true',
                'x-api-key': process.env.INTERNAL_API_KEY || 'gateway-secret-key-change-in-production',
                'x-user-id': process.env.SERVICE_USER_ID || 'appointment-service',
                'x-user-role': 'SERVICE'
            };
            const res = await axios.post(url, { date, timeSlot }, { headers, timeout: 5000 });
            if (res && res.data && res.data.success) return res.data.data;
            return null;
        } catch (err) {
            console.warn(`[EXTERNAL] Failed to reserve slot on auth-service: ${err?.message}. Falling back to local Slot model reservation.`);
        }

        // fallback to local Slot model reservation
        try {
            const startDate = new Date(date);
            startDate.setHours(0,0,0,0);
            const slot = await Slot.findOneAndUpdate({ doctorId, date: startDate, timeSlot, isBooked: false }, { $set: { isBooked: true } }, { new: true });
            return slot;
        } catch (err) {
            console.warn(`[EXTERNAL] Local slot reservation failed: ${err.message}`);
            return null;
        }
    }

    async releaseDoctorSlot(doctorId, date, timeSlot) {
        try {
            const url = `${this.doctorServiceURL}/api/auth/doctors/${doctorId}/slots/release`;
            const headers = {
                'Content-Type': 'application/json',
                'x-gateway': 'true',
                'x-api-key': process.env.INTERNAL_API_KEY || 'gateway-secret-key-change-in-production',
                'x-user-id': process.env.SERVICE_USER_ID || 'appointment-service',
                'x-user-role': 'SERVICE'
            };
            const res = await axios.post(url, { date, timeSlot }, { headers, timeout: 5000 });
            if (res && res.data && res.data.success) return res.data.data;
            return null;
        } catch (err) {
            console.warn(`[EXTERNAL] Failed to release slot on auth-service: ${err?.message}. Falling back to local Slot model release.`);
        }

        try {
            const startDate = new Date(date);
            startDate.setHours(0,0,0,0);
            const slot = await Slot.findOneAndUpdate({ doctorId, date: startDate, timeSlot }, { $set: { isBooked: false } }, { new: true });
            return slot;
        } catch (err) {
            console.warn(`[EXTERNAL] Local slot release failed: ${err.message}`);
            return null;
        }
    }

    async sendNotification(appointment, eventType) {
        try {
            console.log(`📧 Sending ${eventType} notification for appointment ${appointment.appointmentId}`);

            const response = await axios.post(
                `${this.notificationServiceURL}/api/notifications/appointment`,
                {
                    appointment: {
                        appointmentId: appointment.appointmentId,
                        patientId: appointment.patientId,
                        patientName: appointment.patientName,
                        patientEmail: appointment.patientEmail,
                        patientPhone: appointment.patientPhone,
                        doctorId: appointment.doctorId,
                        doctorName: appointment.doctorName,
                        doctorEmail: appointment.doctorEmail,
                        doctorPhone: appointment.doctorPhone,
                        date: appointment.date,
                        timeSlot: appointment.timeSlot,
                        status: appointment.status,
                        consultationType: appointment.consultationType,
                        consultationLink: appointment.consultationLink,
                        symptoms: appointment.symptoms
                    },
                    eventType: eventType
                },
                {
                    timeout: 5000,
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            console.log(`✅ Notification sent successfully for ${eventType}`);
            return response.data;

        } catch (error) {
            console.error(`❌ Failed to send notification: ${error.message}`);
            if (error.code === 'ECONNREFUSED') {
                console.error('   Make sure notification service is running on port 3002');
            }
            return { success: false, error: error.message };
        }
    }
}

module.exports = new ExternalServices();
