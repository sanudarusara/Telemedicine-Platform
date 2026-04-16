import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, UserCheck, UserX, ShieldCheck, Activity, Loader2,
  ArrowRight, RefreshCw,
} from "lucide-react";
import { getAllUsers } from "@/services/authAdminService";
import { getAllPatients } from "@/services/patientService";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const adminUser = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [u, p] = await Promise.all([getAllUsers(), getAllPatients()]);
      setUsers(u);
      setPatients(p);
    } catch (e) {
      setError(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const doctorCount = users.filter((u) => u.role === "DOCTOR").length;
  const patientCount = users.filter((u) => u.role === "PATIENT").length;
  const activeCount = users.filter((u) => u.isActive).length;
  const pendingVerify = users.filter((u) => u.role === "DOCTOR" && !u.isVerified).length;

  const stats = [
    { label: "Total Users", value: users.length, icon: Users, color: "text-primary" },
    { label: "Patients", value: patientCount, icon: UserCheck, color: "text-accent" },
    { label: "Doctors", value: doctorCount, icon: Activity, color: "text-blue-500" },
    { label: "Pending Verify", value: pendingVerify, icon: ShieldCheck, color: "text-warning" },
  ];

  const recentUsers = [...users]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Welcome, {adminUser?.name?.split(" ")[0] || "Admin"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Platform overview — {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-2xl" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="rounded-[24px] border-border/60 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                    <p className={`text-3xl font-bold mt-0.5 ${loading ? "text-muted-foreground/50" : "text-foreground"}`}>
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : s.value}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${s.color}`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickLink
            title="User Management"
            desc="Manage accounts, roles & status"
            icon={<Users className="w-5 h-5 text-primary" />}
            onClick={() => navigate("/admin/users")}
          />
          <QuickLink
            title="Audit Logs"
            desc="View system-wide activity logs"
            icon={<Activity className="w-5 h-5 text-blue-500" />}
            onClick={() => navigate("/admin/audit")}
          />
          <QuickLink
            title="Patient Records"
            desc="Browse all patient profiles"
            icon={<UserCheck className="w-5 h-5 text-accent" />}
            onClick={() => navigate("/admin/patients")}
          />
        </div>

        {/* Recent Users */}
        <Card className="rounded-[28px] border-border/60">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 className="font-semibold text-foreground">Recently Registered</h3>
            <Button variant="ghost" size="sm" className="text-xs rounded-xl" onClick={() => navigate("/admin/users")}>
              View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
          {loading ? (
            <CardContent className="pb-5">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            </CardContent>
          ) : (
            <CardContent className="pt-0 pb-4 px-4">
              <div className="space-y-1">
                {recentUsers.map((u) => (
                  <div
                    key={u._id}
                    className="flex items-center justify-between rounded-2xl px-3 py-2.5 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                        {u.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 rounded-full ${
                          u.role === "ADMIN"
                            ? "border-violet-200 bg-violet-50 text-violet-700"
                            : u.role === "DOCTOR"
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {u.role}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 rounded-full ${
                          u.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                        }`}
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                ))}
                {recentUsers.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">No users found</p>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

const QuickLink = ({ title, desc, icon, onClick }) => (
  <Card
    className="rounded-[24px] border-border/60 hover:shadow-md transition-all cursor-pointer group"
    onClick={onClick}
  >
    <CardContent className="p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
    </CardContent>
  </Card>
);

export default AdminDashboard;
