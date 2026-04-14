const Appointment = require('../models/Appointment');
const externalServices = require('./externalServices');
const { v4: uuidv4 } = require('uuid');

// Kafka event publishing
const { createEvent } = require('../../shared/kafka/eventFactory');
const TOPICS = require('../../shared/kafka/topics');
const EVENTS = require('../../shared/kafka/events');
const kafka = require('../kafka');

class AppointmentService {
  /**
   * Search for doctors by specialty
   */
  async searchDoctors(specialty, name, date) {
    const doctors = await externalServices.searchDoctors(specialty, name, date);
        
    if (date && doctors.length > 0) {
      for (let doctor of doctors) {
        doctor.availableSlots = await externalServices.getAvailableSlots(doctor.id, date);
      }
    }
        
    return doctors;
  }

  /**
   * Get available time slots for a specific doctor
   */
  async getAvailableSlots(doctorId, date) {
    const doctor = await externalServices.getDoctorDetails(doctorId);
    if (!doctor) {
      throw new Error('Doctor not found');
    }
        
    const allSlots = await externalServices.getAvailableSlots(doctorId, date);
        
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
        
    const bookedAppointments = await Appointment.find({
      doctorId: doctorId,
      date: { $gte: startDate, $lte: endDate },
      status: { $nin: ['cancelled'] }
    });
        
    const bookedSlots = bookedAppointments.map(apt => apt.timeSlot);
    const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
        
    return availableSlots;
  }

  /**
   * Book a new appointment
   */
  async bookAppointment(appointmentData) {
    const patient = await externalServices.getPatientDetails(appointmentData.patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }
    // Ensure required patient fields exist (some patient profiles store minimal data).
    if (!patient.name) patient.name = patient.fullName || patient.userId || 'Patient';
    if (!patient.email) patient.email = patient.emailAddress || '';
    if (!patient.phone) patient.phone = patient.phone || '';
        
    const doctor = await externalServices.getDoctorDetails(appointmentData.doctorId);
    if (!doctor) {
      throw new Error('Doctor not found');
    }
        
    const isAvailable = await externalServices.checkAvailability(
      appointmentData.doctorId,
      appointmentData.date,
      appointmentData.timeSlot
    );
        
    if (!isAvailable) {
      throw new Error('Selected time slot is not available');
    }

    // Try to reserve the slot on doctor/auth-service (atomic). Fallbacks handled in externalServices.
    const reserved = await externalServices.reserveDoctorSlot(appointmentData.doctorId, appointmentData.date, appointmentData.timeSlot);
    if (!reserved) {
      throw new Error('Failed to reserve selected time slot (already booked)');
    }
        
    const appointmentDate = new Date(appointmentData.date);
    appointmentDate.setHours(0, 0, 0, 0);
        
    const existingAppointment = await Appointment.findOne({
      doctorId: appointmentData.doctorId,
      date: appointmentDate,
      timeSlot: appointmentData.timeSlot,
      status: { $nin: ['cancelled'] }
    });
        
    if (existingAppointment) {
      throw new Error('This time slot is already booked');
    }
        
    // Create appointment with email and phone fields
    const appointment = new Appointment({
      appointmentId: uuidv4(),
      patientId: appointmentData.patientId,
      doctorId: appointmentData.doctorId,
      doctorName: doctor.name,
      patientName: patient.name,
      patientEmail: patient.email,
      patientPhone: patient.phone,
      doctorEmail: doctor.email,
      doctorPhone: doctor.phone,
      specialty: doctor.specialty,
      date: appointmentData.date,
      timeSlot: appointmentData.timeSlot,
      consultationType: appointmentData.consultationType || 'video',
      symptoms: appointmentData.symptoms,
      notes: appointmentData.notes,
      paymentAmount: doctor.fee || appointmentData.paymentAmount || 1500,
      status: 'pending',
      paymentStatus: 'pending'
    });
        
    await appointment.save();
        
    appointment.consultationLink = `https://video.healthcare.com/room/${appointment.appointmentId}`;
    await appointment.save();

    // mark slot as booked in local Slot model if present (best-effort)
    try {
      const Slot = require('../models/Slot');
      const startDate = new Date(appointment.date);
      startDate.setHours(0,0,0,0);

      await Slot.findOneAndUpdate(
        { doctorId: appointment.doctorId, date: startDate, timeSlot: appointment.timeSlot },
        { $set: { isBooked: true } },
        { upsert: false }
      );
    } catch (err) {
      console.warn('[Slots] Failed to mark local slot booked:', err.message);
    }
        
    // 🔔 TRIGGER NOTIFICATION for appointment created
    await externalServices.sendNotification(appointment, 'created');

    // Publish Kafka event: appointment booked
    try {
      const event = createEvent({
        eventType: EVENTS.APPOINTMENT_BOOKED,
        userId: appointment.patientId,
        userRole: 'PATIENT',
        serviceName: 'appointment-service',
        description: `Appointment booked: ${appointment.appointmentId}`,
        metadata: {
          appointmentId: appointment.appointmentId,
          doctorId: appointment.doctorId,
          eventAction: 'created',
          appointment: appointment.toObject ? appointment.toObject() : appointment
        }
      });
      kafka.publish(TOPICS.APPOINTMENT_EVENTS, event).catch(() => {});
    } catch (err) {
      console.warn('[kafka] Failed to create/publish booked event', err.message);
    }

    return appointment;
  }

  /**
   * Get all appointments (with filters)
   */
  async getAllAppointments(filters = {}) {
    const query = {};
        
    if (filters.patientId) query.patientId = filters.patientId;
    if (filters.doctorId) query.doctorId = filters.doctorId;
    if (filters.status) query.status = filters.status;
        
    return await Appointment.find(query).sort({ date: -1 });
  }

  /**
   * Get appointment by ID
   */
  async getAppointmentById(id) {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new Error('Appointment not found');
    }
    return appointment;
  }

  /**
   * Get appointment by appointmentId (UUID)
   */
  async getAppointmentByAppointmentId(appointmentId) {
    const appointment = await Appointment.findOne({ appointmentId });
    if (!appointment) {
      throw new Error('Appointment not found');
    }
    return appointment;
  }

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(id, status, notes = '') {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new Error('Appointment not found');
    }
        
    const oldStatus = appointment.status;
        
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['completed', 'cancelled'],
      'cancelled': [],
      'completed': []
    };
        
    if (!validTransitions[appointment.status].includes(status)) {
      throw new Error(`Cannot change status from ${appointment.status} to ${status}`);
    }
        
    appointment.status = status;
    if (notes) appointment.notes = notes;
    if (status === 'cancelled') appointment.cancellationReason = notes;
        
    await appointment.save();
        
    // release slot on cancellation (try auth-service then local)
    if (status === 'cancelled') {
      try {
        await externalServices.releaseDoctorSlot(appointment.doctorId, appointment.date, appointment.timeSlot);
      } catch (err) {
        console.warn('[Slots] Failed to release slot on auth-service:', err.message);
      }

      try {
        const Slot = require('../models/Slot');
        const startDate = new Date(appointment.date);
        startDate.setHours(0,0,0,0);
        await Slot.findOneAndUpdate({ doctorId: appointment.doctorId, date: startDate, timeSlot: appointment.timeSlot }, { $set: { isBooked: false } });
      } catch (err) {
        console.warn('[Slots] Failed to release local slot on cancellation:', err.message);
      }
    }
        
    // 🔔 TRIGGER NOTIFICATION only if status changed
    if (oldStatus !== status) {
      await externalServices.sendNotification(appointment, 'status_updated');
      // Publish Kafka event for status change
      try {
        const eventType = status === 'cancelled' ? EVENTS.APPOINTMENT_CANCELLED : EVENTS.APPOINTMENT_BOOKED;
        const event = createEvent({
          eventType,
          userId: appointment.patientId,
          userRole: 'PATIENT',
          serviceName: 'appointment-service',
          description: `Appointment ${status}: ${appointment.appointmentId}`,
          metadata: {
            appointmentId: appointment.appointmentId,
            newStatus: status,
            eventAction: status === 'cancelled' ? 'cancelled' : 'status_updated',
            appointment: appointment.toObject ? appointment.toObject() : appointment
          }
        });
        kafka.publish(TOPICS.APPOINTMENT_EVENTS, event).catch(() => {});
      } catch (err) {
        console.warn('[kafka] Failed to publish status change event', err.message);
      }
    }
        
    return appointment;
  }

  /**
   * Cancel appointment
   */
  async cancelAppointment(id, reason = '') {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new Error('Appointment not found');
    }
        
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      throw new Error(`Cannot cancel appointment with status: ${appointment.status}`);
    }
        
    const appointmentTime = new Date(appointment.date);
    const now = new Date();
    const hoursDiff = (appointmentTime - now) / (1000 * 60 * 60);
        
    if (hoursDiff < 1) {
      throw new Error('Appointments must be cancelled at least 1 hour before the scheduled time');
    }
        
    appointment.status = 'cancelled';
    appointment.cancellationReason = reason;
    await appointment.save();
        
    // 🔔 TRIGGER NOTIFICATION for cancellation
    await externalServices.sendNotification(appointment, 'cancelled');
        
    // Publish Kafka event: appointment cancelled
    try {
      const event = createEvent({
        eventType: EVENTS.APPOINTMENT_CANCELLED,
        userId: appointment.patientId,
        userRole: 'PATIENT',
        serviceName: 'appointment-service',
        description: `Appointment cancelled: ${appointment.appointmentId}`,
        metadata: {
          appointmentId: appointment.appointmentId,
          reason,
          eventAction: 'cancelled',
          appointment: appointment.toObject ? appointment.toObject() : appointment
        }
      });
      kafka.publish(TOPICS.APPOINTMENT_EVENTS, event).catch(() => {});
    } catch (err) {
      console.warn('[kafka] Failed to publish cancelled event', err.message);
    }
        
    return appointment;
  }

  /**
   * Reschedule appointment
   */
  async rescheduleAppointment(id, newDate, newTimeSlot, reason = '') {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new Error('Appointment not found');
    }
        
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      throw new Error(`Cannot reschedule appointment with status: ${appointment.status}`);
    }
        
    const isAvailable = await externalServices.checkAvailability(
      appointment.doctorId,
      newDate,
      newTimeSlot
    );
        
    if (!isAvailable) {
      throw new Error('Selected time slot is not available');
    }
        
    const appointmentDate = new Date(newDate);
    appointmentDate.setHours(0, 0, 0, 0);
        
    const existingAppointment = await Appointment.findOne({
      doctorId: appointment.doctorId,
      date: appointmentDate,
      timeSlot: newTimeSlot,
      status: { $nin: ['cancelled'] },
      _id: { $ne: id }
    });
        
    if (existingAppointment) {
      throw new Error('This time slot is already booked');
    }

    // capture old slot
    const oldDate = appointment.date;
    const oldTimeSlot = appointment.timeSlot;

    // Reserve new slot atomically via auth-service (with local fallback)
    const reserved = await externalServices.reserveDoctorSlot(appointment.doctorId, newDate, newTimeSlot);
    if (!reserved) {
      throw new Error('Failed to reserve the new time slot (already booked)');
    }

    // Update appointment record
    appointment.date = newDate;
    appointment.timeSlot = newTimeSlot;
    appointment.status = 'pending';
    appointment.notes = reason || appointment.notes;
    await appointment.save();

    // Release old slot in auth-service (best-effort), and update local slot records
    try {
      await externalServices.releaseDoctorSlot(appointment.doctorId, oldDate, oldTimeSlot);
    } catch (err) {
      console.warn('[Slots] Failed to release old slot on auth-service during reschedule:', err.message);
    }

    try {
      const Slot = require('../models/Slot');
      const oldDateStart = new Date(oldDate);
      oldDateStart.setHours(0,0,0,0);
      await Slot.findOneAndUpdate({ doctorId: appointment.doctorId, date: oldDateStart, timeSlot: oldTimeSlot }, { $set: { isBooked: false } });
      const newDateStart = new Date(newDate);
      newDateStart.setHours(0,0,0,0);
      await Slot.findOneAndUpdate({ doctorId: appointment.doctorId, date: newDateStart, timeSlot: newTimeSlot }, { $set: { isBooked: true } }, { upsert: false });
    } catch (err) {
      console.warn('[Slots] Failed to update local slots during reschedule:', err.message);
    }
        
    // 🔔 TRIGGER NOTIFICATION for reschedule
    await externalServices.sendNotification(appointment, 'rescheduled');
        
    // Publish Kafka event: appointment rescheduled (reuse APPOINTMENT_BOOKED)
    try {
      const event = createEvent({
        eventType: EVENTS.APPOINTMENT_BOOKED,
        userId: appointment.patientId,
        userRole: 'PATIENT',
        serviceName: 'appointment-service',
        description: `Appointment rescheduled: ${appointment.appointmentId}`,
        metadata: {
          appointmentId: appointment.appointmentId,
          newDate: appointment.date,
          newTimeSlot: appointment.timeSlot,
          eventAction: 'rescheduled',
          appointment: appointment.toObject ? appointment.toObject() : appointment
        }
      });
      kafka.publish(TOPICS.APPOINTMENT_EVENTS, event).catch(() => {});
    } catch (err) {
      console.warn('[kafka] Failed to publish rescheduled event', err.message);
    }
        
    return appointment;
  }

  /**
   * Get upcoming appointments for patient
   */
  async getUpcomingAppointments(patientId) {
    const now = new Date();
        
    return await Appointment.find({
      patientId: patientId,
      date: { $gte: now },
      status: { $in: ['pending', 'confirmed'] }
    }).sort({ date: 1 });
  }

  /**
   * Get pending appointments for doctor (needs confirmation)
   */
  async getPendingAppointmentsForDoctor(doctorId) {
    return await Appointment.find({
      doctorId: doctorId,
      status: 'pending'
    }).sort({ date: 1 });
  }
}

module.exports = new AppointmentService();
