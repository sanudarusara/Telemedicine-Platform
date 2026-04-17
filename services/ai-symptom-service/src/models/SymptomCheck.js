const mongoose = require("mongoose");

const symptomCheckSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: false,
      default: null,
    },
    symptoms: {
      type: [String],
      required: true,
    },
    age: {
      type: Number,
    },
    gender: {
      type: String,
    },
    duration: {
      type: String,
    },
    additionalNotes: {
      type: String,
    },
    aiResponse: {
      type: String,
    },
    suggestedCondition: {
      type: String,
    },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "LOW",
    },
    possibleCauses: [String],
    recommendations: [String],

    recommendedDoctorType: {
      type: String,
      default: "General Physician",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SymptomCheck", symptomCheckSchema);