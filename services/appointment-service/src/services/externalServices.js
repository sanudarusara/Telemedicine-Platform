const axios = require('axios');
const Slot = require('../models/Slot');

class ExternalServices {
    constructor() {
        // When using API Gateway, these URLs should point to gateway endpoints
        this.patientServiceURL = process.env.PATIENT_SERVICE_URL || 'http://localhost:5001';
        this.doctorServiceURL = process.env.DOCTOR_SERVICE_URL || 'http://localhost:3003';
        this.notificationServiceURL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3002';
        // Direct connection to doctor-service for slot operations (bypasses auth-service)
        this.doctorSlotsURL = process.env.DOCTOR_SLOTS_URL || 'http://doctor-service:5006/api/doctors';
    }

    // Normalise any date value (ISO string, Date object, or already YYYY-MM-DD) to "YYYY-MM-DD"
    _toDateString(date) {
        if (!date) return date;
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
        return new Date(date).toISOString().slice(0, 10);
    }
    async getPatientDetails(patientId) {
        // Try fetching the patient's profile via the API Gateway
        // The patient-management-service expects gateway-injected headers (x-gateway, x-api-key, x-user-id, x-user-role)
        try {
            const url = `${this.patientServiceURL}/profile`;
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
            const res = await axios.get(url, { headers, timeout: 10000 });
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
                            const ares = await axios.get(authUrl, { headers: aheaders, timeout: 10000 });
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
            // First try internal auth-service doctor endpoint via API Gateway (preferred)
            const gatewayBase = process.env.GATEWAY_URL || process.env.GATEWAY_BASE || 'http://api-gateway:5400';
            const gatewayAuthUrl = `${gatewayBase}/api/auth/doctors/${doctorId}`;
            const gHeaders = {
                'Content-Type': 'application/json',
                'x-gateway': 'true',
                'x-api-key': process.env.INTERNAL_API_KEY || 'gateway-secret-key-change-in-production',
                'x-user-id': process.env.SERVICE_USER_ID || 'appointment-service',
                'x-user-role': 'SERVICE'
            };
            try {
                console.log(`[EXTERNAL] Attempting to fetch doctor ${doctorId} from auth via gateway ${gatewayAuthUrl}`);
                const gres = await axios.get(gatewayAuthUrl, { headers: gHeaders, timeout: 10000 });
                if (gres && gres.data && gres.data.data) {
                    console.log(`[EXTERNAL] Retrieved doctor ${doctorId} from auth-service via gateway`);
                    return gres.data.data;
                }
            } catch (gerr) {
                console.warn(`[EXTERNAL] Gateway auth-service doctor fetch failed: ${gerr.message}`);
            }
            // Call through API Gateway at /api/doctors/{doctorId}
            const url = `${this.doctorServiceURL}/${doctorId}`;
            const headers = {
                'Content-Type': 'application/json',
                'x-gateway': 'true',
                'x-api-key': process.env.INTERNAL_API_KEY || 'gateway-secret-key-change-in-production',
                'x-user-id': process.env.SERVICE_USER_ID || 'appointment-service',
                'x-user-role': 'SERVICE'
            };
            console.log(`[EXTERNAL] Fetching doctor ${doctorId} from ${url}`);
            const res = await axios.get(url, { headers, timeout: 10000 });
            if (res && res.data && res.data.data) return res.data.data;
            console.warn(`[EXTERNAL] Unexpected response when fetching doctor ${doctorId}: ${JSON.stringify(res?.data)}`);
        } catch (err) {
            console.warn(`[EXTERNAL] Failed to fetch doctor from service: ${err?.response?.status} ${err?.response?.data ? JSON.stringify(err.response.data) : err.message}. Falling back to mock.`);
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
            if (date) params.date = date;

            // Use the configured doctor service URL (auth-service exposes /doctors)
            const url = `${this.doctorServiceURL}`;
            const headers = {
                'Content-Type': 'application/json',
                'x-gateway': 'true',
                'x-api-key': process.env.INTERNAL_API_KEY || 'gateway-secret-key-change-in-production',
                'x-user-id': process.env.SERVICE_USER_ID || 'appointment-service',
                'x-user-role': 'SERVICE'
            };
            console.log(`[EXTERNAL] Searching doctors from ${url} params=${JSON.stringify(params)}`);
            const res = await axios.get(url, { headers, params, timeout: 10000 });
            if (res && res.data && Array.isArray(res.data.data)) return res.data.data;
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
            date = this._toDateString(date);
            // Use doctor-service direct slot API (stores in doctor-service MongoDB)
            const url = `${this.doctorSlotsURL}/${doctorId}/available-slots`;
            const headers = {
                'Content-Type': 'application/json',
                'x-api-key': process.env.INTERNAL_API_KEY || 'gateway-secret-key-change-in-production',
            };
            const res = await axios.get(url, { headers, params: { date }, timeout: 10000 });
            if (res && res.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
                return res.data.data.filter(s => !s.isBooked).map(s => s.timeSlot);
            } else {
                console.warn(`[EXTERNAL] doctor-service returned no slots for ${doctorId} on ${date}`);
                return [];
            }
        } catch (err) {
            console.warn(`[EXTERNAL] Failed to fetch slots from doctor-service: ${err?.message}. Returning empty.`);
            return [];
        }
    }

    async checkAvailability(doctorId, date, timeSlot) {
        try {
            if (!date) return false;
            date = this._toDateString(date);
            // Use doctor-service direct slot API
            const url = `${this.doctorSlotsURL}/${doctorId}/available-slots`;
            const headers = {
                'Content-Type': 'application/json',
                'x-api-key': process.env.INTERNAL_API_KEY || 'gateway-secret-key-change-in-production',
            };
            const res = await axios.get(url, { headers, params: { date }, timeout: 10000 });
            if (res && res.data && Array.isArray(res.data.data)) {
                const slot = res.data.data.find(s => s.timeSlot === timeSlot);
                return !!slot && !slot.isBooked;
            }
        } catch (err) {
            console.warn(`[EXTERNAL] Failed to check availability from doctor-service: ${err?.message}. Defaulting to available.`);
        }
        return true;
    }

    async reserveDoctorSlot(doctorId, date, timeSlot) {
        try {
            date = this._toDateString(date);
            // Use doctor-service direct slot API
            const url = `${this.doctorSlotsURL}/${doctorId}/slots/reserve`;
            const headers = {
                'Content-Type': 'application/json',
                'x-api-key': process.env.INTERNAL_API_KEY || 'gateway-secret-key-change-in-production',
            };
            const res = await axios.post(url, { date, timeSlot }, { headers, timeout: 10000 });
            if (res && res.data && res.data.success) return res.data.data;
            return null;
        } catch (err) {
            console.warn(`[EXTERNAL] Failed to reserve slot on doctor-service: ${err?.message}`);
            return null;
        }
    }

    async releaseDoctorSlot(doctorId, date, timeSlot) {
        try {
            date = this._toDateString(date);
            // Use doctor-service direct slot API
            const url = `${this.doctorSlotsURL}/${doctorId}/slots/release`;
            const headers = {
                'Content-Type': 'application/json',
                'x-api-key': process.env.INTERNAL_API_KEY || 'gateway-secret-key-change-in-production',
            };
            const res = await axios.post(url, { date, timeSlot }, { headers, timeout: 10000 });
            if (res && res.data && res.data.success) return res.data.data;
            return null;
        } catch (err) {
            console.warn(`[EXTERNAL] Failed to release slot on doctor-service: ${err?.message}`);
            return null;
        }
    }

    // services/appointment-service/src/services/externalServices.js (sendNotification method only)
async sendNotification(appointment, eventType) {
    try {
        console.log(`📧 Sending ${eventType} notification for appointment ${appointment.appointmentId}`);
        
        // Map event types
        let notificationEventType = eventType;
        if (eventType === 'created') notificationEventType = 'created';
        else if (eventType === 'confirmed') notificationEventType = 'confirmed';
        else if (eventType === 'cancelled') notificationEventType = 'cancelled';
        else if (eventType === 'rescheduled') notificationEventType = 'rescheduled';
        
        // notificationServiceURL may already include the '/api/notifications' prefix (gateway).
        // Append only '/appointment' to avoid double '/api/notifications/api/notifications' paths.
        const url = `${this.notificationServiceURL.replace(/\/$/, '')}/appointment`;
        
        // Send appointment data with proper names
        const payload = {
            appointmentId: appointment.appointmentId,
            eventType: notificationEventType,
            appointment: {
                appointmentId: appointment.appointmentId,
                patientId: appointment.patientId,
                patientName: appointment.patientName, // This should be actual name
                patientEmail: appointment.patientEmail,
                patientPhone: appointment.patientPhone,
                doctorId: appointment.doctorId,
                doctorName: appointment.doctorName, // This should be actual name
                doctorEmail: appointment.doctorEmail,
                doctorPhone: appointment.doctorPhone,
                specialty: appointment.specialty,
                date: appointment.date,
                timeSlot: appointment.timeSlot,
                status: appointment.status,
                consultationType: appointment.consultationType,
                consultationLink: appointment.consultationLink,
                symptoms: appointment.symptoms,
                notes: appointment.notes
            }
        };
        
        console.log(`[NOTIFICATION] Sending to patient: ${appointment.patientName}`);
        console.log(`[NOTIFICATION] Doctor: ${appointment.doctorName}`);
        
        const response = await axios.post(url, payload, {
            timeout: 10000,
            headers: { 
                'Content-Type': 'application/json',
                'x-gateway': 'true',
                'x-api-key': process.env.INTERNAL_API_KEY || 'gateway-secret-key-change-in-production',
                'x-user-id': process.env.SERVICE_USER_ID || 'appointment-service',
                'x-user-role': 'SERVICE'
            }
        });
        
        console.log(`✅ Notification sent successfully for ${eventType}`);
        return response.data;
        
    } catch (error) {
        console.error(`❌ Failed to send notification: ${error.message}`);
        if (error.response) {
            console.error(`   Response status: ${error.response.status}`);
            console.error(`   Response data:`, error.response.data);
        }
        return { success: false, error: error.message };
    }
}
}

module.exports = new ExternalServices();
