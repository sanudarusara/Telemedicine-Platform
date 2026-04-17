/**
 * AuthContext — single source of truth for authentication state.
 *
 * Provides:
 *   • user / token / role / isAuthenticated
 *   • login()       — patient & admin (/api/auth/login)
 *   • loginDoctor() — doctor portal  (/api/doctor-auth/login)
 *   • register()    — new patient account (/api/auth/register)
 *   • logout()      — clears all tokens and redirects
 *
 * Tokens are kept in localStorage so the Axios API client can pick them up
 * via its request interceptor without needing React context.
 *
 * Storage layout (unchanged from existing convention):
 *   localStorage.token         → patient / admin JWT
 *   localStorage.doctor_token  → doctor JWT
 *   localStorage.role          → lowercase role string
 *   localStorage.user          → JSON serialised user object
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import apiClient, { clearStoredAuth } from "@/services/api/apiClient";
import type { AxiosError } from "axios";

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

interface AuthState {
  user: AuthUser | null;
  /** Active JWT (whichever is current). */
  token: string;
  /** Lowercase: 'patient' | 'doctor' | 'admin' | '' */
  role: string;
  isAuthenticated: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginDoctor: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Reads auth state synchronously from localStorage (used for initialisation). */
function loadFromStorage(): AuthState {
  try {
    const token = localStorage.getItem("token") || "";
    const doctorToken = localStorage.getItem("doctor_token") || "";
    const storedRole = (localStorage.getItem("role") || "").toLowerCase();
    const user: AuthUser | null = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    if (doctorToken && storedRole === "doctor") {
      return { user: null, token: doctorToken, role: "doctor", isAuthenticated: true };
    }
    if (token) {
      return { user, token, role: storedRole || "patient", isAuthenticated: true };
    }
  } catch {
    // corrupted storage — fall through to unauthenticated state
  }
  return { user: null, token: "", role: "", isAuthenticated: false };
}

function extractMessage(err: unknown): string {
  const ae = err as AxiosError<{ message?: string; error?: string }>;
  return (
    ae.response?.data?.message ||
    ae.response?.data?.error ||
    (err instanceof Error ? err.message : "Authentication failed")
  );
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadFromStorage);

  // Sync across browser tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === "token" ||
        e.key === "doctor_token" ||
        e.key === "role" ||
        e.key === "user"
      ) {
        setState(loadFromStorage());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── Patient / Admin login ────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiClient.post<{
        success: boolean;
        data: { token: string; user: AuthUser };
      }>("/api/auth/login", { email, password });

      // Support both { data: { token, user } } and { token, user } response shapes
      const payload = (res.data as any).data ?? res.data;
      const { token, user } = payload as { token: string; user: AuthUser };

      if (!token) throw new Error("No token returned from server");

      const role = (user?.role || "PATIENT").toLowerCase();

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("role", role);
      localStorage.removeItem("doctor_token"); // clear any stale doctor session

      setState({ user, token, role, isAuthenticated: true });
    } catch (err) {
      throw new Error(extractMessage(err));
    }
  }, []);

  // ── Doctor login ─────────────────────────────────────────────────────────────
  // Doctors authenticate through the same auth-service as patients/admins.
  const loginDoctor = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiClient.post<{
        success: boolean;
        data: { token: string; user: AuthUser };
      }>("/api/auth/login", { email, password });

      // Support both { data: { token, user } } and { token, user } shapes
      const payload = (res.data as any).data ?? res.data;
      const { token, user } = payload as { token: string; user: AuthUser };

      if (!token) throw new Error("No token returned from server");
      if (user?.role?.toUpperCase() !== "DOCTOR") {
        throw new Error("These credentials do not belong to a doctor account");
      }

      localStorage.setItem("doctor_token", token);
      localStorage.setItem("role", "doctor");
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.removeItem("token"); // clear any stale patient session

      setState({ user, token, role: "doctor", isAuthenticated: true });
    } catch (err) {
      throw new Error(extractMessage(err));
    }
  }, []);

  // ── Register (patient) ────────────────────────────────────────────────────────
  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      const res = await apiClient.post<{
        success: boolean;
        data: { token: string; user: AuthUser };
      }>("/api/auth/register", { name, email, password, role: "PATIENT" });

      const payload = (res.data as any).data ?? res.data;
      const { token, user } = payload as { token: string; user: AuthUser };

      if (!token) throw new Error("Registration succeeded but no token returned");

      const role = (user?.role || "PATIENT").toLowerCase();

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("role", role);
      localStorage.removeItem("doctor_token");

      setState({ user, token, role, isAuthenticated: true });
    } catch (err) {
      throw new Error(extractMessage(err));
    }
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    clearStoredAuth();
    setState({ user: null, token: "", role: "", isAuthenticated: false });
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, loginDoctor, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() must be called inside <AuthProvider>");
  return ctx;
}
