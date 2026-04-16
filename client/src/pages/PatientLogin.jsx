import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Heart, Mail, Lock, User } from "lucide-react";
import heroImg from "@/assets/healthcare-hero.png";

// Default to gateway on port 5400 (browser blocks some ports like 6000)
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5400/api";

const PatientLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  const parseResponse = async (response) => {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
    return null;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    try {
      setLoading(true);
      console.log("Attempting login with:", { email });
      console.log("API URL:", `${API_BASE_URL}/auth/login`);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await parseResponse(response);
      console.log("Login response:", data);

      if (!response.ok) {
        throw new Error(data?.message || `Login failed with status ${response.status}`);
      }

      const token = data?.data?.token || data?.token;
      const user = data?.data?.user || data?.user;
      
      if (token) {
        localStorage.setItem("token", token);
      }
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("role", (user.role || "patient").toLowerCase());
      }

      navigate("/patient-dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password) {
      setError("Please enter name, email and password");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      console.log("Attempting registration with:", { name, email, password: "***" });
      console.log("API URL:", `${API_BASE_URL}/auth/register`);

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role: 'PATIENT'
        }),
      });

      const data = await parseResponse(response);
      console.log("Registration response:", data);

      if (!response.ok) {
        throw new Error(data?.message || `Register failed with status ${response.status}`);
      }

      const token = data?.data?.token || data?.token;
      const user = data?.data?.user || data?.user;
      
      if (token) {
        localStorage.setItem("token", token);
      }
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("role", (user.role || "patient").toLowerCase());
      }

      navigate('/patient-dashboard');
    } catch (err) {
      setError(err.message || "Registration failed");
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    if (isRegistering) {
      handleRegister(e);
    } else {
      handleLogin(e);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex flex-1 items-center justify-center bg-primary/5 p-12">
        <img
          src={heroImg}
          alt="Healthcare illustration"
          width={420}
          height={420}
          className="max-w-full"
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">MediCare</h1>
            <p className="text-muted-foreground text-sm">Patient sign in</p>
          </div>

          <Card className="shadow-lg border-border/60">
            <CardHeader className="pb-4 pt-6 px-6">
              <div className="flex items-center justify-center gap-2 text-primary mb-2">
                <Mail className="w-5 h-5" />
                <span className="font-medium">{isRegistering ? 'Patient Register' : 'Patient Login'}</span>
              </div>
              <h2 className="text-xl font-semibold text-foreground text-center">{isRegistering ? 'Create an account' : 'Welcome back'}</h2>
              <p className="text-sm text-muted-foreground text-center">{isRegistering ? 'Register a new patient account' : 'Sign in to your patient account'}</p>
            </CardHeader>

            <CardContent className="px-6 pb-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {isRegistering && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-foreground">Full name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-foreground">Password</Label>
                    {!isRegistering && (
                      <button type="button" className="text-xs text-primary hover:underline">
                        Forgot Password?
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={loading}>
                  {loading ? (isRegistering ? 'Registering...' : 'Signing In...') : (isRegistering ? 'Register' : 'Sign In')}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center mt-3">
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => {
                setIsRegistering((s) => !s);
                setError("");
                setName("");
              }}
            >
              {isRegistering ? 'Back to Sign in' : "Don't have an account? Register"}
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">Access your appointments and medical records securely.</p>
        </div>
      </div>
    </div>
  );
};

export default PatientLogin;