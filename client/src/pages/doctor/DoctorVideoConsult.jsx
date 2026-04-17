import { useEffect, useState } from "react";
import DoctorDashLayout from "@/components/DoctorDashLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Video,
  Phone,
  PhoneOff,
  User,
  Clock,
  CalendarDays,
  ExternalLink,
  RefreshCcw,
  Loader2,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5400/api";

/** Returns the active doctor JWT, falling back to the generic token if needed. */
const getDoctorToken = () =>
  localStorage.getItem("doctor_token") || localStorage.getItem("token") || "";

const formatDateTime = (value) => {
  if (!value) return { date: "N/A", time: "N/A" };

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return { date: "N/A", time: "N/A" };
  }

  return {
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
};

const getPatientDisplayName = (appointment) => {
  return (
    appointment.patientName ||
    appointment.patient?.name ||
    appointment.patient?.fullName ||
    (appointment.patientId ? `Patient ${String(appointment.patientId).slice(-6)}` : "Patient")
  );
};

const VideoConsultation = () => {
  const [consultations, setConsultations] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState("");
  const [error, setError] = useState("");

  const token = getDoctorToken();

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch doctor profile to get the doctor-service _id (JWT holds auth-service id which differs)
      const profileRes = await fetch(`${API_BASE_URL}/doctors/profile`, {
        method: "GET",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });
      const profileData = await profileRes.json();
      const doctorId =
        profileData?._id ||
        profileData?.id ||
        profileData?.data?._id ||
        profileData?.data?.id;

      if (!doctorId) throw new Error("Doctor ID not found in profile.");

      const response = await fetch(`${API_BASE_URL}/appointments/doctor/${doctorId}/pending`, {
        method: "GET",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to fetch appointments");
      }

      const appointments = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.appointments)
        ? data.appointments
        : Array.isArray(data)
        ? data
        : [];

      setConsultations(
        appointments.filter(
          (a) =>
            (a.consultationType === "video" || a.type === "video" || a.appointmentType === "video") &&
            a.status !== "cancelled"
        )
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const startCall = async (appointment) => {
    try {
      setJoiningId(appointment._id);
      setError("");

      const response = await fetch(`${API_BASE_URL}/telemedicine/create-room`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appointmentId: appointment._id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to create telemedicine room");
      }

      const dateTime = formatDateTime(
        appointment.scheduledTime || appointment.createdAt || appointment.updatedAt
      );

      setActiveCall({
        appointmentId: appointment._id,
        patient: getPatientDisplayName(appointment),
        date: dateTime.date,
        time: dateTime.time,
        status: appointment.status,
        roomName: data?.session?.roomName,
        joinUrl: data?.session?.joinUrl,
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to start video consultation");
    } finally {
      setJoiningId("");
    }
  };

  const endCall = async () => {
    try {
      if (activeCall?.appointmentId) {
        await fetch(`${API_BASE_URL}/telemedicine/appointment/${activeCall.appointmentId}/end`, {
          method: "PATCH",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        });
      }
    } catch (err) {
      console.error("Failed to mark session ended:", err);
    } finally {
      setActiveCall(null);
    }
  };

  return (
    <DoctorDashLayout title="Video Consultation">
      <div className="space-y-6">
        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive">
              {error}
            </CardContent>
          </Card>
        )}

        {activeCall && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex flex-col lg:flex-row gap-5">
                <div className="flex-1">
                  <div className="aspect-video bg-foreground/5 rounded-xl border border-border/60 overflow-hidden">
                    {activeCall.joinUrl ? (
                      <iframe
                        src={activeCall.joinUrl}
                        title="Jitsi Consultation"
                        className="w-full h-full border-0 rounded-xl"
                        allow="camera; microphone; fullscreen; display-capture"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center space-y-3">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                            <Video className="w-8 h-8 text-primary" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Video call with {activeCall.patient}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center gap-3 mt-4 flex-wrap">
                    {activeCall.joinUrl && (
                      <a href={activeCall.joinUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="lg" className="gap-2">
                          Open in Jitsi Meet <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                    )}

                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={endCall}
                      className="gap-2"
                    >
                      <PhoneOff className="w-4 h-4" /> End Call
                    </Button>
                  </div>
                </div>

                <div className="w-full lg:w-72 space-y-3">
                  <h3 className="font-semibold text-foreground">Session Details</h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-foreground">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {activeCall.patient}
                    </div>

                    <div className="flex items-center gap-2 text-foreground">
                      <CalendarDays className="w-4 h-4 text-muted-foreground" />
                      {activeCall.date}
                    </div>

                    <div className="flex items-center gap-2 text-foreground">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {activeCall.time}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/40">
                    <p className="text-xs text-muted-foreground mb-1">Room Name</p>
                    <p className="text-sm font-medium text-foreground break-all">
                      {activeCall.roomName}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Confirmed Consultations
            </h2>

            <Button variant="outline" size="sm" onClick={fetchAppointments}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {loading ? (
            <Card>
              <CardContent className="p-5 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading appointments...
              </CardContent>
            </Card>
          ) : consultations.length === 0 ? (
            <Card>
              <CardContent className="p-5 text-sm text-muted-foreground">
                No confirmed appointments found.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {consultations.map((c) => {
                const dateTime = formatDateTime(
                  c.scheduledTime || c.createdAt || c.updatedAt
                );

                return (
                  <Card
                    key={c._id}
                    className="border-border/60 hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          {getPatientDisplayName(c)
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>

                        <div>
                          <p className="font-medium text-foreground">
                            {getPatientDisplayName(c)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.appointmentNo || "Appointment"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {dateTime.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {dateTime.time}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-success/10 text-success">
                          {c.status}
                        </span>

                        <Button
                          size="sm"
                          className="gap-1 bg-success hover:bg-success/90 text-success-foreground"
                          onClick={() => startCall(c)}
                          disabled={joiningId === c._id}
                        >
                          <Phone className="w-3 h-3" />
                          {joiningId === c._id ? "Joining..." : "Join"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DoctorDashLayout>
  );
};

export default VideoConsultation;