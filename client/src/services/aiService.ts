export type Severity = "LOW" | "MEDIUM" | "HIGH";

export type AnalyzeSymptomsPayload = {
  userId: string;
  symptoms: string[];
  age?: number;
  gender?: string;
  duration?: string;
  additionalNotes?: string;
};

export type SymptomAnalysisResult = {
  _id?: string;
  userId: string;
  symptoms: string[];
  age?: number;
  gender?: string;
  duration?: string;
  additionalNotes?: string;
  aiResponse: string;
  suggestedCondition: string;
  severity: Severity;
  createdAt?: string;
  updatedAt?: string;
};

export type AnalyzeSymptomsResponse = {
  message: string;
  data: SymptomAnalysisResult;
};

const API_BASE =
  import.meta.env.VITE_AI_SYMPTOM_API_URL || "http://localhost:5003";

export async function analyzeSymptoms(
  payload: AnalyzeSymptomsPayload
): Promise<AnalyzeSymptomsResponse> {
  const res = await fetch(`${API_BASE}/symptoms/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Failed to analyze symptoms.");
  }

  return data;
}