import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, FileText, Video, Clock, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getAppointments } from "@/services/appointmentsService";

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }, []);

  useEffect(() => {
    async function fetchAppointments() {
      if (!user) return;
      setLoading(true);
      setError("");
      try {
        // try common id fields
        const patientId = user._id || user.id || user.patientId || user.userId || null;
        const data = await getAppointments({ patientId });
        setAppointments(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e?.message || "Failed to load appointments");
      } finally {
        setLoading(false);
      }
    }

    fetchAppointments();
  }, [user]);

  const upcomingCount = appointments.filter((a) => {
    const status = (a.status || "").toLowerCase();
    return status !== "cancelled" && status !== "canceled" && new Date(a.date || a.time || Date.now()) >= new Date();
  }).length;

  const nextAppointment = useMemo(() => {
    if (!appointments || appointments.length === 0) return null;
    const sorted = appointments
      .slice()
      .filter((a) => a.date)
      .sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime());
    return sorted.length ? sorted[0] : appointments[0];
  }, [appointments]);

  const assignedDoctor = nextAppointment?.doctorName || (appointments[0] && (appointments[0].doctorName || appointments[0].doctor?.name)) || "Not assigned";
  const nextVisitLabel = nextAppointment ? new Date(nextAppointment.date).toLocaleString() : "Not scheduled";

  const stats = [
    { label: "Upcoming Appointments", value: String(upcomingCount || 0), icon: CalendarDays, color: "text-primary" },
    { label: "Assigned Doctor", value: assignedDoctor, icon: Users, color: "text-accent" },
    { label: "Prescriptions", value: "—", icon: FileText, color: "text-warning" },
    { label: "Next Visit", value: nextVisitLabel, icon: Clock, color: "text-success" },
  ];

  return (
    <DashboardLayout title="Patient Dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Welcome back{user && user.name ? `, ${user.name.split(' ')[0]}` : ''}</h2>
          <p className="text-muted-foreground text-sm mt-1">Overview of your upcoming care</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-border/60 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</p>
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
              <CardTitle className="text-base font-semibold">My Appointments</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/appointments')}>
                View All
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-sm text-muted-foreground py-6">Loading appointments...</div>
              ) : error ? (
                <div className="text-sm text-destructive py-6">{error}</div>
              ) : !appointments || appointments.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6">No appointments found</div>
              ) : (
                appointments.slice(0, 3).map((apt) => (
                  <div key={apt._id || apt.id} className="p-3 rounded-lg bg-muted/40 mb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{apt.doctorName || (apt.doctor && apt.doctor.name) || 'Doctor'}</p>
                        <p className="text-xs text-muted-foreground">{apt.consultationType || apt.type || 'Consultation'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">{apt.time || (apt.date ? new Date(apt.date).toLocaleTimeString() : '')}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${apt.status === 'confirmed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                          {apt.status || 'pending'}
                        </span>
                      </div>
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
              <Button variant="outline" className="w-full justify-start gap-3 h-11" onClick={() => navigate('/appointments/consultation')}>
                <CalendarDays className="w-4 h-4 text-primary" />
                Book Consultation
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-11" onClick={() => navigate('/appointments')}>
                <FileText className="w-4 h-4 text-accent" />
                My Appointments
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-11" onClick={() => navigate('/video-consultation')}>
                <Video className="w-4 h-4 text-success" />
                Video Consults
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientDashboard;
