import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UserCircle,
  Stethoscope,
  Building2,
  Phone,
  Mail,
  Wallet,
  Clock3,
  CalendarDays,
  Save,
  Loader2,
  ShieldCheck,
  Activity,
  BriefcaseMedical,
  CalendarX2,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:30081/api";

const pageShell =
  "rounded-[32px] border border-border/60 bg-gradient-to-br from-background via-background to-muted/25 shadow-sm";

const softPanel =
  "rounded-[28px] border border-border/60 bg-gradient-to-br from-background via-background to-muted/20 shadow-sm";

const inputClass =
  "flex h-11 w-full rounded-2xl border border-border/60 bg-background px-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/10";

const textareaClass =
  "flex min-h-[110px] w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/10";

const badgeStyles = {
  approved:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
  pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400",
  rejected:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400",
};

const allDays = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

const Profile = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    specialization: "",
    clinic: "",
    fee: "",
    phone: "",
    startTime: "",
    endTime: "",
    sessionTime: "",
    workingDays: [],
    holidayDates: [],
  });

  const [holidayInput, setHolidayInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [doctorMeta, setDoctorMeta] = useState({
    status: "",
    isActive: false,
    createdAt: "",
  });

  const token = localStorage.getItem("token");

  const parseResponse = async (response) => {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
    return null;
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_BASE_URL}/doctors/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data?.message || `Request failed with status ${response.status}`);
      }

      setForm({
        name: data?.name || "",
        email: data?.email || "",
        specialization: data?.specialization || "",
        clinic: data?.clinic || "",
        fee: data?.fee ?? "",
        phone: data?.phone || "",
        startTime: data?.startTime || "",
        endTime: data?.endTime || "",
        sessionTime: data?.sessionTime ?? "",
        workingDays: Array.isArray(data?.workingDays) ? data.workingDays : [],
        holidayDates: Array.isArray(data?.holidayDates) ? data.holidayDates : [],
      });

      setDoctorMeta({
        status: data?.status || "",
        isActive: Boolean(data?.isActive),
        createdAt: data?.createdAt || "",
      });
    } catch (err) {
      setError(err.message || "Error fetching profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "fee" || name === "sessionTime" ? value : value,
    }));
  };

  const toggleWorkingDay = (day) => {
    setForm((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day],
    }));
  };

  const addHoliday = () => {
    if (!holidayInput) return;

    setForm((prev) => {
      if (prev.holidayDates.includes(holidayInput)) return prev;
      return {
        ...prev,
        holidayDates: [...prev.holidayDates, holidayInput].sort(),
      };
    });

    setHolidayInput("");
  };

  const removeHoliday = (date) => {
    setForm((prev) => ({
      ...prev,
      holidayDates: prev.holidayDates.filter((item) => item !== date),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: form.name,
        specialization: form.specialization,
        clinic: form.clinic,
        fee: Number(form.fee),
        phone: form.phone,
        startTime: form.startTime,
        endTime: form.endTime,
        sessionTime: Number(form.sessionTime),
        workingDays: form.workingDays,
        holidayDates: form.holidayDates,
      };

      const response = await fetch(`${API_BASE_URL}/doctors/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data?.message || `Request failed with status ${response.status}`);
      }

      setSuccess("Profile updated successfully.");
      setForm((prev) => ({
        ...prev,
        name: data?.name || prev.name,
        email: data?.email || prev.email,
        specialization: data?.specialization || prev.specialization,
        clinic: data?.clinic || prev.clinic,
        fee: data?.fee ?? prev.fee,
        phone: data?.phone || prev.phone,
        startTime: data?.startTime || prev.startTime,
        endTime: data?.endTime || prev.endTime,
        sessionTime: data?.sessionTime ?? prev.sessionTime,
        workingDays: Array.isArray(data?.workingDays) ? data.workingDays : prev.workingDays,
        holidayDates: Array.isArray(data?.holidayDates) ? data.holidayDates : prev.holidayDates,
      }));

      setDoctorMeta((prev) => ({
        ...prev,
        status: data?.status || prev.status,
        isActive: typeof data?.isActive === "boolean" ? data.isActive : prev.isActive,
      }));
    } catch (err) {
      setError(err.message || "Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const profileCompletion = useMemo(() => {
    const fields = [
      form.name,
      form.email,
      form.specialization,
      form.clinic,
      form.fee,
      form.phone,
      form.startTime,
      form.endTime,
      form.sessionTime,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [form]);

  const joinedDate = useMemo(() => {
    if (!doctorMeta.createdAt) return "N/A";
    const date = new Date(doctorMeta.createdAt);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [doctorMeta.createdAt]);

  return (
    <DashboardLayout title="Profile">
      <div className="space-y-8 p-3 md:p-5 xl:p-6">
        <section className={`${pageShell} overflow-hidden p-6 md:p-8`}>
          <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl space-y-5">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-sm">
                <UserCircle className="h-3.5 w-3.5" />
                Doctor Profile
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                  Manage your profile and availability
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                  Update your professional details, clinic information, session timing,
                  working days, and holiday dates from one clean workspace.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {doctorMeta.status && (
                  <Badge
                    variant="outline"
                    className={`rounded-full px-3 py-1 ${
                      badgeStyles[doctorMeta.status] ||
                      "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {doctorMeta.status}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={`rounded-full px-3 py-1 ${
                    doctorMeta.isActive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {doctorMeta.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>

            <Card className="w-full max-w-md rounded-[28px] border border-border/60 bg-gradient-to-br from-primary/[0.06] via-background to-muted/20 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 ring-1 ring-primary/10">
                    <Activity className="h-7 w-7 text-primary" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-base font-semibold">Profile overview</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Keep your doctor information up to date for a better booking flow.
                    </p>
                    <Badge className="rounded-full px-3 py-1.5 text-xs">
                      {profileCompletion}% completed
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className={softPanel}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Specialization</p>
                <p className="mt-3 text-lg font-semibold">{form.specialization || "N/A"}</p>
              </CardContent>
            </Card>

            <Card className={softPanel}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Clinic</p>
                <p className="mt-3 text-lg font-semibold">{form.clinic || "N/A"}</p>
              </CardContent>
            </Card>

            <Card className={softPanel}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Working Days</p>
                <p className="mt-3 text-lg font-semibold">
                  {form.workingDays.length > 0 ? form.workingDays.length : 0} selected
                </p>
              </CardContent>
            </Card>

            <Card className={softPanel}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Joined</p>
                <p className="mt-3 text-lg font-semibold">{joinedDate}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {error && (
          <div className="rounded-[24px] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center rounded-[28px] border border-dashed border-border/70 bg-gradient-to-br from-background to-muted/20 py-24 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading profile...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-6">
              <Card className={`${softPanel} overflow-hidden`}>
                <CardHeader className="border-b border-border/50 pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                    <BriefcaseMedical className="h-5 w-5 text-primary" />
                    Professional Information
                  </CardTitle>
                </CardHeader>

                <CardContent className="grid gap-5 p-6 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-foreground">Full Name</label>
                    <div className="relative">
                      <UserCircle className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        className={`${inputClass} pl-11`}
                        placeholder="Doctor full name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="email"
                        value={form.email}
                        disabled
                        className={`${inputClass} cursor-not-allowed pl-11 opacity-70`}
                        placeholder="Doctor email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Phone</label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        className={`${inputClass} pl-11`}
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Specialization</label>
                    <div className="relative">
                      <Stethoscope className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        name="specialization"
                        value={form.specialization}
                        onChange={handleChange}
                        className={`${inputClass} pl-11`}
                        placeholder="e.g. Cardiologist"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Clinic</label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        name="clinic"
                        value={form.clinic}
                        onChange={handleChange}
                        className={`${inputClass} pl-11`}
                        placeholder="Clinic name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Consultation Fee</label>
                    <div className="relative">
                      <Wallet className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="number"
                        name="fee"
                        value={form.fee}
                        onChange={handleChange}
                        className={`${inputClass} pl-11`}
                        placeholder="Enter fee"
                        min="0"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${softPanel} overflow-hidden`}>
                <CardHeader className="border-b border-border/50 pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                    <Clock3 className="h-5 w-5 text-primary" />
                    Availability Settings
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6 p-6">
                  <div className="grid gap-5 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Start Time</label>
                      <input
                        type="time"
                        name="startTime"
                        value={form.startTime}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">End Time</label>
                      <input
                        type="time"
                        name="endTime"
                        value={form.endTime}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Session Time (minutes)
                      </label>
                      <input
                        type="number"
                        name="sessionTime"
                        value={form.sessionTime}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="e.g. 15"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">Working Days</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {allDays.map((day) => {
                        const selected = form.workingDays.includes(day.key);

                        return (
                          <button
                            key={day.key}
                            type="button"
                            onClick={() => toggleWorkingDay(day.key)}
                            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                              selected
                                ? "border-primary/30 bg-primary/10 text-primary shadow-sm"
                                : "border-border/60 bg-background text-muted-foreground hover:bg-muted/60"
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CalendarX2 className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">Holiday Dates</p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="date"
                        value={holidayInput}
                        onChange={(e) => setHolidayInput(e.target.value)}
                        className={inputClass}
                      />
                      <Button
                        type="button"
                        onClick={addHoliday}
                        variant="outline"
                        className="rounded-2xl px-5"
                      >
                        Add Holiday
                      </Button>
                    </div>

                    {form.holidayDates.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {form.holidayDates.map((date) => (
                          <div
                            key={date}
                            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-2 text-sm shadow-sm"
                          >
                            <span>{date}</span>
                            <button
                              type="button"
                              onClick={() => removeHoliday(date)}
                              className="text-muted-foreground transition hover:text-destructive"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[20px] border border-dashed border-border/70 bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
                        No holiday dates added yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6 xl:sticky xl:top-20 xl:self-start">
              <Card className={`${pageShell} overflow-hidden`}>
                <CardHeader className="border-b border-border/50 pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Quick Summary
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4 p-6">
                  <div className="rounded-[24px] border border-border/60 bg-gradient-to-br from-primary/[0.04] via-background to-muted/25 p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-lg font-bold text-primary ring-1 ring-primary/10">
                        {(form.name || "DR")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold text-foreground">
                          {form.name || "Doctor Name"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {form.specialization || "No specialization"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="flex items-center justify-between rounded-[22px] border border-border/60 bg-gradient-to-br from-background to-muted/20 p-4">
                      <span className="text-sm text-muted-foreground">Clinic</span>
                      <span className="max-w-[60%] text-right text-sm font-semibold">
                        {form.clinic || "N/A"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-[22px] border border-border/60 bg-gradient-to-br from-background to-muted/20 p-4">
                      <span className="text-sm text-muted-foreground">Fee</span>
                      <span className="text-sm font-semibold">
                        {form.fee ? `LKR ${form.fee}` : "N/A"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-[22px] border border-border/60 bg-gradient-to-br from-background to-muted/20 p-4">
                      <span className="text-sm text-muted-foreground">Time Range</span>
                      <span className="text-sm font-semibold">
                        {form.startTime && form.endTime
                          ? `${form.startTime} - ${form.endTime}`
                          : "N/A"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-[22px] border border-border/60 bg-gradient-to-br from-background to-muted/20 p-4">
                      <span className="text-sm text-muted-foreground">Session Time</span>
                      <span className="text-sm font-semibold">
                        {form.sessionTime ? `${form.sessionTime} mins` : "N/A"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-[22px] border border-border/60 bg-gradient-to-br from-background to-muted/20 p-4">
                      <span className="text-sm text-muted-foreground">Holiday Count</span>
                      <span className="text-sm font-semibold">{form.holidayDates.length}</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-2xl shadow-sm"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Profile;