/**
 * Unified Login / Register page for ALL roles.
 *
 * Login flow:
 *   1. Try /api/auth/login  (patients, admins)
 *   2. If that fails, try /api/doctor-auth/login  (doctors)
 *   3. Read the role stored in localStorage by AuthContext and redirect.
 *
 * Register flow:
 *   ● Registers as a PATIENT via /api/auth/register
 *
 * URL hint: /login?register=1  → opens the register tab directly
 */

import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Heart, Lock, Mail, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const LoginPage = () => {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(
    params.get("register") ? "register" : "login"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login, loginDoctor, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) { setError("Email and password are required"); return; }
    if (mode === "register" && !name) { setError("Please enter your full name"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }

    setLoading(true);
    try {
      if (mode === "register") {
        await register(name, email, password);
      } else {
        // Try patient / admin first, fall back to doctor endpoint
        try {
          await login(email, password);
        } catch {
          await loginDoctor(email, password);
        }
      }

      // AuthContext has already persisted the role into localStorage
      const role = (localStorage.getItem("role") || "").toLowerCase();
      if (role === "doctor") navigate("/doctor/dashboard", { replace: true });
      else if (role === "admin") navigate("/admin/dashboard", { replace: true });
      else navigate("/patient-dashboard", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials";
      setError(msg || "Sign in failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError("");
    setName("");
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      {/* Mini nav */}
      <nav className="border-b border-border/60 bg-background h-14 flex items-center px-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
        <div className="ml-auto flex items-center gap-2 font-semibold text-primary">
          <Heart className="w-4 h-4" /> MediCare
        </div>
      </nav>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Heading */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "login"
                ? "Sign in to access your dashboard"
                : "Register as a new patient"}
            </p>
          </div>

          <Card className="shadow-md">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error banner */}
                {error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {/* Name — register only */}
                {mode === "register" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder="Jane Smith"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-9"
                        autoComplete="name"
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading
                    ? mode === "register" ? "Creating account…" : "Signing in…"
                    : mode === "register" ? "Create account" : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Toggle */}
          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={switchMode}
              className="text-primary hover:underline font-medium"
            >
              {mode === "login" ? "Register" : "Sign in"}
            </button>
          </p>

          {mode === "login" && (
            <p className="text-center text-xs text-muted-foreground">
              Doctors and admins can also sign in with their credentials above.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
