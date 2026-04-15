const Appointment = require("../models/appointment_model");

// Get all appointments for logged-in doctor
const getDoctorAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      doctorId: req.doctor._id,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ message: "Error fetching appointments" });
  }
};

// Get one appointment for logged-in doctor
const getDoctorAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (
      !appointment ||
      appointment.doctorId.toString() !== req.doctor._id.toString()
    ) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.status(200).json({ appointment });
  } catch (error) {
    console.error("Error fetching appointment:", error);
    res.status(500).json({ message: "Error fetching appointment" });
  }
};

// Accept an appointment request
const acceptAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (
      !appointment ||
      appointment.doctorId.toString() !== req.doctor._id.toString()
    ) {
      return res.status(404).json({ message: "Appointment not found" });
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

    res.status(200).json({
      message: "Appointment confirmed",
      appointment,
    });
  } catch (error) {
    console.error("Error accepting appointment:", error);
    res.status(500).json({ message: "Error accepting appointment" });
  }
};

// Reject an appointment request
const rejectAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (
      !appointment ||
      appointment.doctorId.toString() !== req.doctor._id.toString()
    ) {
      return res.status(404).json({ message: "Appointment not found" });
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

    res.status(200).json({
      message: "Appointment rejected",
      appointment,
    });
  } catch (error) {
    console.error("Error rejecting appointment:", error);
    res.status(500).json({ message: "Error rejecting appointment" });
  }
};

module.exports = {
  getDoctorAppointments,
  getDoctorAppointmentById,
  acceptAppointment,
  rejectAppointment,
};