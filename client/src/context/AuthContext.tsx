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
  token: string;
  role: string;
  isAuthenticated: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginDoctor: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

function loadFromStorage(): AuthState {
  try {
    const token = localStorage.getItem("token") || "";
    const doctorToken = localStorage.getItem("doctor_token") || "";
    const storedRole = (localStorage.getItem("role") || "").toLowerCase();
    const user: AuthUser | null = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    if (doctorToken && storedRole === "doctor") {
      return {
        user,
        token: doctorToken,
        role: "doctor",
        isAuthenticated: true,
      };
    }

    if (token) {
      return {
        user,
        token,
        role: storedRole || "patient",
        isAuthenticated: true,
      };
    }
  } catch {
    // ignore bad storage
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

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadFromStorage);

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

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiClient.post<{
        success: boolean;
        data: { token: string; user: AuthUser };
      }>("/api/auth/login", { email, password });

      const payload = (res.data as any).data ?? res.data;
      const { token, user } = payload as { token: string; user: AuthUser };

      if (!token) throw new Error("No token returned from server");

      const role = String(user?.role || "").toUpperCase();

      // Force doctors into doctor flow so message handling works properly
      if (role === "DOCTOR") {
        throw new Error("__DOCTOR_ACCOUNT__");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("role", role.toLowerCase());
      localStorage.removeItem("doctor_token");

      setState({
        user,
        token,
        role: role.toLowerCase(),
        isAuthenticated: true,
      });
    } catch (err) {
      if ((err as Error)?.message !== "__DOCTOR_ACCOUNT__") {
        clearStoredAuth();
        setState({ user: null, token: "", role: "", isAuthenticated: false });
      }
      throw new Error((err as Error)?.message || extractMessage(err));
    }
  }, []);

  const loginDoctor = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiClient.post<{
        success: boolean;
        data: { token: string; user: AuthUser };
      }>("/api/auth/login", { email, password });

      const payload = (res.data as any).data ?? res.data;
      const { token, user } = payload as { token: string; user: AuthUser };

      if (!token) throw new Error("No token returned from server");
      if (String(user?.role || "").toUpperCase() !== "DOCTOR") {
        throw new Error("These credentials do not belong to a doctor account");
      }

      localStorage.setItem("doctor_token", token);
      localStorage.setItem("role", "doctor");
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.removeItem("token");

      setState({ user, token, role: "doctor", isAuthenticated: true });
    } catch (err) {
      clearStoredAuth();
      setState({ user: null, token: "", role: "", isAuthenticated: false });
      throw new Error(extractMessage(err));
    }
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        const res = await apiClient.post<{
          success: boolean;
          data: { token?: string; user: AuthUser; requiresVerification?: boolean };
        }>("/api/auth/register", { name, email, password, role: "PATIENT" });

        const payload = (res.data as any).data ?? res.data;
        const { token, user } = payload as {
          token?: string;
          user: AuthUser;
          requiresVerification?: boolean;
        };

        if (!token) {
          throw new Error("Registration succeeded but no token returned");
        }

        const role = (user?.role || "PATIENT").toLowerCase();

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("role", role);
        localStorage.removeItem("doctor_token");

        setState({ user, token, role, isAuthenticated: true });
      } catch (err) {
        clearStoredAuth();
        setState({ user: null, token: "", role: "", isAuthenticated: false });
        throw new Error(extractMessage(err));
      }
    },
    []
  );

  const logout = useCallback(() => {
    clearStoredAuth();
    setState({ user: null, token: "", role: "", isAuthenticated: false });
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, loginDoctor, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() must be called inside <AuthProvider>");
  return ctx;
}