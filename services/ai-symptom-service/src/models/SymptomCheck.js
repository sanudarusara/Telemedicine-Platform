const mongoose = require("mongoose");

const symptomCheckSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("SymptomCheck", symptomCheckSchema);