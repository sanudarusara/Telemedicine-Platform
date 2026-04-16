const mongoose = require("mongoose");
const Appointment = require("../models/appointment_model");

const getDoctorObjectId = (req) => {
  if (!req.doctor || !req.doctor._id) return null;
  return req.doctor._id.toString();
};

// Get all appointments for logged-in doctor
const getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = getDoctorObjectId(req);

    if (!doctorId) {
      return res.status(401).json({ message: "Doctor authentication failed" });
    }

    const appointments = await Appointment.find({
      doctorId: req.doctor._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return res.status(500).json({
      message: error.message || "Error fetching appointments",
    });
  }
};

// Get one appointment for logged-in doctor
const getDoctorAppointmentById = async (req, res) => {
  try {
    const doctorId = getDoctorObjectId(req);

    if (!doctorId) {
      return res.status(401).json({ message: "Doctor authentication failed" });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid appointment id" });
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (!appointment.doctorId) {
      return res.status(400).json({
        message: "Appointment has no doctor assigned",
      });
    }

    if (appointment.doctorId.toString() !== doctorId) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.status(200).json({ appointment });
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return res.status(500).json({
      message: error.message || "Error fetching appointment",
    });
  }
};

// Accept an appointment request
const acceptAppointment = async (req, res) => {
  try {
    const doctorId = getDoctorObjectId(req);

    if (!doctorId) {
      return res.status(401).json({ message: "Doctor authentication failed" });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid appointment id" });
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (!appointment.doctorId) {
      return res.status(400).json({
        message: "Appointment has no doctor assigned",
      });
    }

    if (appointment.doctorId.toString() !== doctorId) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (appointment.status !== "pending") {
      return res.status(400).json({
        message: `Only pending appointments can be accepted. Current status: ${appointment.status}`,
      });
    }

    appointment.status = "confirmed";
    appointment.statusUpdatedAt = new Date();
    appointment.statusUpdatedBy = "doctor";

    await appointment.save();

    return res.status(200).json({
      message: "Appointment confirmed",
      appointment,
    });
  } catch (error) {
    console.error("Error accepting appointment:", error);
    return res.status(500).json({
      message: error.message || "Error accepting appointment",
    });
  }
};

// Reject an appointment request
const rejectAppointment = async (req, res) => {
  try {
    const doctorId = getDoctorObjectId(req);

    if (!doctorId) {
      return res.status(401).json({ message: "Doctor authentication failed" });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid appointment id" });
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (!appointment.doctorId) {
      return res.status(400).json({
        message: "Appointment has no doctor assigned",
      });
    }

    if (appointment.doctorId.toString() !== doctorId) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (appointment.status !== "pending") {
      return res.status(400).json({
        message: `Only pending appointments can be rejected. Current status: ${appointment.status}`,
      });
    }

    appointment.status = "cancelled";
    appointment.statusUpdatedAt = new Date();
    appointment.statusUpdatedBy = "doctor";

    await appointment.save();

    return res.status(200).json({
      message: "Appointment rejected",
      appointment,
    });
  } catch (error) {
    console.error("Error rejecting appointment:", error);
    return res.status(500).json({
      message: error.message || "Error rejecting appointment",
    });
  }
};

module.exports = {
  getDoctorAppointments,
  getDoctorAppointmentById,
  acceptAppointment,
  rejectAppointment,
};