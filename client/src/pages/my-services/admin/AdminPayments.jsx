import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CreditCard, DollarSign, CheckCircle2, XCircle, Clock,
  Search, Loader2, AlertCircle, RefreshCw, TrendingUp,
} from "lucide-react";
import { getAllPayments, updatePaymentStatus } from "@/services/paymentService";

const STATUS_COLORS = {
  SUCCESS:   "border-emerald-200 bg-emerald-50 text-emerald-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING:   "border-amber-200 bg-amber-50 text-amber-700",
  FAILED:    "border-rose-200 bg-rose-50 text-rose-700",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
  REFUNDED:  "border-violet-200 bg-violet-50 text-violet-700",
};

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionLoading, setActionLoading] = useState(null);

  const fetchPayments = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllPayments();
      setPayments(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);

  const notify = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); };

  const handleStatusChange = async (payment, newStatus) => {
    setActionLoading(`${payment._id}-${newStatus}`);
    setError("");
    try {
      const updated = await updatePaymentStatus(payment._id, newStatus);
      setPayments((prev) =>
        prev.map((p) => (p._id === payment._id ? { ...p, ...(updated || { status: newStatus }) } : p))
      );
      notify(`Payment ${payment._id.slice(-6)} marked as ${newStatus}`);
    } catch (e) {
      setError(e?.message || "Failed to update payment");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = payments.filter((p) => {
    const matchSearch =
      p._id?.toLowerCase().includes(search.toLowerCase()) ||
      p.appointmentId?.toLowerCase().includes(search.toLowerCase()) ||
      p.userId?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalRevenue = payments
    .filter((p) => p.status === "SUCCESS" || p.status === "COMPLETED")
    .reduce((acc, p) => acc + (p.amount || 0), 0);
  const pendingCount = payments.filter((p) => p.status === "PENDING").length;
  const failedCount = payments.filter((p) => p.status === "FAILED" || p.status === "CANCELLED").length;

  return (
    <DashboardLayout title="Payment Oversight">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Payment Oversight</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor all financial transactions on the platform
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-2xl" onClick={fetchPayments} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Transactions", value: payments.length, icon: CreditCard, color: "text-primary" },
            { label: "Total Revenue (LKR)", value: `${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-500" },
            { label: "Pending", value: pendingCount, icon: Clock, color: "text-amber-500" },
            { label: "Failed / Cancelled", value: failedCount, icon: XCircle, color: "text-rose-500" },
          ].map((s) => (
            <Card key={s.label} className="rounded-[24px] border-border/60">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                  <p className="text-2xl font-bold mt-0.5 text-foreground">
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
              placeholder="Search by payment ID, appointment ID or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-2xl"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["ALL", "SUCCESS", "PENDING", "FAILED", "REFUNDED"].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                className="rounded-2xl"
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No payments found</div>
        ) : (
          <Card className="rounded-[24px] border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Payment ID</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Appointment</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Method</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p._id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        ...{p._id?.slice(-8)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {p.appointmentId ? `...${String(p.appointmentId).slice(-8)}` : "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        LKR {(p.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs capitalize">
                        {p.paymentMethod || p.provider || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs ${STATUS_COLORS[p.status] || "border-gray-200 bg-gray-50 text-gray-700"}`}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {p.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 rounded-xl text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                disabled={!!actionLoading}
                                onClick={() => handleStatusChange(p, "SUCCESS")}
                              >
                                {actionLoading === `${p._id}-SUCCESS` ? <Loader2 className="w-3 h-3 animate-spin" /> : "Approve"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 rounded-xl text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                                disabled={!!actionLoading}
                                onClick={() => handleStatusChange(p, "FAILED")}
                              >
                                {actionLoading === `${p._id}-FAILED` ? <Loader2 className="w-3 h-3 animate-spin" /> : "Reject"}
                              </Button>
                            </>
                          )}
                          {(p.status === "SUCCESS" || p.status === "COMPLETED") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 rounded-xl text-xs border-violet-200 text-violet-700 hover:bg-violet-50"
                              disabled={!!actionLoading}
                              onClick={() => handleStatusChange(p, "REFUNDED")}
                            >
                              {actionLoading === `${p._id}-REFUNDED` ? <Loader2 className="w-3 h-3 animate-spin" /> : "Refund"}
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

export default AdminPayments;
