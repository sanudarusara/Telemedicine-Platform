/**
 * Auth / Admin Service API client
 * All requests route through the API Gateway at /api/auth
 */

import apiClient, { extractErrorMessage } from "@/services/api/apiClient";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
  isActive: boolean;
  isVerified?: boolean;
  createdAt?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function throwErr(err: unknown): never {
  throw new Error(extractErrorMessage(err));
}

// ── Public ────────────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  try {
    const { data } = await apiClient.post<{
      success: boolean;
      data: LoginResponse;
    }>("/api/auth/login", { email, password });
    return (data as any).data ?? (data as unknown as LoginResponse);
  } catch (err) {
    throwErr(err);
  }
}

export async function register(
  name: string,
  email: string,
  password: string,
  role = "PATIENT"
): Promise<LoginResponse> {
  try {
    const { data } = await apiClient.post<{
      success: boolean;
      data: LoginResponse;
    }>("/api/auth/register", { name, email, password, role });
    return (data as any).data ?? (data as unknown as LoginResponse);
  } catch (err) {
    throwErr(err);
  }
}

export async function getMe(): Promise<AuthUser> {
  try {
    const { data } = await apiClient.get<{
      success: boolean;
      data: AuthUser;
    }>("/api/auth/me");
    return data.data;
  } catch (err) {
    throwErr(err);
  }
}

export async function deactivateAccount(): Promise<void> {
  try {
    await apiClient.post("/api/auth/deactivate");
  } catch (err) {
    throwErr(err);
  }
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function getAllUsers(): Promise<AuthUser[]> {
  try {
    const { data } = await apiClient.get<{
      success: boolean;
      data: AuthUser[];
    }>("/api/auth/users");
    return data.data ?? [];
  } catch (err) {
    throwErr(err);
  }
}

export async function updateUserStatus(
  userId: string,
  isActive: boolean
): Promise<AuthUser> {
  try {
    const { data } = await apiClient.patch<{
      success: boolean;
      data: AuthUser;
    }>(`/api/auth/users/${userId}/status`, { isActive });
    return data.data;
  } catch (err) {
    throwErr(err);
  }
}

export async function updateUserRole(
  userId: string,
  role: string
): Promise<AuthUser> {
  try {
    const { data } = await apiClient.patch<{
      success: boolean;
      data: AuthUser;
    }>(`/api/auth/users/${userId}/role`, { role });
    return data.data;
  } catch (err) {
    throwErr(err);
  }
}

export async function verifyDoctor(userId: string): Promise<AuthUser> {
  try {
    const { data } = await apiClient.patch<{
      success: boolean;
      data: AuthUser;
    }>(`/api/auth/users/${userId}/verify`);
    return data.data;
  } catch (err) {
    throwErr(err);
  }
}

// ── Doctor admin (doctor-service) ─────────────────────────────────────────────

export interface DoctorProfile {
  _id: string;
  name: string;
  email: string;
  specialization: string;
  clinic: string;
  phone: string;
  fee: number;
  status: "pending" | "approved" | "rejected";
  isActive: boolean;
  startTime: string;
  endTime: string;
  sessionTime: number;
  workingDays: string[];
  createdAt?: string;
}

export async function getDoctorProfiles(
  status: "pending" | "approved" | "rejected" | "all" = "all"
): Promise<DoctorProfile[]> {
  try {
    const { data } = await apiClient.get<{
      success: boolean;
      data: DoctorProfile[];
    }>(`/api/doctors/admin?status=${status}`);
    return data.data ?? [];
  } catch (err) {
    throwErr(err);
  }
}

export async function approveDoctorProfile(
  doctorId: string
): Promise<{ data: DoctorProfile; slotsGenerated: number }> {
  try {
    const { data } = await apiClient.post<{
      success: boolean;
      data: DoctorProfile;
      slotsGenerated: number;
    }>(`/api/doctors/admin/${doctorId}/approve`);
    return { data: data.data, slotsGenerated: data.slotsGenerated };
  } catch (err) {
    throwErr(err);
  }
}

export async function rejectDoctorProfile(doctorId: string): Promise<DoctorProfile> {
  try {
    const { data } = await apiClient.post<{
      success: boolean;
      data: DoctorProfile;
    }>(`/api/doctors/admin/${doctorId}/reject`);
    return data.data;
  } catch (err) {
    throwErr(err);
  }
}

