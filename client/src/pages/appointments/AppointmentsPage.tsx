import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AppointmentCard } from "@/components/AppointmentCard"
import { getAppointments, cancelAppointment } from "@/services/appointmentsService"
import type { Appointment } from "@/services/appointmentsService"

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
  const [userId, setUserId] = React.useState<string | null>(null)
  const [userProfile, setUserProfile] = React.useState<any | null>(null)

  React.useEffect(() => {
    let mounted = true
    setLoading(true)

    const params: any = {}
    if (statusFilter) params.status = statusFilter

    try {
      const raw = localStorage.getItem('user')
      if (raw) {
        const u = JSON.parse(raw)
        const id = u._id || u.id || u.patientId || u.userId || null
        if (id) {
          params.patientId = id
          setUserId(String(id))
          setUserProfile(u)
        }
      }
    } catch (e) {
      // ignore
    }

    getAppointments(params)
      .then((data) => {
        if (!mounted) return
        setAppointments(data)
        setError(null)
      })
      .catch((err) => {
        if (!mounted) return
        setError(err?.message || 'Failed to load appointments')
        setAppointments([])
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    const pollParams: any = {}
    if (statusFilter) pollParams.status = statusFilter
    if (params.patientId) pollParams.patientId = params.patientId

    const interval = setInterval(() => {
      getAppointments(pollParams).then((data) => setAppointments(data)).catch(() => {})
    }, 10000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [statusFilter])

  return (
    <div className="px-4 py-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <main className="lg:col-span-3">
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
              placeholder="Search doctor or clinic"
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
            {appointments && appointments
              .filter((a) => {
                if (!query) return true
                const q = query.toLowerCase()
                const mapped = mapAppointment(a)
                return (
                  mapped.doctorName.toLowerCase().includes(q) ||
                  mapped.clinic.toLowerCase().includes(q) ||
                  mapped.specialization.toLowerCase().includes(q)
                )
              })
              .slice((page - 1) * pageSize, page * pageSize)
              .map((a) => {
                const mapped = mapAppointment(a)
                return (
                  <AppointmentCard
                    key={mapped.id}
                    appointment={mapped}
                    onCancel={async (id: string) => {
                      const ok = window.confirm('Cancel this appointment?')
                      if (!ok) return
                      try {
                        await cancelAppointment(id, 'Cancelled by user')
                        const refreshed = await getAppointments({ status: statusFilter, patientId: userId })
                        setAppointments(refreshed)
                      } catch (e) {
                        // ignore
                      }
                    }}
                  />
                )
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
        </main>

        <aside className="lg:col-span-1">
          <div className="rounded-2xl border bg-card p-4 sticky top-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <div className="text-primary font-bold">{(userProfile?.fullName || userProfile?.name || 'U').charAt(0)}</div>
              </div>
              <div>
                <div className="font-medium">{userProfile?.fullName || userProfile?.name || 'Guest User'}</div>
                <div className="text-sm text-muted-foreground">{userProfile?.email || ''}</div>
              </div>
            </div>

            <div className="mt-4">
              <Button className="w-full" onClick={() => window.location.href = '/appointments/consultation'}>New Appointment</Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
import * as React from "react"
import {
  return (
    <div className="px-4 py-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <main className="lg:col-span-3">
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
                          const refreshed = await getAppointments({ status: statusFilter, patientId: userId });
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
        </main>

        <aside className="lg:col-span-1">
          <div className="rounded-2xl border bg-card p-4 sticky top-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <div className="text-primary font-bold">{(userProfile?.fullName || userProfile?.name || 'U').charAt(0)}</div>
              </div>
              <div>
                <div className="font-medium">{userProfile?.fullName || userProfile?.name || 'Guest User'}</div>
                <div className="text-sm text-muted-foreground">{userProfile?.email || ''}</div>
              </div>
            </div>

            <div className="mt-4">
              <Button className="w-full" onClick={() => window.location.href = '/appointments/consultation'}>New Appointment</Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
  }

  return (
    <div className="px-4 py-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <main className="lg:col-span-3">
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

        <aside className="lg:col-span-1">
        </main>

        <aside className="lg:col-span-1">
          <div className="rounded-2xl border bg-card p-4 sticky top-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <div className="text-primary font-bold">{(userProfile?.fullName || userProfile?.name || 'U').charAt(0)}</div>
              </div>
              <div>
                <div className="font-medium">{userProfile?.fullName || userProfile?.name || 'Guest User'}</div>
                <div className="text-sm text-muted-foreground">{userProfile?.email || ''}</div>
              </div>
            </div>

            <div className="mt-4">
              <Button className="w-full" onClick={() => window.location.href = '/appointments/consultation'}>New Appointment</Button>
            </div>
          </div>
        </aside>

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
