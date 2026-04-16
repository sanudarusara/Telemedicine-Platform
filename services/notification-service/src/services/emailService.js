const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        // Use Gmail SMTP with your credentials
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        
        this.transporter.verify((error, success) => {
            if (error) {
                console.error('❌ Email service connection failed:', error);
            } else {
                console.log('✅ Email service ready to send emails');
                console.log(`   Using: ${process.env.EMAIL_USER}`);
            }
        });
    }

    async sendEmail(to, subject, html, text = '') {
        try {
            const mailOptions = {
                from: `"Healthcare Platform" <${process.env.EMAIL_USER}>`,
                to: to,
                subject: subject,
                text: text || this.stripHtml(html),
                html: html
            };

            const info = await this.transporter.sendMail(mailOptions);
            
            console.log(`📧 Email sent to ${to}`);
            console.log(`   Message ID: ${info.messageId}`);
            
            return {
                success: true,
                messageId: info.messageId,
                previewUrl: null
            };
        } catch (error) {
            console.error('❌ Email sending failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '');
    }

    getAppointmentCreatedTemplate(appointment, userType) {
        const isPatient = userType === 'patient';
        const resolveName = (appt, forPatient) => {
            const rawName = forPatient ? appt.patientName : appt.doctorName;
            if (rawName && String(rawName).trim() && !String(rawName).toLowerCase().startsWith('patient')) return rawName;
            // try common fallback fields
            if (forPatient && appt.patientEmail) {
                const local = String(appt.patientEmail).split('@')[0];
                return local.replace(/\.|_|-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            }
            if (!forPatient && appt.doctorEmail) {
                const local = String(appt.doctorEmail).split('@')[0];
                return local.replace(/\.|_|-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            }
            // last resort: use id suffix
            const id = forPatient ? (appt.patientId || appt.patient_id) : (appt.doctorId || appt.doctor_id);
            if (id) return `${forPatient ? 'Patient' : 'Dr.'} ${String(id).slice(-6)}`;
            return forPatient ? 'Patient' : 'Doctor';
        };
        const name = resolveName(appointment, isPatient);
        const otherParty = isPatient ? appointment.doctorName : appointment.patientName;
        const appointmentDate = new Date(appointment.date).toLocaleString();
        
        return {
            subject: `Appointment Confirmation - ${appointmentDate}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background-color: #f9f9f9; }
                        .appointment-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; }
                        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                        .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Healthcare Platform</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${name}!</h2>
                            <p>Your appointment has been successfully booked.</p>
                            
                            <div class="appointment-details">
                                <h3>Appointment Details:</h3>
                                <p><strong>With:</strong> ${otherParty}</p>
                                <p><strong>Date:</strong> ${appointmentDate}</p>
                                <p><strong>Time Slot:</strong> ${appointment.timeSlot}</p>
                                <p><strong>Type:</strong> ${appointment.consultationType === 'video' ? 'Video Consultation' : 'Clinic Visit'}</p>
                                ${appointment.symptoms ? `<p><strong>Symptoms:</strong> ${appointment.symptoms}</p>` : ''}
                                <p><strong>Status:</strong> ${appointment.status}</p>
                            </div>
                            
                            ${appointment.consultationLink ? `
                            <div style="text-align: center; margin: 20px 0;">
                                <a href="${appointment.consultationLink}" class="button">Join Consultation</a>
                            </div>
                            ` : ''}
                            
                            <p>If you need to reschedule or cancel, please log in to your account.</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated message from Healthcare Platform. Please do not reply to this email.</p>
                            <p>&copy; 2024 Healthcare Platform. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
    }

    getAppointmentStatusUpdateTemplate(appointment, userType, newStatus) {
        const isPatient = userType === 'patient';
        const resolveName = (appt, forPatient) => {
            const rawName = forPatient ? appt.patientName : appt.doctorName;
            if (rawName && String(rawName).trim() && !String(rawName).toLowerCase().startsWith('patient')) return rawName;
            if (forPatient && appt.patientEmail) {
                const local = String(appt.patientEmail).split('@')[0];
                return local.replace(/\.|_|-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            }
            if (!forPatient && appt.doctorEmail) {
                const local = String(appt.doctorEmail).split('@')[0];
                return local.replace(/\.|_|-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            }
            const id = forPatient ? (appt.patientId || appt.patient_id) : (appt.doctorId || appt.doctor_id);
            if (id) return `${forPatient ? 'Patient' : 'Dr.'} ${String(id).slice(-6)}`;
            return forPatient ? 'Patient' : 'Doctor';
        };
        const name = resolveName(appointment, isPatient);
        
        let statusMessage = '';
        switch(newStatus) {
            case 'confirmed':
                statusMessage = 'confirmed! Your appointment has been accepted.';
                break;
            case 'cancelled':
                statusMessage = 'cancelled.';
                break;
            case 'completed':
                statusMessage = 'completed. Thank you for using our service!';
                break;
            default:
                statusMessage = `updated to ${newStatus}.`;
        }
        
        return {
            subject: `Appointment ${newStatus} - ${new Date(appointment.date).toLocaleDateString()}`,
            html: `
                <div style="font-family: Arial, sans-serif;">
                    <h2>Hello ${name}!</h2>
                    <p>Your appointment status has been ${statusMessage}</p>
                    <div style="background-color: #f0f0f0; padding: 15px; margin: 15px 0;">
                        <p><strong>Doctor:</strong> ${appointment.doctorName}</p>
                        <p><strong>Patient:</strong> ${appointment.patientName}</p>
                        <p><strong>Date:</strong> ${new Date(appointment.date).toLocaleString()}</p>
                        <p><strong>New Status:</strong> ${newStatus}</p>
                    </div>
                </div>
            `
        };
    }
}

module.exports = new EmailService();