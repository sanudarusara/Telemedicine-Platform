const appointmentService = require('../services/appointmentService');
const {
  validateAppointment,
  validateStatusUpdate,
  validateReschedule,
  validateSearch
} = require('../utils/validators');
const path = require('path');
const fs = require('fs');

class AppointmentController {
  // Search doctors by specialty
  async searchDoctors(req, res, next) {
    try {
      const { specialty, name, date } = req.query;
            
      const { error } = validateSearch({ specialty, name, date });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
            
      const doctors = await appointmentService.searchDoctors(specialty, name, date);
            
      res.json({
        success: true,
        count: doctors.length,
        data: doctors
      });
    } catch (error) {
      next(error);
    }
  }
    
  // Get available time slots for a doctor
  async getAvailableSlots(req, res, next) {
    try {
      const { doctorId, date } = req.query;
            
      if (!doctorId || !date) {
        return res.status(400).json({ error: 'doctorId and date are required' });
      }
            
      const slots = await appointmentService.getAvailableSlots(doctorId, date);
            
      res.json({
        success: true,
        doctorId: doctorId,
        date: date,
        data: slots
      });
    } catch (error) {
      next(error);
    }
  }
    
  // Book a new appointment
  async bookAppointment(req, res, next) {
    try {
      // Merge file metadata (if uploaded) into appointment data
      const appointmentData = Object.assign({}, req.body);
      if (req.file) {
        appointmentData.reportFile = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          path: req.file.path
        };
      }

      // If patientId wasn't supplied in the body, try common fallback sources
      if (!appointmentData.patientId) {
        const headerId = req.headers['x-user-id'] || req.headers['x-user'] || null;
        if (headerId) appointmentData.patientId = headerId;
        else if (req.user && (req.user._id || req.user.id)) appointmentData.patientId = req.user._id || req.user.id;
        // try different casing that clients might send
        else if (appointmentData.patientid) appointmentData.patientId = appointmentData.patientid;
        else if (appointmentData.userId) appointmentData.patientId = appointmentData.userId;
      }

      // Joi schema does not include file objects; validate only the expected fields
      const dataToValidate = Object.assign({}, appointmentData);
      if (dataToValidate.reportFile) delete dataToValidate.reportFile;
      const { error } = validateAppointment(dataToValidate);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const appointment = await appointmentService.bookAppointment(appointmentData);
            
      res.status(201).json({
        success: true,
        message: 'Appointment booked successfully',
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  }
    
  // Get all appointments
  async getAllAppointments(req, res, next) {
    try {
      const { patientId, doctorId, status } = req.query;
            
      const appointments = await appointmentService.getAllAppointments({
        patientId,
        doctorId,
        status
      });
            
      res.json({
        success: true,
        count: appointments.length,
        data: appointments
      });
    } catch (error) {
      next(error);
    }
  }
    
  // Get appointment by ID
  async getAppointmentById(req, res, next) {
    try {
      const appointment = await appointmentService.getAppointmentById(req.params.id);
            
      res.json({
        success: true,
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  }

  // List uploaded reports for an appointment
  async getAppointmentReports(req, res, next) {
    try {
      const appointment = await appointmentService.getAppointmentById(req.params.id);
      // auth check: allow only patient or doctor
      const requester = (req.user && (req.user._id || req.user.id)) || req.headers['x-user-id'] || req.headers['x-user'] || null;
      if (!requester) return res.status(401).json({ error: 'Authentication required' });
      if (String(requester) !== String(appointment.patientId) && String(requester) !== String(appointment.doctorId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const reports = (appointment && appointment.reports) ? appointment.reports : [];
      res.json({ success: true, count: reports.length, data: reports });
    } catch (error) {
      next(error);
    }
  }

  // Download a specific report file by stored filename
  async downloadReport(req, res, next) {
    try {
      const { id, filename } = req.params;
      const appointment = await appointmentService.getAppointmentById(id);
      // auth check: allow only patient or doctor
      const requester = (req.user && (req.user._id || req.user.id)) || req.headers['x-user-id'] || req.headers['x-user'] || null;
      if (!requester) return res.status(401).json({ error: 'Authentication required' });
      if (String(requester) !== String(appointment.patientId) && String(requester) !== String(appointment.doctorId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const reports = (appointment && appointment.reports) ? appointment.reports : [];
      const report = reports.find(r => r.filename === filename || r.filename === decodeURIComponent(filename));
      if (!report) return res.status(404).json({ error: 'Report not found' });

      const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'reports');
      const resolved = path.resolve(report.path || path.join(uploadsDir, report.filename));
      const resolvedDir = path.resolve(uploadsDir);
      if (!resolved.startsWith(resolvedDir)) {
        return res.status(400).json({ error: 'Invalid report path' });
      }

      if (!fs.existsSync(resolved)) return res.status(404).json({ error: 'File not found on disk' });

      return res.download(resolved, report.originalName || report.filename);
    } catch (error) {
      next(error);
    }
  }
    
  // Update appointment status
  async updateAppointmentStatus(req, res, next) {
    try {
      const { error } = validateStatusUpdate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
            
      const appointment = await appointmentService.updateAppointmentStatus(
        req.params.id,
        req.body.status,
        req.body.notes
      );
            
      res.json({
        success: true,
        message: `Appointment status updated to ${req.body.status}`,
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  }
    
  // Cancel appointment
  async cancelAppointment(req, res, next) {
    try {
      const { reason } = req.body;
            
      const appointment = await appointmentService.cancelAppointment(
        req.params.id,
        reason
      );
            
      res.json({
        success: true,
        message: 'Appointment cancelled successfully',
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  }
    
  // Reschedule appointment
  async rescheduleAppointment(req, res, next) {
    try {
      const { error } = validateReschedule(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
            
      const appointment = await appointmentService.rescheduleAppointment(
        req.params.id,
        req.body.newDate,
        req.body.newTimeSlot,
        req.body.reason
      );
            
      res.json({
        success: true,
        message: 'Appointment rescheduled successfully',
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  }
    
  // Get upcoming appointments for patient
  async getUpcomingAppointments(req, res, next) {
    try {
      const { patientId } = req.params;
            
      const appointments = await appointmentService.getUpcomingAppointments(patientId);
            
      res.json({
        success: true,
        count: appointments.length,
        data: appointments
      });
    } catch (error) {
      next(error);
    }
  }
    
  // Get pending appointments for doctor
  async getPendingAppointmentsForDoctor(req, res, next) {
    try {
      const { doctorId } = req.params;
            
      const appointments = await appointmentService.getPendingAppointmentsForDoctor(doctorId);
            
      res.json({
        success: true,
        count: appointments.length,
        data: appointments
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AppointmentController();
