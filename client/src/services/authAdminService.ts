/**
 * Auth / Admin Service API client
 * Communicates through the API Gateway at /api/auth
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

// ─── Public ───────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse<{ success: boolean; data: LoginResponse }>(res);
  return data.data ?? (data as unknown as LoginResponse);
}

export async function register(
  name: string,
  email: string,
  password: string,
  role = "PATIENT"
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role }),
  });
  const data = await handleResponse<{ success: boolean; data: LoginResponse }>(res);
  return data.data ?? (data as unknown as LoginResponse);
}

export async function getMe(): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/api/auth/me`, { headers: authHeaders() });
  const data = await handleResponse<{ success: boolean; data: AuthUser }>(res);
  return data.data;
}

export async function deactivateAccount(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/deactivate`, {
    method: "POST",
    headers: authHeaders(),
  });
  await handleResponse(res);
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getAllUsers(): Promise<AuthUser[]> {
  const res = await fetch(`${API_BASE}/api/auth/users`, { headers: authHeaders() });
  const data = await handleResponse<{ success: boolean; data: AuthUser[] }>(res);
  return data.data ?? [];
}

export async function updateUserStatus(userId: string, isActive: boolean): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/api/auth/users/${userId}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ isActive }),
  });
  const data = await handleResponse<{ success: boolean; data: AuthUser }>(res);
  return data.data;
}

export async function updateUserRole(userId: string, role: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/api/auth/users/${userId}/role`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  });
  const data = await handleResponse<{ success: boolean; data: AuthUser }>(res);
  return data.data;
}

export async function verifyDoctor(userId: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/api/auth/users/${userId}/verify`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  const data = await handleResponse<{ success: boolean; data: AuthUser }>(res);
  return data.data;
}
