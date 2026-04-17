const appointmentService = require('../services/appointmentService');
const PDFDocument = require('pdfkit');
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

      // Prefer using the logged-in user's name for patientName when available
      if (!appointmentData.patientName) {
        const headerName = req.headers['x-user-name'] || req.headers['x-user-name']?.toString() || null;
        if (headerName && String(headerName).trim()) {
          appointmentData.patientName = String(headerName).trim();
        } else if (req.user && (req.user.name || req.user.fullName || req.user.full_name || req.user.displayName)) {
          appointmentData.patientName = req.user.name || req.user.fullName || req.user.full_name || req.user.displayName;
        }
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
      const { status, paymentStatus } = req.body;

      const appointment = await appointmentService.getAppointmentById(req.params.id);

      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      if (status) {
        appointment.status = status;
      }

      if (paymentStatus) {
        appointment.paymentStatus = paymentStatus;
      }

      await appointment.save();

      res.json({
        success: true,
        message: "Appointment updated successfully",
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

  async downloadAppointmentReceipt(req, res, next) {
    try {
      const appointment = await appointmentService.getAppointmentById(req.params.id);

      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      if (appointment.paymentStatus !== "paid") {
        return res.status(400).json({ error: "Payment not completed yet" });
      }

      const doc = new PDFDocument({
        size: "A4",
        margin: 50
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=receipt-${appointment.appointmentId}.pdf`
      );

      doc.pipe(res);

      const formatDate = (date) => {
        return new Date(date).toLocaleDateString("en-LK", {
          year: "numeric",
          month: "long",
          day: "numeric"
        });
      };

      const formatDateTime = (date) => {
        return new Date(date).toLocaleString("en-LK", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      };

      const drawRow = (label, value, y) => {
        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .fillColor("#1f2937")
          .text(label, 60, y, { width: 170 });

        doc
          .font("Helvetica")
          .fontSize(11)
          .fillColor("#4b5563")
          .text(value || "-", 220, y, { width: 320 });
      };

      // Background header band
      doc
        .rect(0, 0, doc.page.width, 115)
        .fill("#0f172a");

      // Header
      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(24)
        .text("Payment Receipt", 50, 35);

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#cbd5e1")
        .text("Telemedicine Appointment System", 50, 68);

      doc
        .font("Helvetica")
        .fontSize(10)
        .text(`Receipt No: ${appointment.appointmentId}`, 380, 40, { align: "right" })
        .text(`Generated: ${formatDateTime(new Date())}`, 330, 58, { align: "right" });

      // Status badge
      doc
        .roundedRect(50, 130, 110, 26, 8)
        .fill("#dcfce7");

      doc
        .fillColor("#166534")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("PAID", 88, 138);

      // Intro text
      doc
        .fillColor("#111827")
        .font("Helvetica-Bold")
        .fontSize(16)
        .text("Appointment Payment Confirmation", 50, 180);

      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor("#6b7280")
        .text(
          "This document confirms that the following appointment payment has been successfully completed.",
          50,
          205,
          { width: 500, lineGap: 2 }
        );

      // Main details box
      doc
        .roundedRect(50, 245, 495, 255, 12)
        .lineWidth(1)
        .strokeColor("#e5e7eb")
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor("#111827")
        .text("Appointment Details", 65, 262);

      let y = 295;
      const gap = 24;

      drawRow("Appointment ID", appointment.appointmentId, y); y += gap;
      drawRow("Patient Name", appointment.patientName, y); y += gap;
      drawRow("Patient Email", appointment.patientEmail, y); y += gap;
      drawRow("Doctor Name", appointment.doctorName, y); y += gap;
      drawRow("Doctor Email", appointment.doctorEmail, y); y += gap;
      drawRow("Specialty", appointment.specialty, y); y += gap;
      drawRow("Consultation Type", appointment.consultationType, y); y += gap;
      drawRow("Appointment Date", formatDate(appointment.date), y); y += gap;
      drawRow("Time Slot", appointment.timeSlot, y); y += gap;
      drawRow("Appointment Status", appointment.status, y); y += gap;
      drawRow("Payment Status", appointment.paymentStatus, y);

      // Amount box
      doc
        .roundedRect(50, 525, 495, 85, 12)
        .fill("#f8fafc");

      doc
        .fillColor("#475569")
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("Total Amount Paid", 65, 545);

      doc
        .fillColor("#0f172a")
        .font("Helvetica-Bold")
        .fontSize(26)
        .text(`LKR ${Number(appointment.paymentAmount || 0).toFixed(2)}`, 65, 565);

      // Footer note
      doc
        .moveTo(50, 640)
        .lineTo(545, 640)
        .strokeColor("#e5e7eb")
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#6b7280")
        .text(
          "This is a system-generated receipt and does not require a signature.",
          50,
          655,
          { align: "center", width: 495 }
        );

      doc
        .fontSize(9)
        .fillColor("#94a3b8")
        .text(
          `Created on ${formatDateTime(new Date())}`,
          50,
          675,
          { align: "center", width: 495 }
        );

      doc.end();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AppointmentController();
