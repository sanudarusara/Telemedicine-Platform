const mongoose = require("mongoose");
const Prescription = require("../models/prescription_model");
const Appointment = require("../models/appointment_model");

// Generate prescription number
const generatePrescriptionNo = async () => {
  const count = await Prescription.countDocuments();
  const nextNumber = count + 1;
  return `RX-${String(nextNumber).padStart(6, "0")}`;
};

// Create a prescription using appointmentNo
const createPrescription = async (req, res) => {
  try {
    const { appointmentNo, diagnosis, notes, items } = req.body;

    console.log("Create prescription body:", req.body);
    console.log("Logged doctor:", req.doctor);

    if (
      !appointmentNo ||
      !diagnosis ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message: "appointmentNo, diagnosis, and at least one item are required",
      });
    }

    const appointment = await Appointment.findOne({
      appointmentNo: appointmentNo.trim(),
    });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const existingPrescription = await Prescription.findOne({
      appointmentId: appointment._id,
    });

    if (existingPrescription) {
      return res.status(400).json({
        message: "Prescription already exists for this appointment",
      });
    }

    if (!req.doctor || !req.doctor._id) {
      return res.status(401).json({ message: "Doctor authentication failed" });
    }

    if (!appointment.doctorId) {
      return res.status(400).json({
        message: "Appointment has no doctor assigned",
      });
    }

    if (appointment.doctorId.toString() !== req.doctor._id.toString()) {
      return res.status(403).json({
        message: "You are not allowed to create a prescription for this appointment",
      });
    }

    const cleanedItems = items
      .map((item) => ({
        medicineName: item.medicineName?.trim(),
        quantity: Number(item.quantity),
      }))
      .filter(
        (item) =>
          item.medicineName &&
          item.medicineName.length > 0 &&
          item.quantity > 0
      );

    if (cleanedItems.length === 0) {
      return res.status(400).json({
        message: "At least one valid prescription item is required",
      });
    }

    const prescriptionNo = await generatePrescriptionNo();

    const prescription = new Prescription({
      prescriptionNo,
      centerId: appointment.centerId,
      doctorId: req.doctor._id,
      appointmentId: appointment._id,
      diagnosis: diagnosis.trim(),
      notes: notes?.trim() || "",
      items: cleanedItems,
      status: "issued",
    });

    await prescription.save();

    const populatedPrescription = await Prescription.findById(prescription._id)
      .populate("appointmentId")
      .populate("doctorId");

    return res.status(201).json({
      message: "Prescription created successfully",
      prescription: populatedPrescription,
    });
  } catch (error) {
    console.error("Create prescription error:", error);
    return res.status(500).json({
      message: error.message || "Error creating prescription",
    });
  }
};

// Get all prescriptions for a doctor
const getPrescriptions = async (req, res) => {
  try {
    if (!req.doctor || !req.doctor._id) {
      return res.status(401).json({ message: "Doctor authentication failed" });
    }

    const prescriptions = await Prescription.find({ doctorId: req.doctor._id })
      .populate("appointmentId")
      .sort({ createdAt: -1 });

    return res.status(200).json(prescriptions);
  } catch (error) {
    console.error("Get prescriptions error:", error);
    return res.status(500).json({
      message: error.message || "Error fetching prescriptions",
    });
  }
};

// Get one prescription by id
const getPrescriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid prescription id" });
    }

    const prescription = await Prescription.findById(id)
      .populate("appointmentId")
      .populate("doctorId");

    if (!prescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    if (!req.doctor || !req.doctor._id) {
      return res.status(401).json({ message: "Doctor authentication failed" });
    }

    const prescriptionDoctorId =
      prescription.doctorId?._id?.toString?.() ||
      prescription.doctorId?.toString?.();

    if (prescriptionDoctorId !== req.doctor._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.status(200).json(prescription);
  } catch (error) {
    console.error("Get prescription by id error:", error);
    return res.status(500).json({
      message: error.message || "Error fetching prescription",
    });
  }
};

module.exports = {
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
};