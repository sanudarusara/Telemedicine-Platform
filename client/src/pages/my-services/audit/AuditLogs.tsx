import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getAllLogs, getLogsByUser, getLogsByService, getLogsByAction,
  getLogsByDateRange, deleteLog,
  type AuditLog, type PaginationMeta,
} from "@/services/auditService";
import {
  Activity, Search, Loader2, AlertCircle, RefreshCw,
  Trash2, ChevronLeft, ChevronRight, Filter, Clock,
  CheckCircle2, XCircle, Eye, ChevronDown, ChevronUp,
} from "lucide-react";

const STATUS_COLORS = {
  SUCCESS: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  FAILED: "border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
};

const ROLE_COLORS = {
  ADMIN: "border-violet-200 bg-violet-50 text-violet-700",
  DOCTOR: "border-blue-200 bg-blue-50 text-blue-700",
  PATIENT: "border-emerald-200 bg-emerald-50 text-emerald-700",
  UNKNOWN: "border-gray-200 bg-gray-50 text-gray-700",
};

const FILTER_MODES = ["ALL", "USER", "SERVICE", "ACTION", "DATE_RANGE"] as const;
type FilterMode = (typeof FILTER_MODES)[number];

const KNOWN_SERVICES = [
  "api-gateway",
  "auth-service",
  "patient-management-service",
  "appointment-service",
  "notification-service",
  "payment-service",
  "doctor-service",
];

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0, page: 1, limit: 20, totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter state
  const [filterMode, setFilterMode] = useState<FilterMode>("ALL");
  const [filterValue, setFilterValue] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [page, setPage] = useState(1);

  const isAdmin = (localStorage.getItem("role") || "").toUpperCase() === "ADMIN";

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let resp;
      const params = { page, limit: 20 };
      const val = filterValue.trim();
      if (filterMode === "USER" && val) {
        resp = await getLogsByUser(val, params);
      } else if (filterMode === "SERVICE" && val) {
        resp = await getLogsByService(val, params);
      } else if (filterMode === "ACTION" && val) {
        resp = await getLogsByAction(val, params);
      } else if (filterMode === "DATE_RANGE" && dateStart && dateEnd) {
        resp = await getLogsByDateRange(dateStart, dateEnd, params);
      } else {
        resp = await getAllLogs(params);
      }
      setLogs(resp.data);
      setPagination(resp.pagination);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [filterMode, filterValue, dateStart, dateEnd, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Permanently delete this audit log?")) return;
    setDeletingId(id);
    try {
      await deleteLog(id);
      setLogs((prev) => prev.filter((l) => l._id !== id));
      setSuccess("Log deleted");
      setTimeout(() => setSuccess(""), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete log");
    } finally {
      setDeletingId(null);
    }
  };

  const handleFilterChange = (mode: FilterMode) => {
    setFilterMode(mode);
    setFilterValue("");
    setPage(1);
  };

  const applyFilter = () => { setPage(1); fetchLogs(); };

  return (
    <DashboardLayout title="Audit Logs">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Audit Logs</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {pagination.total} total events across all services
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-2xl" onClick={fetchLogs}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Filter Bar */}
        <Card className="rounded-[28px] border-border/60">
          <CardContent className="p-4 space-y-3">
            {/* Mode selector */}
            <div className="flex gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground mr-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              {FILTER_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleFilterChange(m)}
                  className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                    filterMode === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border/60 hover:bg-muted"
                  }`}
                >
                  {m.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* Value input */}
            {filterMode !== "ALL" && filterMode !== "DATE_RANGE" && (
              <div className="flex gap-2">
                {filterMode === "SERVICE" ? (
                  <select
                    className="flex h-10 flex-1 rounded-2xl border border-border/60 bg-background px-4 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                  >
                    <option value="">Select service...</option>
                    {KNOWN_SERVICES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      className="pl-10 rounded-2xl border-border/60"
                      placeholder={
                        filterMode === "USER"
                          ? "User ID..."
                          : "Action name (e.g. LOGIN_SUCCESS)..."
                      }
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && applyFilter()}
                    />
                  </div>
                )}
                <Button size="sm" className="rounded-2xl" onClick={applyFilter}>
                  Apply
                </Button>
              </div>
            )}

            {filterMode === "DATE_RANGE" && (
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="space-y-1 flex-1">
                  <label className="text-xs text-muted-foreground">Start</label>
                  <input
                    type="datetime-local"
                    className="flex h-10 w-full rounded-2xl border border-border/60 bg-background px-4 text-sm outline-none focus:border-primary/40"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1 flex-1">
                  <label className="text-xs text-muted-foreground">End</label>
                  <input
                    type="datetime-local"
                    className="flex h-10 w-full rounded-2xl border border-border/60 bg-background px-4 text-sm outline-none focus:border-primary/40"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button size="sm" className="rounded-2xl h-10" onClick={applyFilter}>
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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

        {/* Log list */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <Card className="rounded-[28px] border-border/60">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <Activity className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">No audit logs found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const isExpanded = expandedId === log._id;
              return (
                <Card
                  key={log._id}
                  className="rounded-[20px] border-border/60 hover:shadow-sm transition-shadow overflow-hidden"
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setExpandedId(isExpanded ? null : log._id)}
                  >
                    <CardContent className="p-3.5 flex items-center gap-3">
                      {/* Status indicator */}
                      <div className={`w-2 h-2 rounded-full shrink-0 ${log.status === "SUCCESS" ? "bg-emerald-500" : "bg-rose-500"}`} />

                      {/* Main info */}
                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-0.5">
                        <div className="sm:col-span-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground text-sm">{log.action}</span>
                            <Badge variant="outline" className={`text-[10px] px-1.5 rounded-full ${ROLE_COLORS[log.userRole] || ROLE_COLORS.UNKNOWN}`}>
                              {log.userRole}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] px-1.5 rounded-full ${STATUS_COLORS[log.status]}`}>
                              {log.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.description}</p>
                        </div>
                        <div className="text-xs text-muted-foreground sm:text-right space-y-0.5">
                          <p className="font-medium text-foreground/70">{log.serviceName}</p>
                          <p className="flex items-center gap-1 sm:justify-end">
                            <Clock className="w-3 h-3" />
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </CardContent>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/40 px-4 py-3 bg-muted/20 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <InfoItem label="User ID" value={log.userId} />
                      <InfoItem label="IP Address" value={log.ipAddress} />
                      <InfoItem label="Topic" value={log.topic} />
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="sm:col-span-3 rounded-xl bg-muted/60 px-3 py-2">
                          <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px] mb-1">Metadata</p>
                          <pre className="text-[11px] text-foreground whitespace-pre-wrap break-all">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                      {isAdmin && (
                        <div className="sm:col-span-3 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-xl h-7 text-xs text-destructive hover:bg-destructive/10"
                            disabled={deletingId === log._id}
                            onClick={(e) => { e.stopPropagation(); handleDelete(log._id); }}
                          >
                            {deletingId === log._id ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <Trash2 className="w-3 h-3 mr-1" />
                            )}
                            Delete Log
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px]">{label}</p>
    <p className="text-foreground mt-0.5 break-all">{value || "—"}</p>
  </div>
);

export default AuditLogs;
