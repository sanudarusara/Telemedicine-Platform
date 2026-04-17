import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Stethoscope, ShieldCheck, ShieldX, Search, Loader2,
  AlertCircle, RefreshCw, CheckCircle2, Clock, Building,
  Phone, DollarSign, Calendar,
} from "lucide-react";
import {
  getDoctorProfiles,
  approveDoctorProfile,
  rejectDoctorProfile,
} from "@/services/authAdminService";

const DAY_LABELS = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

const AdminDoctorVerification = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("pending");
  const [actionLoading, setActionLoading] = useState(null);

  const fetchDoctors = async () => {
    setLoading(true);
    setError("");
    try {
      const all = await getDoctorProfiles("all");
      setDoctors(all);
    } catch (e) {
      setError(e?.message || "Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDoctors(); }, []);

  const notify = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 4000); };

 const handleApprove = async (doctor) => {
  setActionLoading(`approve-${doctor._id}`);
  setError("");

  try {
    const result = await approveDoctorProfile(doctor._id);

    const slotsGenerated = Number(
      result?.slotsGenerated ??
      result?.data?.slotsGenerated ??
      0
    );

    setDoctors((prev) =>
      prev.map((d) =>
        d._id === doctor._id
          ? { ...d, status: "approved", isActive: true }
          : d
      )
    );

    notify(
      `Dr. ${doctor.name} approved. ${slotsGenerated} slots generated for the next 30 days.`
    );
  } catch (e) {
    console.error("Approve doctor failed:", e);
    setError(e?.message || "Failed to approve doctor");
  } finally {
    setActionLoading(null);
  }
};

  const handleReject = async (doctor) => {
    setActionLoading(`reject-${doctor._id}`);
    setError("");
    try {
      await rejectDoctorProfile(doctor._id);
      setDoctors((prev) =>
        prev.map((d) => (d._id === doctor._id ? { ...d, status: "rejected", isActive: false } : d))
      );
      notify(`Dr. ${doctor.name}'s registration has been rejected.`);
    } catch (e) {
      setError(e?.message || "Failed to reject doctor");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = doctors.filter((d) => {
    const matchSearch =
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.email?.toLowerCase().includes(search.toLowerCase()) ||
      d.specialization?.toLowerCase().includes(search.toLowerCase()) ||
      d.clinic?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || d.status === filter;
    return matchSearch && matchFilter;
  });

  const pendingCount = doctors.filter((d) => d.status === "pending").length;
  const approvedCount = doctors.filter((d) => d.status === "approved").length;
  const rejectedCount = doctors.filter((d) => d.status === "rejected").length;

  const statusBadge = (status) => {
    if (status === "approved")
      return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs" variant="outline"><ShieldCheck className="w-3 h-3 mr-1" />Approved</Badge>;
    if (status === "rejected")
      return <Badge className="border-rose-200 bg-rose-50 text-rose-700 text-xs" variant="outline"><ShieldX className="w-3 h-3 mr-1" />Rejected</Badge>;
    return <Badge className="border-amber-200 bg-amber-50 text-amber-700 text-xs" variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  return (
    <DashboardLayout title="Doctor Verification">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Doctor Verification</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Review and approve doctor registrations. Approved doctors get slots auto-generated.
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-2xl" onClick={fetchDoctors} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total", value: doctors.length, icon: Stethoscope, color: "text-primary" },
            { label: "Pending", value: pendingCount, icon: Clock, color: "text-amber-500" },
            { label: "Approved", value: approvedCount, icon: ShieldCheck, color: "text-emerald-500" },
            { label: "Rejected", value: rejectedCount, icon: ShieldX, color: "text-rose-500" },
          ].map((s) => (
            <Card key={s.label} className="rounded-[24px] border-border/60">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                  <p className="text-3xl font-bold mt-0.5 text-foreground">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : s.value}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, specialty, or clinic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-2xl"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "pending", label: "Pending", count: pendingCount },
              { key: "approved", label: "Approved" },
              { key: "rejected", label: "Rejected" },
              { key: "all", label: "All" },
            ].map((f) => (
              <Button
                key={f.key}
                variant={filter === f.key ? "default" : "outline"}
                size="sm"
                className="rounded-2xl"
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                {f.count > 0 && (
                  <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
                    {f.count}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Doctor Cards */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No doctors found</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((doctor) => (
              <Card key={doctor._id} className="rounded-[24px] border-border/60 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Stethoscope className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{doctor.name}</p>
                        <p className="text-xs text-muted-foreground">{doctor.email}</p>
                        <p className="text-xs text-primary font-medium mt-0.5">{doctor.specialization}</p>
                      </div>
                    </div>
                    {statusBadge(doctor.status)}
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{doctor.clinic}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{doctor.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 shrink-0" />
                      <span>Rs. {Number(doctor.fee).toLocaleString()} / session</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{doctor.startTime} – {doctor.endTime} ({doctor.sessionTime} min)</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {(doctor.workingDays || []).map((d) => DAY_LABELS[d] || d).join(", ")}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {doctor.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          className="rounded-xl flex-1 bg-emerald-600 hover:bg-emerald-700"
                          disabled={actionLoading === `approve-${doctor._id}`}
                          onClick={() => handleApprove(doctor)}
                        >
                          {actionLoading === `approve-${doctor._id}` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <><ShieldCheck className="w-3.5 h-3.5 mr-1.5" />Approve & Generate Slots</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                          disabled={actionLoading === `reject-${doctor._id}`}
                          onClick={() => handleReject(doctor)}
                        >
                          {actionLoading === `reject-${doctor._id}` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <><ShieldX className="w-3.5 h-3.5 mr-1.5" />Reject</>
                          )}
                        </Button>
                      </>
                    )}
                    {doctor.status === "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl flex-1 border-rose-200 text-rose-600 hover:bg-rose-50"
                        disabled={actionLoading === `reject-${doctor._id}`}
                        onClick={() => handleReject(doctor)}
                      >
                        {actionLoading === `reject-${doctor._id}` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <><ShieldX className="w-3.5 h-3.5 mr-1.5" />Revoke Approval</>
                        )}
                      </Button>
                    )}
                    {doctor.status === "rejected" && (
                      <Button
                        size="sm"
                        className="rounded-xl flex-1 bg-emerald-600 hover:bg-emerald-700"
                        disabled={actionLoading === `approve-${doctor._id}`}
                        onClick={() => handleApprove(doctor)}
                      >
                        {actionLoading === `approve-${doctor._id}` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <><ShieldCheck className="w-3.5 h-3.5 mr-1.5" />Re-approve</>
                        )}
                      </Button>
                    )}
                  </div>

                  {doctor.createdAt && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Registered: {new Date(doctor.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDoctorVerification;
