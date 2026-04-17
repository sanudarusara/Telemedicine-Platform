/**
 * Patient Management Service API client
 * All requests route through the API Gateway at /api/patients and /api/reports
 */

import apiClient, { extractErrorMessage } from "@/services/api/apiClient";
import { getStoredToken } from "@/services/api/apiClient";

function throwErr(err: unknown): never {
  throw new Error(extractErrorMessage(err));
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
  try {
    const { data } = await apiClient.get<{ success: boolean; data: PatientProfile }>("/api/patients/profile");
    return data.data;
  } catch (err) { throwErr(err); }
}

export async function updatePatientProfile(body: Partial<PatientProfile>): Promise<PatientProfile> {
  try {
    const { data } = await apiClient.put<{ success: boolean; data: PatientProfile }>("/api/patients/profile", body);
    return data.data;
  } catch (err) { throwErr(err); }
}

export async function getAllPatients(): Promise<PatientProfile[]> {
  try {
    const { data } = await apiClient.get<{ success: boolean; count: number; data: PatientProfile[] }>("/api/patients");
    return data.data;
  } catch (err) { throwErr(err); }
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
  try {
    const { data } = await apiClient.get<{ success: boolean; data: { prescriptions: Prescription[] } }>(`/api/patients/${userId}/prescriptions`);
    return data.data?.prescriptions ?? [];
  } catch (err) { throwErr(err); }
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
  try {
    const { data } = await apiClient.get<{ success: boolean; data: { medicalHistory: HistoryEntry[] } }>(`/api/patients/${userId}/history`);
    return data.data?.medicalHistory ?? [];
  } catch (err) { throwErr(err); }
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
  try {
    const { data } = await apiClient.get<{ success: boolean; data: MedicalReport[] }>(`/api/reports/${userId}`);
    return data.data ?? [];
  } catch (err) { throwErr(err); }
}

export async function getReportsByType(userId: string, reportType: string): Promise<MedicalReport[]> {
  try {
    const { data } = await apiClient.get<{ success: boolean; data: MedicalReport[] }>(`/api/reports/${userId}/type/${reportType}`);
    return data.data ?? [];
  } catch (err) { throwErr(err); }
}

export async function uploadReport(userId: string, formData: FormData): Promise<MedicalReport> {
  try {
    // Pass FormData directly — axios sets multipart/form-data + boundary automatically.
    // The Authorization header is injected by the request interceptor.
    const { data } = await apiClient.post<{ success: boolean; data: MedicalReport }>(
      `/api/reports/upload/${userId}`,
      formData,
      { headers: { "Content-Type": undefined } } // let axios/browser set boundary
    );
    return data.data;
  } catch (err) { throwErr(err); }
}

export async function deleteReport(reportId: string): Promise<void> {
  try {
    await apiClient.delete(`/api/reports/${reportId}`);
  } catch (err) { throwErr(err); }
}
