const axios = require('axios');

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
                return res.data.data;
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
        console.log(`[MOCK] Fetching doctor details for ID: ${doctorId}`);
        const mockDoctors = {
            'DOC001': { id: 'DOC001', name: 'Dr. Sarah Johnson', specialty: 'Cardiologist', fee: 2500, email: 'sarah@gmail.com', phone: '+94729911398' },
            'DOC002': { id: 'DOC002', name: 'Dr. Michael Chen', specialty: 'Dermatologist', fee: 2000, email: 'michael@gmail.com', phone: '+94729911398' },
            'DOC003': { id: 'DOC003', name: 'Dr. Amanda Perera', specialty: 'General Physician', fee: 1500, email: 'amanda@gmail.com', phone: '+94729911398' },
            'default': { id: doctorId, name: 'Dr. Default', specialty: 'General Medicine', fee: 1500, email: 'default@gmail.com', phone: '+94729911398' }
        };
        return mockDoctors[doctorId] || mockDoctors.default;
    }

    async searchDoctors(specialty, name, date) {
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
        console.log(`[MOCK] Getting available slots for doctor ${doctorId} on ${date}`);
        const allSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];
        return allSlots;
    }

    async checkAvailability(doctorId, date, timeSlot) {
        console.log(`[MOCK] Checking availability for doctor ${doctorId} on ${date} at ${timeSlot}`);
        return true;
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
