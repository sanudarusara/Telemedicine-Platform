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
  possibleCauses?: string[];
  recommendations?: string[];
  recommendedDoctorType?: string;
  createdAt?: string;
  updatedAt?: string;
};

// 🔥 CHANGED HERE
const API_BASE =
  import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:5400/api";

export async function analyzeSymptoms(
  payload: AnalyzeSymptomsPayload
): Promise<SymptomAnalysisResult> {
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