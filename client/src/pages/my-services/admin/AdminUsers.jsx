import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users, UserCheck, UserX, ShieldCheck, Search, Loader2,
  AlertCircle, RefreshCw, CheckCircle2, ChevronDown,
} from "lucide-react";
import {
  getAllUsers, updateUserStatus, updateUserRole, verifyDoctor,
} from "@/services/authAdminService";

const ROLES = ["PATIENT", "DOCTOR", "ADMIN"];

const roleColors = {
  ADMIN: "border-violet-200 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20",
  DOCTOR: "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  PATIENT: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
};

const statusColors = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  inactive: "border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [actionLoading, setActionLoading] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (e) {
      setError(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const notify = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleToggleStatus = async (user) => {
    setActionLoading(`status-${user._id}`);
    setError("");
    try {
      const updated = await updateUserStatus(user._id, !user.isActive);
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, ...updated } : u)));
      notify(`${user.name} ${updated.isActive ? "activated" : "deactivated"}`);
    } catch (e) {
      setError(e?.message || "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeRole = async (user, role) => {
    if (role === user.role) return;
    setActionLoading(`role-${user._id}`);
    setError("");
    try {
      const updated = await updateUserRole(user._id, role);
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, ...updated } : u)));
      notify(`${user.name}'s role changed to ${role}`);
    } catch (e) {
      setError(e?.message || "Failed to update role");
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerify = async (user) => {
    setActionLoading(`verify-${user._id}`);
    setError("");
    try {
      const updated = await verifyDoctor(user._id);
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, ...updated } : u)));
      notify(`Dr. ${user.name} verified`);
    } catch (e) {
      setError(e?.message || "Failed to verify doctor");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = users.filter((u) => {
    const matchRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  // Stat counts
  const totalActive = users.filter((u) => u.isActive).length;
  const pendingDoctors = users.filter((u) => u.role === "DOCTOR" && !u.isVerified).length;

  return (
    <DashboardLayout title="User Management">
      <div className="space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={users.length} icon={<Users className="w-5 h-5" />} color="text-primary" />
          <StatCard label="Active" value={totalActive} icon={<UserCheck className="w-5 h-5" />} color="text-accent" />
          <StatCard label="Inactive" value={users.length - totalActive} icon={<UserX className="w-5 h-5" />} color="text-destructive" />
          <StatCard label="Doctors Pending" value={pendingDoctors} icon={<ShieldCheck className="w-5 h-5" />} color="text-warning" />
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-10 rounded-2xl border-border/60"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {["ALL", ...ROLES].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  roleFilter === r
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border/60 hover:bg-muted"
                }`}
              >
                {r}
              </button>
            ))}
            <Button variant="outline" size="icon" className="rounded-2xl" onClick={fetchUsers}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
            <CheckCircle2 className="w-4 h-4 shrink-0" />{success}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-[28px] border-border/60">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">No users found.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-[28px] border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">User</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Joined</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.map((u) => (
                    <tr key={u._id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                            {u.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{u.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 rounded-full ${roleColors[u.role] ?? ""}`}
                          >
                            {u.role}
                          </Badge>
                          {u.role === "DOCTOR" && u.isVerified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-accent" title="Verified" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 rounded-full ${u.isActive ? statusColors.active : statusColors.inactive}`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Toggle active/inactive */}
                          <Button
                            variant="outline"
                            size="sm"
                            className={`rounded-xl h-7 text-xs px-2.5 ${u.isActive ? "text-destructive hover:bg-destructive/10" : "text-accent hover:bg-accent/10"}`}
                            disabled={actionLoading === `status-${u._id}`}
                            onClick={() => handleToggleStatus(u)}
                          >
                            {actionLoading === `status-${u._id}` ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : u.isActive ? (
                              "Deactivate"
                            ) : (
                              "Activate"
                            )}
                          </Button>

                          {/* Role selector */}
                          <div className="relative">
                            <select
                              className="h-7 text-xs rounded-xl border border-border/60 bg-background pl-2 pr-6 appearance-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                              value={u.role}
                              disabled={actionLoading === `role-${u._id}`}
                              onChange={(e) => handleChangeRole(u, e.target.value)}
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                          </div>

                          {/* Verify doctor */}
                          {u.role === "DOCTOR" && !u.isVerified && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl h-7 text-xs px-2.5 text-accent hover:bg-accent/10"
                              disabled={actionLoading === `verify-${u._id}`}
                              onClick={() => handleVerify(u)}
                            >
                              {actionLoading === `verify-${u._id}` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                "Verify"
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

const StatCard = ({ label, value, icon, color }) => (
  <Card className="rounded-[24px] border-border/60">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default AdminUsers;
