/**
 * Audit Management Service API client
 * Communicates through the API Gateway at /api/audit
 * Access: ADMIN (full), DOCTOR (read-only)
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
  const res = await fetch(`${API_BASE}/api/audit${qs.toString() ? `?${qs}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse<AuditLogsResponse>(res);
}

export async function getLogsByUser(userId: string, params: AuditQueryParams = {}): Promise<AuditLogsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const res = await fetch(`${API_BASE}/api/audit/user/${userId}${qs.toString() ? `?${qs}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse<AuditLogsResponse>(res);
}

export async function getLogsByService(serviceName: string, params: AuditQueryParams = {}): Promise<AuditLogsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const res = await fetch(`${API_BASE}/api/audit/service/${serviceName}${qs.toString() ? `?${qs}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse<AuditLogsResponse>(res);
}

export async function getLogsByAction(action: string, params: AuditQueryParams = {}): Promise<AuditLogsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const res = await fetch(`${API_BASE}/api/audit/action/${action}${qs.toString() ? `?${qs}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse<AuditLogsResponse>(res);
}

export async function getLogsByDateRange(
  start: string,
  end: string,
  params: AuditQueryParams = {}
): Promise<AuditLogsResponse> {
  const qs = new URLSearchParams({ start, end });
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const res = await fetch(`${API_BASE}/api/audit/date-range?${qs}`, {
    headers: authHeaders(),
  });
  return handleResponse<AuditLogsResponse>(res);
}

export async function getLogById(id: string): Promise<AuditLog> {
  const res = await fetch(`${API_BASE}/api/audit/${id}`, { headers: authHeaders() });
  const data = await handleResponse<{ success: boolean; data: AuditLog }>(res);
  return data.data;
}

export async function deleteLog(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/audit/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  await handleResponse(res);
}
