const SymptomCheck = require("../models/SymptomCheck");
const { analyzeSymptoms } = require("../services/aiService");

const submitSymptoms = async (req, res) => {
  try {
    const { userId, symptoms, age, gender, duration, additionalNotes } = req.body;

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json({ message: "userId and symptoms are required" });
    }

    const result = await analyzeSymptoms({
      symptoms,
      age,
      gender,
      duration,
      additionalNotes,
    });

    const symptomCheck = await SymptomCheck.create({
      userId: userId || null,
      symptoms,
      age,
      gender,
      duration,
      additionalNotes,
      aiResponse: result.aiResponse,
      suggestedCondition: result.suggestedCondition,
      severity: result.severity,
      possibleCauses: result.possibleCauses,
      recommendations: result.recommendations,
      recommendedDoctorType: result.recommendedDoctorType,
    });

    res.status(201).json(symptomCheck);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllChecks = async (req, res) => {
  try {
    const checks = await SymptomCheck.find().sort({ createdAt: -1 });
    res.json(checks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCheckById = async (req, res) => {
  try {
    const check = await SymptomCheck.findById(req.params.id);

    if (!check) {
      return res.status(404).json({ message: "Record not found" });
    }

    res.json(check);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  submitSymptoms,
  getAllChecks,
  getCheckById,
};