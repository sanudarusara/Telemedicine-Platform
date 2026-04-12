const twilio = require('twilio');

class SMSService {
    constructor() {
        this.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
        this.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
        this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
        
        if (this.twilioAccountSid && this.twilioAuthToken && this.twilioPhoneNumber) {
            this.client = twilio(this.twilioAccountSid, this.twilioAuthToken);
            console.log('📱 Twilio SMS service initialized');
            console.log(`   From: ${this.twilioPhoneNumber}`);
        } else {
            console.log('⚠️  Twilio SMS not configured - using mock SMS');
            this.client = null;
        }
    }

    async sendSMS(phoneNumber, message) {
        if (this.client && this.twilioPhoneNumber) {
            return await this.sendViaTwilio(phoneNumber, message);
        }
        return await this.sendMockSMS(phoneNumber, message);
    }

    async sendViaTwilio(phoneNumber, message) {
        try {
            let formattedNumber = phoneNumber;
            if (!phoneNumber.startsWith('+')) {
                formattedNumber = `+${phoneNumber}`;
            }
            
            console.log(`📱 Sending SMS via Twilio:`);
            console.log(`   From: ${this.twilioPhoneNumber}`);
            console.log(`   To: ${formattedNumber}`);
            
            const result = await this.client.messages.create({
                body: message,
                from: this.twilioPhoneNumber,
                to: formattedNumber
            });
            
            console.log(`✅ Twilio SMS sent!`);
            console.log(`   SID: ${result.sid}`);
            console.log(`   Status: ${result.status}`);
            
            return {
                success: true,
                provider: 'twilio',
                messageId: result.sid,
                status: result.status
            };
        } catch (error) {
            console.error('❌ Twilio error:', error.message);
            if (error.code === 21608) {
                console.error('   📱 Sri Lankan numbers cannot be verified for SMS on trial accounts.');
                console.error('   💡 Use WhatsApp instead - it works with Sri Lankan numbers!');
            }
            return {
                success: false,
                provider: 'twilio',
                error: error.message,
                code: error.code
            };
        }
    }

    async sendMockSMS(phoneNumber, message) {
        console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
        console.log(`║  📱 MOCK SMS SENT                                            ║`);
        console.log(`╠══════════════════════════════════════════════════════════════╣`);
        console.log(`║  To: ${phoneNumber}`);
        console.log(`║  Message: ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}`);
        console.log(`╚══════════════════════════════════════════════════════════════╝\n`);
        
        return {
            success: true,
            provider: 'mock',
            messageId: `mock-${Date.now()}`
        };
    }

    getAppointmentCreatedSMS(appointment, userType) {
        const isPatient = userType === 'patient';
        const name = isPatient ? appointment.patientName : appointment.doctorName;
        const otherParty = isPatient ? appointment.doctorName : appointment.patientName;
        const date = new Date(appointment.date).toLocaleString();
        
        return `Healthcare Platform: Hi ${name}! Your appointment with ${otherParty} on ${date} at ${appointment.timeSlot} has been booked. Status: ${appointment.status}.`;
    }

    getAppointmentStatusUpdateSMS(appointment, userType, newStatus) {
        const isPatient = userType === 'patient';
        const name = isPatient ? appointment.patientName : appointment.doctorName;
        
        let statusText = '';
        switch(newStatus) {
            case 'confirmed': statusText = 'confirmed ✅'; break;
            case 'cancelled': statusText = 'cancelled ❌'; break;
            case 'completed': statusText = 'completed 🏥'; break;
            default: statusText = newStatus;
        }
        
        return `Healthcare Platform: Hi ${name}! Your appointment with Dr. ${appointment.doctorName} on ${new Date(appointment.date).toLocaleDateString()} has been ${statusText}.`;
    }
}

module.exports = new SMSService();
