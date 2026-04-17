/**
 * Centralised Axios API client
 *
 * Every request automatically receives the JWT token from localStorage.
 * On a 401 response the stored credentials are cleared and the user is
 * redirected to the appropriate login page.
 *
 * Request flow:
 *   Component / service function
 *       → apiClient (attaches Authorization header)
 *       → Vite dev proxy (in dev) OR direct URL (in prod)
 *       → API Gateway (5400)
 *       → Microservice
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

// ── Base URL ──────────────────────────────────────────────────────────────────
// In dev mode Vite proxies /api → gateway, so base URL is empty (same-origin).
// In production build the env variable VITE_API_GATEWAY_URL is used.
const BASE_URL = import.meta.env.DEV
  ? ""
  : import.meta.env.VITE_API_GATEWAY_URL || "";

// ── Instance ──────────────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// ── Token helpers (exported for AuthContext & tests) ──────────────────────────

/** Returns the active JWT — patient/admin use 'token', doctors use 'doctor_token'. */
export function getStoredToken(): string {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("doctor_token") ||
    ""
  );
}

/** Returns the stored role string (lowercase). */
export function getStoredRole(): string {
  return (localStorage.getItem("role") || "").toLowerCase();
}

/** Wipes all auth keys from localStorage. */
export function clearStoredAuth(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("doctor_token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
}

// ── Request interceptor — attach JWT ─────────────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — handle 401 ────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const role = getStoredRole();
      clearStoredAuth();
      // Redirect to the matching login page
      window.location.href = role === "doctor" ? "/doctor/login" : "/patient-login";
    }
    return Promise.reject(error);
  }
);

// ── Error message extractor ───────────────────────────────────────────────────
/** Pulls a human-readable message out of an AxiosError or generic Error. */
export function extractErrorMessage(err: unknown, fallback = "Request failed"): string {
  const ae = err as AxiosError<{ message?: string; error?: string }>;
  return (
    ae.response?.data?.message ||
    ae.response?.data?.error ||
    (err instanceof Error ? err.message : fallback)
  );
}

export default apiClient;
