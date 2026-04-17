/**
 * Doctor Registration Page
 * Creates both:
 *  1. An auth-service account (role: DOCTOR) for JWT login
 *  2. A doctor-service profile (status: pending) with full professional details
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, Heart, Lock, Mail, User, Phone, Stethoscope,
  Building, DollarSign, Clock, CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";
import apiClient from "@/services/api/apiClient";

const WORKING_DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

const DoctorRegister = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    specialization: "",
    clinic: "",
    phone: "",
    fee: "",
    startTime: "09:00",
    endTime: "17:00",
    sessionTime: "30",
    workingDays: ["mon", "tue", "wed", "thu", "fri"],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const toggleDay = (day) => {
    setForm((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.email || !form.password || !form.specialization ||
      !form.clinic || !form.phone || !form.fee) {
      setError("Please fill in all required fields.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.workingDays.length === 0) {
      setError("Please select at least one working day.");
      return;
    }
    if (Number(form.fee) <= 0) {
      setError("Consultation fee must be a positive number.");
      return;
    }

    setLoading(true);
    try {
      // Single call — doctor-service creates profile AND registers auth-service account internally
      await apiClient.post("/api/doctor-auth/register", {
        name: form.name,
        email: form.email.toLowerCase().trim(),
        password: form.password,
        specialization: form.specialization,
        clinic: form.clinic,
        phone: form.phone,
        fee: Number(form.fee),
        startTime: form.startTime,
        endTime: form.endTime,
        sessionTime: Number(form.sessionTime),
        workingDays: form.workingDays,
      });

      setSuccess(true);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col">
        <nav className="border-b border-border/60 bg-background h-14 flex items-center px-4">
          <div className="ml-auto flex items-center gap-2 font-semibold text-primary">
            <Heart className="w-4 h-4" /> MediCare
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Registration Submitted!</h1>
              <p className="text-muted-foreground mt-2">
                Your doctor profile has been submitted for review. An admin will
                verify your credentials and approve your account.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                You will be able to log in once your account is approved.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link to="/login">Back to Login</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border/60 bg-background h-14 flex items-center px-4">
        <Link
          to="/login"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
        <div className="ml-auto flex items-center gap-2 font-semibold text-primary">
          <Heart className="w-4 h-4" /> MediCare
        </div>
      </nav>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold">Register as a Doctor</h1>
            <p className="text-sm text-muted-foreground">
              Submit your details for admin review. You'll be notified once approved.
            </p>
          </div>

          <Card className="shadow-md">
            <CardContent className="p-6">
              {error && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-5">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Account Info */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Account Information
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Full Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Dr. Jane Smith"
                          value={form.name}
                          onChange={set("name")}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="doctor@example.com"
                          value={form.email}
                          onChange={set("email")}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder="Min. 6 characters"
                          value={form.password}
                          onChange={set("password")}
                          className="pl-9"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Confirm Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder="Repeat password"
                          value={form.confirmPassword}
                          onChange={set("confirmPassword")}
                          className="pl-9"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Info */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Professional Information
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Specialization *</Label>
                      <div className="relative">
                        <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="e.g. Cardiology"
                          value={form.specialization}
                          onChange={set("specialization")}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Clinic / Hospital *</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="e.g. City Medical Center"
                          value={form.clinic}
                          onChange={set("clinic")}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="+94 77 123 4567"
                          value={form.phone}
                          onChange={set("phone")}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Consultation Fee (Rs.) *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="0"
                          placeholder="e.g. 2000"
                          value={form.fee}
                          onChange={set("fee")}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Availability */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Availability
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-1.5">
                      <Label>Start Time</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="time"
                          value={form.startTime}
                          onChange={set("startTime")}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>End Time</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="time"
                          value={form.endTime}
                          onChange={set("endTime")}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Session Duration (min)</Label>
                      <select
                        value={form.sessionTime}
                        onChange={set("sessionTime")}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="15">15 minutes</option>
                        <option value="20">20 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">60 minutes</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">Working Days</Label>
                    <div className="flex flex-wrap gap-2">
                      {WORKING_DAYS.map((day) => (
                        <button
                          key={day.key}
                          type="button"
                          onClick={() => toggleDay(day.key)}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            form.workingDays.includes(day.key)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:bg-muted"
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 gap-2" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                  ) : (
                    "Submit Registration"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DoctorRegister;
