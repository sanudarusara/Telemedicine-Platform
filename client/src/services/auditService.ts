/**
 * Audit Management Service API client
 * All requests route through the API Gateway at /api/audit
 * Access: ADMIN (full), DOCTOR (read-only)
 */

import apiClient, { extractErrorMessage } from "@/services/api/apiClient";

function throwErr(err: unknown): never {
  throw new Error(extractErrorMessage(err));
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuditLog {
  _id: string;
  userId: string;
  userRole: "PATIENT" | "DOCTOR" | "ADMIN" | "UNKNOWN";
  serviceName: string;
  action: string;
  description: string;
  timestamp: string;
  status: "SUCCESS" | "FAILED";
  ipAddress: string;
  metadata?: Record<string, unknown>;
  topic: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogsResponse {
  success: boolean;
  data: AuditLog[];
  pagination: PaginationMeta;
}

export interface AuditQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function getAllLogs(params: AuditQueryParams = {}): Promise<AuditLogsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);
  try {
    const { data } = await apiClient.get<AuditLogsResponse>(`/api/audit${qs.toString() ? `?${qs}` : ""}`);
    return data;
  } catch (err) { throwErr(err); }
}

export async function getLogsByUser(userId: string, params: AuditQueryParams = {}): Promise<AuditLogsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  try {
    const { data } = await apiClient.get<AuditLogsResponse>(`/api/audit/user/${userId}${qs.toString() ? `?${qs}` : ""}`);
    return data;
  } catch (err) { throwErr(err); }
}

export async function getLogsByService(serviceName: string, params: AuditQueryParams = {}): Promise<AuditLogsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  try {
    const { data } = await apiClient.get<AuditLogsResponse>(`/api/audit/service/${serviceName}${qs.toString() ? `?${qs}` : ""}`);
    return data;
  } catch (err) { throwErr(err); }
}

export async function getLogsByAction(action: string, params: AuditQueryParams = {}): Promise<AuditLogsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  try {
    const { data } = await apiClient.get<AuditLogsResponse>(`/api/audit/action/${action}${qs.toString() ? `?${qs}` : ""}`);
    return data;
  } catch (err) { throwErr(err); }
}

export async function getLogsByDateRange(
  start: string,
  end: string,
  params: AuditQueryParams = {}
): Promise<AuditLogsResponse> {
  const qs = new URLSearchParams({ start, end });
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  try {
    const { data } = await apiClient.get<AuditLogsResponse>(`/api/audit/date-range?${qs}`);
    return data;
  } catch (err) { throwErr(err); }
}

export async function getLogById(id: string): Promise<AuditLog> {
  try {
    const { data } = await apiClient.get<{ success: boolean; data: AuditLog }>(`/api/audit/${id}`);
    return data.data;
  } catch (err) { throwErr(err); }
}

export async function deleteLog(id: string): Promise<void> {
  try {
    await apiClient.delete(`/api/audit/${id}`);
  } catch (err) { throwErr(err); }
}
