import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileText, Trash2, AlertCircle, Loader2, Download,
  Filter, RefreshCw, FilePlus2,
} from "lucide-react";
import {
  getReports, uploadReport, deleteReport,
} from "@/services/patientService";

const REPORT_TYPES = ["LAB_RESULT", "PRESCRIPTION", "IMAGING", "DIAGNOSTIC", "OTHER"];

const TYPE_COLORS = {
  LAB_RESULT: "border-blue-200 bg-blue-50 text-blue-700",
  PRESCRIPTION: "border-emerald-200 bg-emerald-50 text-emerald-700",
  IMAGING: "border-violet-200 bg-violet-50 text-violet-700",
  DIAGNOSTIC: "border-amber-200 bg-amber-50 text-amber-700",
  OTHER: "border-gray-200 bg-gray-50 text-gray-700",
};

const formatBytes = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const PatientReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    reportType: "OTHER",
    file: null,
  });

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();
  const userId = user._id || user.id || user.userId;
  const isAdmin = (localStorage.getItem("role") || "").toUpperCase() === "ADMIN";

  const fetchReports = async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const data = await getReports(userId);
      setReports(data);
    } catch (e) {
      setError(e?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, [userId]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.file || !form.title.trim()) {
      setError("Please fill in the title and select a file");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("report", form.file);
      fd.append("title", form.title.trim());
      fd.append("description", form.description);
      fd.append("reportType", form.reportType);
      await uploadReport(userId, fd);
      setSuccess("Report uploaded successfully");
      setTimeout(() => setSuccess(""), 3000);
      setShowUpload(false);
      setForm({ title: "", description: "", reportType: "OTHER", file: null });
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchReports();
    } catch (e) {
      setError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (reportId) => {
    if (!window.confirm("Delete this report? This action cannot be undone.")) return;
    setDeletingId(reportId);
    try {
      await deleteReport(reportId);
      setReports((prev) => prev.filter((r) => r._id !== reportId));
      setSuccess("Report deleted");
      setTimeout(() => setSuccess(""), 2000);
    } catch (e) {
      setError(e?.message || "Failed to delete report");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = filterType === "ALL"
    ? reports
    : reports.filter((r) => r.reportType === filterType);

  return (
    <DashboardLayout title="Medical Reports">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Medical Reports</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Upload and manage your medical documents
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-2xl" onClick={fetchReports}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
            <Button size="sm" className="rounded-2xl" onClick={() => setShowUpload(!showUpload)}>
              <FilePlus2 className="w-3.5 h-3.5 mr-1.5" />
              Upload Report
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
            <FileText className="w-4 h-4 shrink-0" />{success}
          </div>
        )}

        {/* Upload Form */}
        {showUpload && (
          <Card className="rounded-[28px] border-border/60 border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Upload New Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Report Title *</Label>
                  <Input
                    className="rounded-2xl border-border/60"
                    placeholder="e.g. Blood Test Results - Jan 2025"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Report Type</Label>
                  <select
                    className="flex h-11 w-full rounded-2xl border border-border/60 bg-background px-4 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    value={form.reportType}
                    onChange={(e) => setForm((p) => ({ ...p, reportType: e.target.value }))}
                  >
                    {REPORT_TYPES.map((t) => (
                      <option key={t} value={t}>{t.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">File *</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="flex h-11 w-full rounded-2xl border border-border/60 bg-background px-4 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium cursor-pointer"
                    onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] ?? null }))}
                    required
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Description (optional)</Label>
                  <Input
                    className="rounded-2xl border-border/60"
                    placeholder="Brief description of this report"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2 flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => setShowUpload(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploading} className="rounded-2xl">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          <FilterChip label="All" active={filterType === "ALL"} onClick={() => setFilterType("ALL")} />
          {REPORT_TYPES.map((t) => (
            <FilterChip key={t} label={t.replace("_", " ")} active={filterType === t} onClick={() => setFilterType(t)} />
          ))}
        </div>

        {/* Report List */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-[28px] border-border/60">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <FileText className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">No reports found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((report) => (
              <Card key={report._id} className="rounded-[24px] border-border/60 hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground text-sm truncate">{report.title}</p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 rounded-full ${TYPE_COLORS[report.reportType] || TYPE_COLORS.OTHER}`}
                      >
                        {(report.reportType || "OTHER").replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {report.description && (
                        <p className="text-xs text-muted-foreground truncate">{report.description}</p>
                      )}
                      {report.fileSize && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatBytes(report.fileSize)}
                        </span>
                      )}
                      {report.createdAt && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(report.s3Url || report.fileUrl) && (
                      <a
                        href={report.s3Url || report.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="icon" className="rounded-xl h-8 w-8">
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    )}
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl h-8 w-8 text-destructive hover:bg-destructive/10"
                        disabled={deletingId === report._id}
                        onClick={() => handleDelete(report._id)}
                      >
                        {deletingId === report._id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

const FilterChip = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-background text-muted-foreground border-border/60 hover:bg-muted"
    }`}
  >
    {label}
  </button>
);

export default PatientReports;
