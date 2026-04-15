import * as React from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AppointmentCard } from "@/components/AppointmentCard"
import { StatusBadge } from "@/components/StatusBadge"
import { Input } from "@/components/ui/input"
import { getAppointments, cancelAppointment } from "@/services/appointmentsService"
import type { Appointment } from "@/services/appointmentsService"

function getArrayFromResponse(data: any) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.appointments)) return data.appointments;
  return [];
}

function mapAppointment(a: any) {
  const doctor = typeof a.doctorId === 'object' && a.doctorId !== null ? a.doctorId : null;
  const centerFromDoctor = doctor && typeof doctor.centerId === 'object' && doctor.centerId !== null ? doctor.centerId : null;
  const center = typeof a.centerId === 'object' && a.centerId !== null ? a.centerId : centerFromDoctor;
  const slot = typeof a.slotId === 'object' && a.slotId !== null ? a.slotId : null;
  return {
    id: a._id || a.id || '',
    doctorId: doctor?._id || doctor?.id || '',
    doctorName: doctor?.name || 'Doctor not available',
    specialization: doctor?.specialization || 'Not available',
    specialty: doctor?.specialization || 'Not available',
    clinic: center?.name || doctor?.clinic || 'Center not available',
    date: slot?.date || (a.date ? new Date(a.date).toLocaleDateString() : 'Not available'),
    time: slot?.startTime || a.timeSlot || 'Not available',
    status: (a.status || 'pending'),
    fee: Number(doctor?.fee || a.fee || 0),
    note: a.note || a.notes || '',
  };
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = React.useState<Appointment[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<string>("")
  const [query, setQuery] = React.useState<string>("")
  const [page, setPage] = React.useState<number>(1)
  const [pageSize, setPageSize] = React.useState<number>(6)

  React.useEffect(() => {
    let mounted = true
    setLoading(true)
    const params: any = {}
    if (statusFilter) params.status = statusFilter

    getAppointments(params)
      .then((data) => {
        if (!mounted) return
        // Enrich appointments with doctor details when missing
        (async () => {
          try {
            const API_BASE = import.meta.env.VITE_APPOINTMENT_API_URL || ""
            const missingDoctorIds = Array.from(new Set(data
              .map((a: any) => a.doctorId)
              .filter(Boolean)
              .filter((id: string) => !data.find((x: any) => (x.doctorId === id) && (x.doctorName || x.doctor)) )))

            const doctorMap: Record<string, any> = {}
            await Promise.all(missingDoctorIds.map(async (docId: string) => {
              try {
                const res = await fetch(`${API_BASE}/api/auth/doctors/${docId}`)
                const j = await res.json()
                if (res.ok && j?.data) {
                  doctorMap[docId] = j.data
                }
              } catch (e) {
                // ignore
              }
            }))

            const enriched = data.map((a: any) => {
              const doc = doctorMap[a.doctorId]
              return {
                ...a,
                doctorName: a.doctorName || (doc && (doc.name || doc.fullName)) || a.doctorName,
                doctorEmail: a.doctorEmail || (doc && doc.email) || a.doctorEmail,
              }
            })
            setAppointments(enriched)
          } catch (e) {
            setAppointments(data)
          }
        })()
        setError(null)
      })
      .catch((err) => {
        if (!mounted) return
        setError(err?.message || "Failed to load appointments")
        setAppointments([])
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    // polling for near-real-time updates
    const interval = setInterval(() => {
      getAppointments({ status: statusFilter }).then((data) => {
        // simple update without enrichment for polling
        setAppointments(data)
      }).catch(() => {})
    }, 10000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [statusFilter])

  const statusClass = (s?: string) => {
    const st = (s || '').toLowerCase()
    if (st === 'confirmed') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    if (st === 'pending') return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (st === 'cancelled' || st === 'canceled') return 'bg-rose-100 text-rose-800 border-rose-200'
    return 'bg-muted/20 text-muted-foreground'
  }

  return (
    <div className="px-4 py-8 max-w-6xl mx-auto">
      <div className="rounded-3xl border bg-gradient-to-br from-background to-muted/30 p-6 mb-8 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground mb-3">
              Appointments
            </div>
            <h1 className="font-heading text-4xl text-text-h font-semibold">Appointments</h1>
            <p className="mt-2 text-sm text-muted-foreground">Manage and review scheduled visits</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Button variant="default" onClick={() => window.location.href = '/appointments/consultation'}>New Appointment</Button>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          aria-label="Search"
          placeholder="Search patient or doctor"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-[260px]"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Per page</label>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-md border px-2 py-1 text-sm"
          >
            <option value={6}>6</option>
            <option value={12}>12</option>
            <option value={24}>24</option>
          </select>
        </div>
      </div>

      {loading && <div className="text-center py-8">Loading appointments…</div>}

      {error && (
        <div className="text-center text-destructive py-4">Error: {error}</div>
      )}

      {!loading && !error && appointments && appointments.length === 0 && (
        <div className="text-center text-muted-foreground py-8">No appointments found</div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {appointments &&
          appointments
            .filter((a) => {
              if (!query) return true;
              const q = query.toLowerCase();
              const mapped = mapAppointment(a);
              return (
                mapped.doctorName.toLowerCase().includes(q) ||
                mapped.clinic.toLowerCase().includes(q) ||
                mapped.specialization.toLowerCase().includes(q)
              );
            })
            .slice((page - 1) * pageSize, page * pageSize)
            .map((a) => {
              const mapped = mapAppointment(a);
              return (
                <AppointmentCard
                  key={mapped.id}
                  appointment={mapped}
                  onCancel={async (id: string) => {
                    const ok = window.confirm('Cancel this appointment?');
                    if (!ok) return;
                    try {
                      await cancelAppointment(id, 'Cancelled by user');
                      const refreshed = await getAppointments({ status: statusFilter });
                      setAppointments(refreshed);
                    } catch (e) {
                      // ignore
                    }
                  }}
                />
              );
            })}
      </div>

      {/* Pagination controls */}
      {appointments && appointments.length > 0 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </Button>
          <div className="text-sm text-muted-foreground">Page {page}</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={(page * pageSize) >= appointments.length}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
