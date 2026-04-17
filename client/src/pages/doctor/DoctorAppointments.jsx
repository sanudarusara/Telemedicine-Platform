import { useEffect, useMemo, useState } from "react";
import DoctorDashLayout from "@/components/DoctorDashLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  Eye,
  CalendarDays,
  Clock,
  UserRound,
  Stethoscope,
  Loader2,
  FileText,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Activity,
  ArrowRight,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5400/api";
const getDoctorToken = () =>
  localStorage.getItem("doctor_token") || localStorage.getItem("token") || "";

const statusStyles = {
  confirmed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
  pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400",
  cancelled:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400",
  completed: "border-primary/20 bg-primary/10 text-primary",
  no_show: "border-border bg-muted text-muted-foreground",
};

const pageShell =
  "rounded-[32px] border border-border/60 bg-gradient-to-br from-background via-background to-muted/25 shadow-sm";

const softPanel =
  "rounded-[28px] border border-border/60 bg-gradient-to-br from-background via-background to-muted/20 shadow-sm";

const statCard =
  "rounded-[26px] border border-border/60 bg-gradient-to-br from-background to-muted/20 shadow-sm transition-all";

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");

  const parseResponse = async (response) => {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
    return null;
  };

  const fetchAppointments = async () => {
  try {
    setLoading(true);
    setError("");

    const token = getDoctorToken();

    if (!token) {
      throw new Error("Doctor token missing. Please log in again.");
    }

    // Fetch profile first to get the doctor-service _id (JWT holds auth-service id which differs)
    const profileRes = await fetch(`${API_BASE_URL}/doctors/profile`, {
      method: "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });
    const profileData = await profileRes.json().catch(() => null);
    const doctorId =
      profileData?._id ||
      profileData?.id ||
      profileData?.data?._id ||
      profileData?.data?.id;

    if (!doctorId) {
      throw new Error("Doctor ID not found in profile.");
    }

    const response = await fetch(
      `${API_BASE_URL}/appointments/doctor/${doctorId}/pending`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await parseResponse(response);

    if (!response.ok) {
      throw new Error(
        data?.message || `Request failed with status ${response.status}`
      );
    }

    const appointmentList = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.appointments)
      ? data.appointments
      : Array.isArray(data)
      ? data
      : [];

    setAppointments(appointmentList);
    setSelectedId(appointmentList[0]?._id || null);
  } catch (err) {
    setError(err.message || "Error fetching appointments");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleAccept = async (id) => {
    try {
      setActionLoadingId(id);
      setError("");
      const token = getDoctorToken();
      if (!token) {
        throw new Error("Doctor token missing. Please log in again.");
      }

      const response = await fetch(`${API_BASE_URL}/appointments/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "confirmed" }),
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data?.message || `Request failed with status ${response.status}`);
      }

      setAppointments((prev) =>
        prev.map((appointment) =>
          appointment._id === id
            ? { ...appointment, status: "confirmed" }
            : appointment
        )
      );
    } catch (err) {
      setError(err.message || "Error accepting appointment");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id) => {
    try {
      setActionLoadingId(id);
      setError("");
      const token = getDoctorToken();
      if (!token) {
        throw new Error("Doctor token missing. Please log in again.");
      }

      const response = await fetch(`${API_BASE_URL}/appointments/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "cancelled" }),
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data?.message || `Request failed with status ${response.status}`);
      }

      setAppointments((prev) =>
        prev.map((appointment) =>
          appointment._id === id
            ? { ...appointment, status: "cancelled" }
            : appointment
        )
      );
    } catch (err) {
      setError(err.message || "Error rejecting appointment");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = useMemo(() => {
    if (filter === "all") return appointments;
    return appointments.filter((appointment) => appointment.status === filter);
  }, [appointments, filter]);

  const selected = useMemo(
    () => appointments.find((appointment) => appointment._id === selectedId),
    [appointments, selectedId]
  );

  const stats = useMemo(() => {
    return {
      total: appointments.length,
      pending: appointments.filter((a) => a.status === "pending").length,
      confirmed: appointments.filter((a) => a.status === "confirmed").length,
      cancelled: appointments.filter((a) => a.status === "cancelled").length,
    };
  }, [appointments]);

  const formatDate = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getPatientDisplayName = (appointment) => {
    return (
      appointment.patientName ||
      appointment.patient?.name ||
      appointment.patient?.fullName ||
      appointment.patient?.firstName ||
      appointment.user?.name ||
      appointment.user?.fullName ||
      (appointment.patientId ? `Patient ${String(appointment.patientId).slice(-6)}` : "Unknown Patient")
    );
  };

  const getPatientAge = (appointment) => {
    return appointment.patientAge || appointment.patient?.age || appointment.user?.age || "N/A";
  };

  const getPatientEmail = (appointment) => {
    return appointment.patient?.email || appointment.user?.email || "N/A";
  };

  const getAppointmentType = (appointment) => {
    return appointment.type || appointment.appointmentType || "Consultation";
  };

  const getAppointmentNotes = (appointment) => {
    return appointment.note || appointment.notes || "No notes available";
  };

  const getAppointmentDateValue = (appointment) => {
    return (
      appointment.scheduledTime ||
      appointment.date ||
      appointment.appointmentDate ||
      appointment.createdAt ||
      null
    );
  };

  const getCenterDisplay = (appointment) => {
    return (
      appointment.centerName ||
      appointment.center?.name ||
      appointment.clinic ||
      appointment.centerId ||
      "N/A"
    );
  };

  const filterOptions = ["all", "pending", "confirmed", "cancelled"];

  return (
    <DoctorDashLayout title="Appointments">
      <div className="space-y-8 p-3 md:p-5 xl:p-6">
        <section className={`${pageShell} overflow-hidden p-6 md:p-8`}>
          <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl space-y-5">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-sm">
                <ClipboardList className="h-3.5 w-3.5" />
                Appointment Workspace
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                  Manage appointments with clarity
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                  Review patient requests, confirm or reject appointments, and only open
                  detailed information when needed.
                </p>
              </div>
            </div>

            <Card className="w-full max-w-md rounded-[28px] border border-border/60 bg-gradient-to-br from-primary/[0.06] via-background to-muted/20 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 ring-1 ring-primary/10">
                    <Activity className="h-7 w-7 text-primary" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-base font-semibold">Today’s snapshot</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Track requests and take action quickly from your appointment dashboard.
                    </p>
                    <Badge className="rounded-full px-3 py-1.5 text-xs">
                      {stats.total} appointments available
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className={statCard}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Total Appointments</p>
                <p className="mt-3 text-3xl font-bold tracking-tight">{stats.total}</p>
              </CardContent>
            </Card>

            <Card className={statCard}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="mt-3 text-3xl font-bold tracking-tight">{stats.pending}</p>
              </CardContent>
            </Card>

            <Card className={statCard}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="mt-3 text-3xl font-bold tracking-tight">{stats.confirmed}</p>
              </CardContent>
            </Card>

            <Card className={statCard}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Cancelled</p>
                <p className="mt-3 text-3xl font-bold tracking-tight">{stats.cancelled}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <Card className={`${softPanel} overflow-hidden`}>
          <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
            <div>
              <p className="text-sm font-semibold">Filter appointments</p>
              <p className="text-xs text-muted-foreground">
                Quickly switch between appointment states
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {filterOptions.map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setFilter(f);
                    setSelectedId(null);
                  }}
                  className="rounded-full px-4 capitalize shadow-sm"
                >
                  {f}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-[24px] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center rounded-[28px] border border-dashed border-border/70 bg-gradient-to-br from-background to-muted/20 py-24 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading appointments...
              </div>
            ) : filtered.length > 0 ? (
              filtered.map((apt) => {
                const patientName = getPatientDisplayName(apt);
                const dateValue = getAppointmentDateValue(apt);
                const isSelected = selectedId === apt._id;

                return (
                  <Card
                    key={apt._id}
                    className={`group cursor-pointer overflow-hidden rounded-[28px] border transition-all duration-200 ${
                      isSelected
                        ? "border-primary/30 bg-gradient-to-br from-primary/[0.05] via-background to-muted/25 shadow-md ring-2 ring-primary/10"
                        : "border-border/60 bg-gradient-to-br from-background via-background to-muted/15 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
                    }`}
                    onClick={() => setSelectedId(apt._id)}
                  >
                    <CardContent className="p-5 md:p-6">
                      <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-bold text-primary ring-1 ring-primary/10">
                              {patientName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </div>

                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-base font-semibold text-foreground md:text-lg">
                                  {patientName}
                                </p>
                                <Badge
                                  variant="outline"
                                  className={`rounded-full px-3 py-1 ${statusStyles[apt.status] || "border-border bg-muted text-muted-foreground"}`}
                                >
                                  {apt.status}
                                </Badge>
                              </div>

                              <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground md:text-sm">
                                <span className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  {formatDate(dateValue)}
                                </span>
                                <span className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5">
                                  <Clock className="h-3.5 w-3.5" />
                                  {formatTime(dateValue)}
                                </span>
                                <span className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5">
                                  <Stethoscope className="h-3.5 w-3.5" />
                                  {getAppointmentType(apt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <Button
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            className="rounded-full px-4 shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(apt._id);
                            }}
                          >
                            <Eye className="mr-1.5 h-4 w-4" />
                            {isSelected ? "Opened" : "View Details"}
                          </Button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
                          <p className="text-sm text-muted-foreground">
                            Review and take action on this appointment request
                          </p>

                          {apt.status === "pending" ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                size="sm"
                                className="rounded-full bg-emerald-600 px-4 text-white shadow-sm hover:bg-emerald-700"
                                disabled={actionLoadingId === apt._id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAccept(apt._id);
                                }}
                              >
                                <Check className="mr-1.5 h-4 w-4" />
                                {actionLoadingId === apt._id ? "Saving..." : "Accept"}
                              </Button>

                              <Button
                                size="sm"
                                variant="destructive"
                                className="rounded-full px-4 shadow-sm"
                                disabled={actionLoadingId === apt._id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReject(apt._id);
                                }}
                              >
                                <X className="mr-1.5 h-4 w-4" />
                                {actionLoadingId === apt._id ? "Saving..." : "Reject"}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                              <span>Open for more details</span>
                              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="rounded-[28px] border border-dashed border-border/70 bg-gradient-to-br from-background to-muted/20 p-14 text-center text-muted-foreground shadow-sm">
                No appointments found.
              </div>
            )}
          </div>

          <div className="xl:sticky xl:top-20 xl:self-start">
            {selected ? (
              <Card className={`${pageShell} overflow-hidden`}>
                <CardHeader className="border-b border-border/50 pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                    <Eye className="h-5 w-5 text-primary" />
                    Appointment Details
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6 p-6">
                  <div className="rounded-[28px] border border-border/60 bg-gradient-to-br from-primary/[0.04] via-background to-muted/25 p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-lg font-bold text-primary ring-1 ring-primary/10">
                        {getPatientDisplayName(selected)
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold text-foreground">
                          {getPatientDisplayName(selected)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Patient age: {getPatientAge(selected)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Patient email: {getPatientEmail(selected)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {[
                      {
                        label: "Type",
                        value: getAppointmentType(selected),
                        icon: <Stethoscope className="h-4 w-4" />,
                      },
                      {
                        label: "Date",
                        value: formatDate(getAppointmentDateValue(selected)),
                        icon: <CalendarDays className="h-4 w-4" />,
                      },
                      {
                        label: "Time",
                        value: formatTime(getAppointmentDateValue(selected)),
                        icon: <Clock className="h-4 w-4" />,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between rounded-[22px] border border-border/60 bg-gradient-to-br from-background to-muted/20 p-4"
                      >
                        <span className="flex items-center gap-2 text-sm text-muted-foreground">
                          {item.icon}
                          {item.label}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {item.value}
                        </span>
                      </div>
                    ))}

                    <div className="flex items-center justify-between rounded-[22px] border border-border/60 bg-gradient-to-br from-background to-muted/20 p-4">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge
                        variant="outline"
                        className={`rounded-full px-3 py-1 ${statusStyles[selected.status] || "border-border bg-muted text-muted-foreground"}`}
                      >
                        {selected.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-[22px] border border-border/60 bg-gradient-to-br from-background to-muted/20 p-4">
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <UserRound className="h-4 w-4" />
                        Patient
                      </span>
                      <span className="max-w-[60%] break-all text-right text-sm font-medium text-foreground">
                        {getPatientDisplayName(selected)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-[22px] border border-border/60 bg-gradient-to-br from-background to-muted/20 p-4">
                      <span className="text-sm text-muted-foreground">Center / Clinic</span>
                      <span className="max-w-[60%] break-all text-right text-sm font-medium text-foreground">
                        {getCenterDisplay(selected)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-[22px] border border-border/60 bg-gradient-to-br from-background to-muted/20 p-4">
                      <span className="text-sm text-muted-foreground">Slot ID</span>
                      <span className="max-w-[60%] break-all text-right text-sm font-medium text-foreground">
                        {selected.slotId || "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-border/60 bg-gradient-to-br from-background to-muted/20 p-4">
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                      <FileText className="h-4 w-4 text-primary" />
                      Notes
                    </p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {getAppointmentNotes(selected)}
                    </p>
                  </div>

                  {selected.status === "pending" && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Button
                        className="rounded-2xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                        disabled={actionLoadingId === selected._id}
                        onClick={() => handleAccept(selected._id)}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {actionLoadingId === selected._id ? "Saving..." : "Accept Appointment"}
                      </Button>

                      <Button
                        variant="destructive"
                        className="rounded-2xl shadow-sm"
                        disabled={actionLoadingId === selected._id}
                        onClick={() => handleReject(selected._id)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        {actionLoadingId === selected._id ? "Saving..." : "Reject Appointment"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-[30px] border border-dashed border-border/70 bg-gradient-to-br from-background to-muted/20 shadow-sm">
                <CardContent className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 ring-1 ring-primary/10">
                    <Eye className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Select an appointment</h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                    Appointment details will appear here after you click a card from the list.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DoctorDashLayout>
  );
};

export default Appointments;