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
import { getAppointments } from "@/services/appointmentsService"
import type { Appointment } from "@/services/appointmentsService"

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
        setAppointments(data)
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

    return () => {
      mounted = false
    }
  }, [statusFilter])

  const statusClass = (s?: string) => {
    const st = (s || '').toLowerCase()
    if (st === 'confirmed' || st === 'confirmed') return 'bg-green-100 text-green-800'
    if (st === 'pending') return 'bg-amber-100 text-amber-800'
    if (st === 'cancelled' || st === 'canceled') return 'bg-rose-100 text-rose-800'
    return 'bg-muted/20 text-muted-foreground'
  }

  return (
    <div className="px-4 py-8 max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-4xl text-text-h font-semibold">Appointments</h1>
        <Button variant="default">New Appointment</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          aria-label="Search"
          placeholder="Search patient or doctor"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
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

      <div className="grid gap-4 md:grid-cols-2">
        {appointments &&
          // client-side search filter
          appointments
            .filter((a) => {
              if (!query) return true
              const q = query.toLowerCase()
              const patient = (a.patientName || a.patient || "").toLowerCase()
              const doctor = (a.doctorName || "").toLowerCase()
              return patient.includes(q) || doctor.includes(q)
            })
            .slice((page - 1) * pageSize, page * pageSize)
            .map((a) => {
              const key = a._id || a.id || JSON.stringify(a)
              const patient = a.patientName || a.patient || a.patientId || 'Unknown'
              const datetime = a.date
                ? `${new Date(a.date).toLocaleDateString()} ${a.timeSlot || ''}`.trim()
                : a.timeSlot || 'TBD'

              return (
                <Card key={key} className="hover:shadow-lg transition">
                  <CardHeader>
                    <div className="flex w-full items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">{patient}</CardTitle>
                        <CardDescription className="text-sm">{datetime}</CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass(a.status)}`}>
                          {a.status || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <p className="text-sm text-muted-foreground">{a.reason || a.notes || '—'}</p>
                  </CardContent>

                  <CardFooter>
                    <div className="flex gap-2 ml-auto">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/appointments/${a._id || a.id}`}>View</a>
                      </Button>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
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
    </div>
  )
}
