import { useEffect, useMemo, useState } from "react";
import DoctorDashLayout from "@/components/DoctorDashLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Users,
  FileText,
  Video,
  Clock,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import apiClient, { extractErrorMessage } from "@/services/api/apiClient";

const Dashboard = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [doctorName, setDoctorName] = useState("Doctor");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getPatientDisplayName = (appointment) => {
    return (
      appointment.patientName ||
      appointment.patient?.name ||
      appointment.patient?.fullName ||
      appointment.patient?.firstName ||
      (appointment.patientId ? `Patient ${String(appointment.patientId).slice(-6)}` : "Patient")
    );
  };

  const getAppointmentType = (appointment) => {
    return appointment.type || appointment.appointmentType || "Consultation";
  };

  const formatTime = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch profile first to get the doctor-service _id (not the auth-service id from JWT)
      const profileRes = await apiClient.get("/api/doctors/profile");
      const profileData = profileRes.data;
      const doctorId =
        profileData?._id ||
        profileData?.id ||
        profileData?.data?._id ||
        profileData?.data?.id;

      const appointmentsEndpoint = doctorId
        ? `/api/appointments/doctor/${doctorId}/pending`
        : "/api/doctors/appointments"; // fallback

      const [appointmentsRes, prescriptionsRes] = await Promise.all([
        apiClient.get(appointmentsEndpoint),
        apiClient.get("/api/doctors/prescriptions"),
      ]);

      const appointmentsData = appointmentsRes.data;
      const prescriptionsData = prescriptionsRes.data;

      setDoctorName(profileData?.name || profileData?.data?.name || "Doctor");
      setAppointments(
        Array.isArray(appointmentsData?.data)
          ? appointmentsData.data
          : Array.isArray(appointmentsData?.appointments)
          ? appointmentsData.appointments
          : Array.isArray(appointmentsData)
          ? appointmentsData
          : []
      );
      setPrescriptions(
        Array.isArray(prescriptionsData?.prescriptions)
          ? prescriptionsData.prescriptions
          : Array.isArray(prescriptionsData?.data)
          ? prescriptionsData.data
          : Array.isArray(prescriptionsData)
          ? prescriptionsData
          : []
      );
    } catch (err) {
      const errMsg = extractErrorMessage(err, "Failed to load dashboard");
      // 403 from doctor-service means account is pending/rejected
      if (err?.response?.status === 403 && err?.response?.data?.status) {
        setError(`__status__${err.response.data.status}__${err.response.data.message}`);
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const todayAppointments = useMemo(() => {
    const today = new Date();
    return appointments.filter((a) => {
      const value = getAppointmentDateValue(a);
      if (!value) return false;
      const d = new Date(value);
      return (
        !Number.isNaN(d.getTime()) &&
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    });
  }, [appointments]);

  const upcomingAppointments = useMemo(() => {
    return [...appointments]
      .sort((a, b) => {
        const da = new Date(getAppointmentDateValue(a) || 0).getTime();
        const db = new Date(getAppointmentDateValue(b) || 0).getTime();
        return da - db;
      })
      .slice(0, 4);
  }, [appointments]);

  const stats = useMemo(() => {
    const uniquePatients = new Set(
      appointments.map((a) => a.patientId).filter(Boolean).map(String)
    );

    return [
      {
        label: "Today's Appointments",
        value: String(todayAppointments.length),
        icon: CalendarDays,
        color: "text-primary",
      },
      {
        label: "Total Patients",
        value: String(uniquePatients.size),
        icon: Users,
        color: "text-accent",
      },
      {
        label: "Prescriptions",
        value: String(prescriptions.length),
        icon: FileText,
        color: "text-warning",
      },
      {
        label: "Video Consults",
        value: String(
          appointments.filter(
            (a) =>
              (a.type || a.appointmentType || "").toLowerCase().includes("video")
          ).length
        ),
        icon: Video,
        color: "text-success",
      },
    ];
  }, [appointments, prescriptions, todayAppointments]);

  return (
    <DoctorDashLayout title="Dashboard">
      <div className="space-y-6">
        {error && error.startsWith("__status__pending__") && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200">Account Pending Approval</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
                Your registration is under review by our admin team. You'll be able to access your dashboard once approved.
              </p>
            </CardContent>
          </Card>
        )}
        {error && error.startsWith("__status__rejected__") && (
          <Card className="border-rose-200 bg-rose-50 dark:bg-rose-900/20">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold text-rose-800">Registration Rejected</h3>
              <p className="text-sm text-rose-700 mt-2">
                Your registration was not approved. Please contact support for more information.
              </p>
            </CardContent>
          </Card>
        )}
        {error && !error.startsWith("__status__") && (
          <Card className="border-destructive/30 bg-destructive/10">
            <CardContent className="p-4 text-sm text-destructive">
              {error}
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-2xl font-bold text-foreground">Good morning, Dr. {doctorName}</h2>
          <p className="text-muted-foreground text-sm mt-1">Here's your overview for today</p>
        </div>

        {loading ? (
          <Card className="border-border/60">
            <CardContent className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading dashboard...
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <Card key={stat.label} className="border-border/60 hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                          {stat.label}
                        </p>
                        <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                      </div>
                      <div className={`w-11 h-11 rounded-xl bg-muted flex items-center justify-center ${stat.color}`}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-border/60">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base font-semibold">Upcoming Appointments</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/appointments")}>
                    View All
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {upcomingAppointments.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No appointments found.</div>
                  ) : (
                    upcomingAppointments.map((apt) => (
                      <div
                        key={apt._id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                            {getPatientDisplayName(apt)
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {getPatientDisplayName(apt)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getAppointmentType(apt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatTime(getAppointmentDateValue(apt))}
                          </p>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              apt.status === "confirmed"
                                ? "bg-success/10 text-success"
                                : apt.status === "pending"
                                ? "bg-warning/10 text-warning"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {apt.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-11"
                    onClick={() => navigate("/appointments")}
                  >
                    <CalendarDays className="w-4 h-4 text-primary" />
                    Manage Appointments
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-11"
                    onClick={() => navigate("/prescriptions")}
                  >
                    <FileText className="w-4 h-4 text-accent" />
                    Create Prescription
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-11"
                    onClick={() => navigate("/video-consultation")}
                  >
                    <Video className="w-4 h-4 text-success" />
                    Start Video Consult
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-11"
                    onClick={() => navigate("/profile")}
                  >
                    <TrendingUp className="w-4 h-4 text-warning" />
                    View Profile
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DoctorDashLayout>
  );
};

export default Dashboard;