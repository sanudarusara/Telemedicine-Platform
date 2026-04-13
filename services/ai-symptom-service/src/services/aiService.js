const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODELS = [
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "meta-llama/llama-4-scout-17b-16e-instruct",
];

const analyzeSymptoms = async ({
  symptoms,
  age,
  gender,
  duration,
  additionalNotes,
}) => {
  if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
    throw new Error("At least one symptom is required.");
  }

  const symptomText = symptoms.join(", ");

  const prompt = `
You are a medical symptom analysis assistant for a telemedicine platform.

Your job:
- Analyze the user's symptoms and health details
- Give a preliminary analysis only
- Do NOT present it as a final diagnosis
- Be careful, medically responsible, and clear
- Consider all fields together: symptoms, age, gender, duration, additional notes
- If the case may need urgent attention, mark severity as HIGH
- Use simple patient-friendly language
- Do not invent facts not supported by the input

Return ONLY valid JSON in this exact format:
{
  "suggestedCondition": "short possible condition name",
  "severity": "LOW | MEDIUM | HIGH",
  "aiResponse": "clear explanation for the user",
  "possibleCauses": ["cause1", "cause2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "recommendedDoctorType": "best doctor type to consult"
}

Severity must be one of:
LOW, MEDIUM, HIGH

Patient details:
- Symptoms: ${symptomText}
- Age: ${age ?? "Not provided"}
- Gender: ${gender || "Not provided"}
- Duration: ${duration || "Not provided"}
- Additional notes: ${additionalNotes || "None provided"}
`;

  let lastError = null;

  for (const model of MODELS) {
    try {
      const response = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.4,
      });

      const text = response.choices?.[0]?.message?.content?.trim();

      if (!text) {
        throw new Error(`Empty response from model: ${model}`);
      }

      let parsed;

      try {
        parsed = JSON.parse(text);
      } catch (parseError) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error(`Invalid JSON response from model: ${model}`);
        }
        parsed = JSON.parse(jsonMatch[0]);
      }

      return {
        suggestedCondition:
          parsed.suggestedCondition || "General Medical Concern",

        severity: ["LOW", "MEDIUM", "HIGH"].includes(parsed.severity)
          ? parsed.severity
          : "MEDIUM",

        aiResponse:
          parsed.aiResponse ||
          "A preliminary analysis could not be generated clearly. Please consult a doctor if symptoms continue or worsen.",
          
        possibleCauses: Array.isArray(parsed.possibleCauses)
          ? parsed.possibleCauses
          : [],

        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations
          : [],

        recommendedDoctorType:
          parsed.recommendedDoctorType || "General Physician",
      };
    } catch (error) {
      lastError = error;

      const status =
        error?.status || error?.response?.status || error?.code || null;

      if (status === 429) {
        console.warn(`Rate limit hit on ${model}. Trying next model...`);
        continue;
      }

      console.error(`Non-rate-limit error on ${model}:`, error);
      break;
    }
  }

  console.error("Groq analysis failed:", lastError);

  return {
    suggestedCondition: "Unable to determine condition",
    severity: "MEDIUM",
    aiResponse:
      "We could not complete the AI symptom analysis at the moment. Please try again later or consult a medical professional if your symptoms are serious.",
  };
};

module.exports = { analyzeSymptoms };