import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Stethoscope, ShieldCheck, ShieldX, Search, Loader2,
  AlertCircle, RefreshCw, CheckCircle2, Clock, UserCheck,
} from "lucide-react";
import { getAllUsers, verifyDoctor, updateUserStatus } from "@/services/authAdminService";

const AdminDoctorVerification = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL | PENDING | VERIFIED
  const [actionLoading, setActionLoading] = useState(null);

  const fetchDoctors = async () => {
    setLoading(true);
    setError("");
    try {
      const allUsers = await getAllUsers();
      setDoctors(allUsers.filter((u) => u.role === "DOCTOR"));
    } catch (e) {
      setError(e?.message || "Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDoctors(); }, []);

  const notify = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); };

  const handleVerify = async (doctor) => {
    setActionLoading(`verify-${doctor._id}`);
    setError("");
    try {
      const updated = await verifyDoctor(doctor._id);
      setDoctors((prev) => prev.map((d) => (d._id === doctor._id ? { ...d, ...updated } : d)));
      notify(`Dr. ${doctor.name} has been verified`);
    } catch (e) {
      setError(e?.message || "Failed to verify doctor");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (doctor) => {
    setActionLoading(`status-${doctor._id}`);
    setError("");
    try {
      const updated = await updateUserStatus(doctor._id, !doctor.isActive);
      setDoctors((prev) => prev.map((d) => (d._id === doctor._id ? { ...d, ...updated } : d)));
      notify(`Dr. ${doctor.name} ${updated.isActive ? "activated" : "deactivated"}`);
    } catch (e) {
      setError(e?.message || "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = doctors.filter((d) => {
    const matchSearch =
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.email?.toLowerCase().includes(search.toLowerCase()) ||
      d.specialty?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "ALL" ||
      (filter === "PENDING" && !d.isVerified) ||
      (filter === "VERIFIED" && d.isVerified);
    return matchSearch && matchFilter;
  });

  const pendingCount = doctors.filter((d) => !d.isVerified).length;
  const verifiedCount = doctors.filter((d) => d.isVerified).length;

  return (
    <DashboardLayout title="Doctor Verification">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Doctor Verification</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Review and verify doctor registrations before they can see patients
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-2xl" onClick={fetchDoctors} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Doctors", value: doctors.length, icon: Stethoscope, color: "text-primary" },
            { label: "Pending Verification", value: pendingCount, icon: Clock, color: "text-amber-500" },
            { label: "Verified", value: verifiedCount, icon: ShieldCheck, color: "text-emerald-500" },
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
              placeholder="Search by name, email or specialty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-2xl"
            />
          </div>
          <div className="flex gap-2">
            {["ALL", "PENDING", "VERIFIED"].map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                className="rounded-2xl"
                onClick={() => setFilter(f)}
              >
                {f === "ALL" ? "All" : f === "PENDING" ? "Pending" : "Verified"}
                {f === "PENDING" && pendingCount > 0 && (
                  <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
                    {pendingCount}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((doctor) => (
              <Card key={doctor._id} className="rounded-[24px] border-border/60 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Stethoscope className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{doctor.name}</p>
                        <p className="text-xs text-muted-foreground">{doctor.email}</p>
                        {doctor.specialty && (
                          <p className="text-xs text-primary font-medium mt-0.5">{doctor.specialty}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge
                        variant="outline"
                        className={
                          doctor.isVerified
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 text-xs"
                            : "border-amber-200 bg-amber-50 text-amber-700 text-xs"
                        }
                      >
                        {doctor.isVerified ? (
                          <><ShieldCheck className="w-3 h-3 mr-1" />Verified</>
                        ) : (
                          <><Clock className="w-3 h-3 mr-1" />Pending</>
                        )}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          doctor.isActive
                            ? "border-blue-200 bg-blue-50 text-blue-700 text-xs"
                            : "border-rose-200 bg-rose-50 text-rose-700 text-xs"
                        }
                      >
                        {doctor.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    {!doctor.isVerified && (
                      <Button
                        size="sm"
                        className="rounded-xl flex-1"
                        disabled={actionLoading === `verify-${doctor._id}`}
                        onClick={() => handleVerify(doctor)}
                      >
                        {actionLoading === `verify-${doctor._id}` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <><ShieldCheck className="w-3.5 h-3.5 mr-1.5" />Verify</>
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl flex-1"
                      disabled={actionLoading === `status-${doctor._id}`}
                      onClick={() => handleToggleStatus(doctor)}
                    >
                      {actionLoading === `status-${doctor._id}` ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : doctor.isActive ? (
                        <><UserCheck className="w-3.5 h-3.5 mr-1.5" />Deactivate</>
                      ) : (
                        <><UserCheck className="w-3.5 h-3.5 mr-1.5" />Activate</>
                      )}
                    </Button>
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
