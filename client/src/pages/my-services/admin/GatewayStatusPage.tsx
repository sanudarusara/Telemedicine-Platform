import { useEffect, useState } from "react";
import { Activity, CheckCircle2, XCircle, RefreshCw, Server } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const API_BASE = import.meta.env.DEV
  ? ""
  : import.meta.env.VITE_API_GATEWAY_URL || "";

/** Individual service health endpoint. The gateway itself has /health —
 *  for downstream services we proxy through the gateway routes. */
const SERVICES = [
  { name: "API Gateway", url: `${API_BASE}/health`, internal: true },
  { name: "Auth Service", url: `${API_BASE}/api/auth/health` },
  { name: "Patient Service", url: `${API_BASE}/api/patients/health` },
  { name: "Audit Service", url: `${API_BASE}/api/audit/health` },
  { name: "Appointment Service", url: `${API_BASE}/api/appointments/health` },
  { name: "Doctor Service", url: `${API_BASE}/api/doctors/health` },
  { name: "AI Symptom Service", url: `${API_BASE}/api/symptoms/health` },
  { name: "Notification Service", url: `${API_BASE}/api/notifications/health` },
  { name: "Payment Service", url: `${API_BASE}/api/payments/health` },
  { name: "Telemedicine Service", url: `${API_BASE}/api/telemedicine/health` },
] as const;

type ServiceStatus = "ok" | "error" | "loading";

interface ServiceResult {
  name: string;
  status: ServiceStatus;
  latency: number | null;
  detail?: string;
}

async function checkService(service: { name: string; url: string }): Promise<ServiceResult> {
  const start = Date.now();
  try {
    const res = await fetch(service.url, { method: "GET", signal: AbortSignal.timeout(5000) });
    const latency = Date.now() - start;
    if (res.ok) {
      return { name: service.name, status: "ok", latency };
    }
    return { name: service.name, status: "error", latency, detail: `HTTP ${res.status}` };
  } catch (err: unknown) {
    return {
      name: service.name,
      status: "error",
      latency: null,
      detail: err instanceof Error ? err.message : "Unreachable",
    };
  }
}

export default function GatewayStatusPage() {
  const [results, setResults] = useState<ServiceResult[]>(
    SERVICES.map((s) => ({ name: s.name, status: "loading", latency: null }))
  );
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);

  async function runChecks() {
    setChecking(true);
    setResults(SERVICES.map((s) => ({ name: s.name, status: "loading", latency: null })));
    const checks = await Promise.all(SERVICES.map((s) => checkService(s)));
    setResults(checks);
    setLastChecked(new Date());
    setChecking(false);
  }

  useEffect(() => {
    runChecks();
  }, []);

  const healthy = results.filter((r) => r.status === "ok").length;
  const total = results.length;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gateway Status</h1>
              <p className="text-sm text-muted-foreground">
                {lastChecked
                  ? `Last checked: ${lastChecked.toLocaleTimeString()}`
                  : "Checking services…"}
              </p>
            </div>
          </div>
          <button
            onClick={runChecks}
            disabled={checking}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Summary banner */}
        <div
          className={`rounded-xl p-4 flex items-center gap-3 border ${
            checking
              ? "bg-muted border-border"
              : healthy === total
              ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
              : healthy === 0
              ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
              : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800"
          }`}
        >
          <Activity className="w-5 h-5 shrink-0" />
          <span className="font-medium">
            {checking
              ? "Checking all services…"
              : `${healthy} / ${total} services healthy`}
          </span>
        </div>

        {/* Service cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((r) => (
            <div
              key={r.name}
              className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                {r.status === "loading" ? (
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/40 border-t-primary animate-spin" />
                ) : r.status === "ok" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium text-sm">{r.name}</p>
                  {r.detail && (
                    <p className="text-xs text-destructive">{r.detail}</p>
                  )}
                </div>
              </div>
              {r.latency !== null && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {r.latency} ms
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
