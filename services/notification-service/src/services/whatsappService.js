const twilio = require('twilio');

class WhatsAppService {
    constructor() {
        this.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
        this.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
        this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
        
        if (this.twilioAccountSid && this.twilioAuthToken) {
            this.client = twilio(this.twilioAccountSid, this.twilioAuthToken);
            console.log('📱 Twilio WhatsApp service initialized');
            console.log(`   From: ${this.whatsappNumber}`);
        } else {
            console.log('⚠️  Twilio not configured - using mock WhatsApp');
            this.client = null;
        }
    }

    async sendWhatsApp(phoneNumber, message) {
        if (this.client) {
            return await this.sendViaWhatsApp(phoneNumber, message);
        }
        return await this.sendMockWhatsApp(phoneNumber, message);
    }

    async sendViaWhatsApp(phoneNumber, message) {
        try {
            let toNumber = phoneNumber;
            if (!toNumber.includes('whatsapp:')) {
                toNumber = `whatsapp:${toNumber}`;
            }
            
            console.log(`📱 Sending WhatsApp via Twilio:`);
            console.log(`   From: ${this.whatsappNumber}`);
            console.log(`   To: ${toNumber}`);
            console.log(`   Message length: ${message.length} chars`);
            
            const result = await this.client.messages.create({
                body: message,
                from: this.whatsappNumber,
                to: toNumber
            });
            
            console.log(`✅ WhatsApp message sent!`);
            console.log(`   SID: ${result.sid}`);
            console.log(`   Status: ${result.status}`);
            
            return {
                success: true,
                provider: 'twilio-whatsapp',
                messageId: result.sid,
                status: result.status
            };
            
        } catch (error) {
            console.error('❌ WhatsApp error:', error.message);
            if (error.code === 63016) {
                console.error('   📱 Recipient not joined to sandbox!');
                console.error('   They need to send "join season-shoe" to +14155238886 on WhatsApp');
            }
            return {
                success: false,
                provider: 'twilio-whatsapp',
                error: error.message,
                code: error.code
            };
        }
    }

    async sendMockWhatsApp(phoneNumber, message) {
        console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
        console.log(`║  📱 MOCK WHATSAPP MESSAGE                                    ║`);
        console.log(`╠══════════════════════════════════════════════════════════════╣`);
        console.log(`║  To: ${phoneNumber}`);
        console.log(`║  Message: ${message.substring(0,200)}${message.length > 200 ? '...' : ''}`);
        console.log(`╚══════════════════════════════════════════════════════════════╝\n`);
        
        return {
            success: true,
            provider: 'mock',
            messageId: `mock-${Date.now()}`
        };
    }

    getAppointmentCreatedMessage(appointment, userType) {
        const isPatient = userType === 'patient';
        const name = isPatient ? appointment.patientName : appointment.doctorName;
        const otherParty = isPatient ? appointment.doctorName : appointment.patientName;
        const date = new Date(appointment.date).toLocaleString();
        
        let message = `🏥 *HEALTHCARE PLATFORM*\n\n`;
        message += `Hello *${name}*! 👋\n\n`;
        message += `✅ Your appointment has been *successfully booked*!\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `📋 *APPOINTMENT DETAILS*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `👤 *With:* ${otherParty}\n`;
        message += `📅 *Date:* ${date}\n`;
        message += `⏰ *Time:* ${appointment.timeSlot}\n`;
        message += `🎥 *Type:* ${appointment.consultationType === 'video' ? 'Video Consultation 📹' : 'Clinic Visit 🏥'}\n`;
        
        if (appointment.symptoms) {
            message += `🤒 *Symptoms:* ${appointment.symptoms}\n`;
        }
        
        message += `📌 *Status:* ${appointment.status.toUpperCase()}\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        if (appointment.consultationLink) {
            message += `🔗 *Join Consultation:*\n${appointment.consultationLink}\n\n`;
        }
        
        message += `_Need to reschedule or cancel? Log in to your account._\n\n`;
        message += `💚 *Healthcare Platform* - Caring for your health`;
        
        return message;
    }

    getAppointmentStatusUpdateMessage(appointment, userType, newStatus) {
        const isPatient = userType === 'patient';
        const name = isPatient ? appointment.patientName : appointment.doctorName;
        
        let statusEmoji = '';
        let statusText = '';
        switch(newStatus) {
            case 'confirmed':
                statusEmoji = '✅';
                statusText = 'CONFIRMED';
                break;
            case 'cancelled':
                statusEmoji = '❌';
                statusText = 'CANCELLED';
                break;
            case 'completed':
                statusEmoji = '🎉';
                statusText = 'COMPLETED';
                break;
            default:
                statusEmoji = '📌';
                statusText = newStatus.toUpperCase();
        }
        
        let message = `🏥 *HEALTHCARE PLATFORM*\n\n`;
        message += `Hello *${name}*! 👋\n\n`;
        message += `Your appointment status has been ${statusEmoji} *${statusText}*\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `📋 *APPOINTMENT DETAILS*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `👨‍⚕️ *Doctor:* Dr. ${appointment.doctorName}\n`;
        message += `👤 *Patient:* ${appointment.patientName}\n`;
        message += `📅 *Date:* ${new Date(appointment.date).toLocaleDateString()}\n`;
        message += `⏰ *Time:* ${appointment.timeSlot}\n`;
        message += `📌 *New Status:* ${statusEmoji} ${statusText}\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        if (newStatus === 'confirmed' && appointment.consultationLink) {
            message += `🔗 *Join Consultation:*\n${appointment.consultationLink}\n\n`;
        }
        
        message += `💚 *Healthcare Platform* - Thank you for choosing us!`;
        
        return message;
    }
}

module.exports = new WhatsAppService();
