import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pill, Calendar, User, ClipboardCheck, AlertCircle, Loader2,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { getPrescriptions } from "@/services/patientService";

const PatientPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
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
        const data = await getPrescriptions(userId);
        setPrescriptions(data);
      } catch (e) {
        setError(e?.message || "Failed to load prescriptions");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const toggle = (id) => setExpanded((prev) => (prev === id ? null : id));

  return (
    <DashboardLayout title="My Prescriptions">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Prescriptions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            All prescriptions issued by your doctors
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
        ) : prescriptions.length === 0 ? (
          <Card className="rounded-[28px] border-border/60">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <ClipboardCheck className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">No prescriptions found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {prescriptions.map((rx, idx) => {
              const id = rx._id || idx;
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
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Pill className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{rx.medication}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {rx.prescribedAt && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(rx.prescribedAt).toLocaleDateString()}
                              </span>
                            )}
                            {rx.dosage && (
                              <Badge variant="secondary" className="text-[10px] px-2 rounded-full">
                                {rx.dosage}
                              </Badge>
                            )}
                          </div>
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
                      {rx.frequency && (
                        <InfoRow label="Frequency" value={rx.frequency} />
                      )}
                      {rx.dosage && (
                        <InfoRow label="Dosage" value={rx.dosage} />
                      )}
                      {rx.notes && (
                        <div className="sm:col-span-2">
                          <InfoRow label="Notes" value={rx.notes} />
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

const InfoRow = ({ label, value }) => (
  <div className="rounded-xl bg-muted/40 p-3 space-y-0.5">
    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
    <p className="text-sm text-foreground">{value}</p>
  </div>
);

export default PatientPrescriptions;
