const appointmentService = require('../services/appointmentService');
const {
  validateAppointment,
  validateStatusUpdate,
  validateReschedule,
  validateSearch
} = require('../utils/validators');

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
      const { error } = validateAppointment(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
            
      const appointment = await appointmentService.bookAppointment(req.body);
            
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
