import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity, Calendar, Stethoscope, AlertCircle, Loader2,
  ChevronDown, ChevronUp, ClipboardList,
} from "lucide-react";
import { getMedicalHistory } from "@/services/patientService";

const PatientMedicalHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();

  const userId = user._id || user.id || user.userId;

  useEffect(() => {
    if (!userId) {
      setError("User not found. Please log in again.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await getMedicalHistory(userId);
        setHistory(data);
      } catch (e) {
        setError(e?.message || "Failed to load medical history");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const toggle = (id) => setExpanded((prev) => (prev === id ? null : id));

  return (
    <DashboardLayout title="Medical History">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Medical History</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your complete medical record history across all visits
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : history.length === 0 ? (
          <Card className="rounded-[28px] border-border/60">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <ClipboardList className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">No medical history recorded yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map((entry, idx) => {
              const id = entry._id || idx;
              const isOpen = expanded === id;
              return (
                <Card
                  key={id}
                  className="rounded-[24px] border-border/60 hover:shadow-md transition-shadow"
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => toggle(id)}
                  >
                    <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Activity className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{entry.condition}</p>
                          {entry.date && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {new Date(entry.date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </CardHeader>
                  </button>

                  {isOpen && (
                    <CardContent className="pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {entry.diagnosis && (
                        <InfoRow label="Diagnosis" value={entry.diagnosis} icon={<Stethoscope className="w-3.5 h-3.5" />} />
                      )}
                      {entry.treatment && (
                        <InfoRow label="Treatment" value={entry.treatment} icon={<Activity className="w-3.5 h-3.5" />} />
                      )}
                      {entry.notes && (
                        <div className="sm:col-span-2">
                          <InfoRow label="Notes" value={entry.notes} />
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

const InfoRow = ({ label, value, icon }) => (
  <div className="rounded-xl bg-muted/40 p-3 space-y-0.5">
    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
      {icon}
      {label}
    </p>
    <p className="text-sm text-foreground">{value}</p>
  </div>
);

export default PatientMedicalHistory;
