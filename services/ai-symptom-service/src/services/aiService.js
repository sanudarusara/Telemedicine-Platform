const analyzeSymptoms = async ({ symptoms, age, gender, duration, additionalNotes }) => {
  const symptomText = symptoms.join(", ").toLowerCase();

  let suggestedCondition = "General Viral Infection";
  let severity = "LOW";
  let aiResponse = "Your symptoms may indicate a mild viral condition. Please rest, stay hydrated, and consult a doctor if symptoms worsen.";

  if (symptomText.includes("chest pain") || symptomText.includes("shortness of breath")) {
    suggestedCondition = "Possible Cardiac or Respiratory Issue";
    severity = "HIGH";
    aiResponse = "Your symptoms may require urgent medical attention. Please consult a doctor immediately.";
  } else if (symptomText.includes("fever") && symptomText.includes("cough")) {
    suggestedCondition = "Flu or Respiratory Infection";
    severity = "MEDIUM";
    aiResponse = "Your symptoms may suggest a respiratory infection. Monitor your temperature and seek medical advice if needed.";
  }

  return {
    suggestedCondition,
    severity,
    aiResponse,
  };
};

module.exports = { analyzeSymptoms };