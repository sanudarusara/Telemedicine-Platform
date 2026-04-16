/**
 * Patient Management Service API client
 * Communicates through the API Gateway at /api/patients and /api/reports
 */

const API_BASE = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, "") : "");

const getToken = (): string =>
  localStorage.getItem("token") || localStorage.getItem("doctor_token") || "";

const authHeaders = (): HeadersInit => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || data?.error || "Request failed");
  return data;
}

// ─── Patient Profile ──────────────────────────────────────────────────────────

export interface PatientAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface EmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
}

export interface PatientProfile {
  _id?: string;
  userId?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER" | "";
  bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "";
  phone?: string;
  address?: PatientAddress;
  emergencyContact?: EmergencyContact;
  allergies?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export async function getPatientProfile(): Promise<PatientProfile> {
  const res = await fetch(`${API_BASE}/api/patients/profile`, {
    headers: authHeaders(),
  });
  const data = await handleResponse<{ success: boolean; data: PatientProfile }>(res);
  return data.data;
}

export async function updatePatientProfile(body: Partial<PatientProfile>): Promise<PatientProfile> {
  const res = await fetch(`${API_BASE}/api/patients/profile`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await handleResponse<{ success: boolean; data: PatientProfile }>(res);
  return data.data;
}

export async function getAllPatients(): Promise<PatientProfile[]> {
  const res = await fetch(`${API_BASE}/api/patients`, { headers: authHeaders() });
  const data = await handleResponse<{ success: boolean; count: number; data: PatientProfile[] }>(res);
  return data.data;
}

// ─── Prescriptions ────────────────────────────────────────────────────────────

export interface Prescription {
  _id?: string;
  medication: string;
  dosage?: string;
  frequency?: string;
  notes?: string;
  prescribedBy?: string;
  prescribedAt?: string;
}

export async function getPrescriptions(userId: string): Promise<Prescription[]> {
  const res = await fetch(`${API_BASE}/api/patients/${userId}/prescriptions`, {
    headers: authHeaders(),
  });
  const data = await handleResponse<{ success: boolean; data: { prescriptions: Prescription[] } }>(res);
  return data.data?.prescriptions ?? [];
}

// ─── Medical History ──────────────────────────────────────────────────────────

export interface HistoryEntry {
  _id?: string;
  condition: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
  date?: string;
  doctorId?: string;
}

export async function getMedicalHistory(userId: string): Promise<HistoryEntry[]> {
  const res = await fetch(`${API_BASE}/api/patients/${userId}/history`, {
    headers: authHeaders(),
  });
  const data = await handleResponse<{ success: boolean; data: { medicalHistory: HistoryEntry[] } }>(res);
  return data.data?.medicalHistory ?? [];
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface MedicalReport {
  _id?: string;
  patientId?: string;
  uploadedBy?: string;
  title: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  reportType?: "LAB_RESULT" | "PRESCRIPTION" | "IMAGING" | "DIAGNOSTIC" | "OTHER";
  s3Url?: string;
  createdAt?: string;
}

export async function getReports(userId: string): Promise<MedicalReport[]> {
  const res = await fetch(`${API_BASE}/api/reports/${userId}`, {
    headers: authHeaders(),
  });
  const data = await handleResponse<{ success: boolean; data: MedicalReport[] }>(res);
  return data.data ?? [];
}

export async function getReportsByType(userId: string, reportType: string): Promise<MedicalReport[]> {
  const res = await fetch(`${API_BASE}/api/reports/${userId}/type/${reportType}`, {
    headers: authHeaders(),
  });
  const data = await handleResponse<{ success: boolean; data: MedicalReport[] }>(res);
  return data.data ?? [];
}

export async function uploadReport(userId: string, formData: FormData): Promise<MedicalReport> {
  const res = await fetch(`${API_BASE}/api/reports/upload/${userId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` }, // no Content-Type — let browser set multipart boundary
    body: formData,
  });
  const data = await handleResponse<{ success: boolean; data: MedicalReport }>(res);
  return data.data;
}

export async function deleteReport(reportId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/reports/${reportId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  await handleResponse(res);
}
