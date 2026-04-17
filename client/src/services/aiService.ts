import apiClient, { extractErrorMessage } from "@/services/api/apiClient";

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

export async function analyzeSymptoms(
  payload: AnalyzeSymptomsPayload
): Promise<SymptomAnalysisResult> {
  try {
    const { data } = await apiClient.post<SymptomAnalysisResult>(
      "/api/symptoms/analyze",
      payload
    );
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Failed to analyze symptoms."));
  }
}
