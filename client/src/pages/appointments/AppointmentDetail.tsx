import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  getAppointmentById,
  updateAppointmentStatus,
  cancelAppointment,
  rescheduleAppointment,
} from "@/services/appointmentsService"
import type { Appointment } from "@/services/appointmentsService"

export default function AppointmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [appointment, setAppointment] = React.useState<Appointment | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!id) return
    let mounted = true
    setLoading(true)
    getAppointmentById(id)
      .then((a) => {
        if (!mounted) return
        setAppointment(a)
        setError(null)
      })
      .catch((err) => {
        if (!mounted) return
        setError(err?.message || "Failed to load appointment")
      })
      .finally(() => mounted && setLoading(false))

    return () => {
      mounted = false
    }
  }, [id])

  const handleStatusUpdate = async () => {
    if (!appointment || !id) return
    const next = window.prompt("Enter new status (e.g. confirmed, cancelled, pending)")
    if (!next) return
    setLoading(true)
    try {
      const updated = await updateAppointmentStatus(id, next)
      setAppointment(updated)
    } catch (err: any) {
      window.alert(err?.message || "Failed to update status")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!appointment || !id) return
    const reason = window.prompt("Reason for cancellation (optional)")
    if (reason === null) return
    setLoading(true)
    try {
      const updated = await cancelAppointment(id, reason || undefined)
      setAppointment(updated)
    } catch (err: any) {
      window.alert(err?.message || "Failed to cancel")
    } finally {
      setLoading(false)
    }
  }

  const handleReschedule = async () => {
    if (!appointment || !id) return
    const newDate = window.prompt("New date (YYYY-MM-DD)")
    if (!newDate) return
    const newTime = window.prompt("New time slot (e.g. 14:00)")
    if (!newTime) return
    setLoading(true)
    try {
      const updated = await rescheduleAppointment(id, newDate, newTime)
      setAppointment(updated)
    } catch (err: any) {
      window.alert(err?.message || "Failed to reschedule")
    } finally {
      setLoading(false)
    }
  }

  if (loading && !appointment) return <div className="p-6">Loading…</div>

  if (error) return <div className="p-6 text-destructive">Error: {error}</div>

  if (!appointment) return <div className="p-6">No appointment found</div>

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-heading text-2xl text-text-h">Appointment</h1>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle>{appointment.patientName || appointment.patientId}</CardTitle>
              <CardDescription>
                {appointment.doctorName || appointment.doctorId} — {appointment.status}
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              {appointment.date ? new Date(appointment.date).toLocaleString() : 'TBD'}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{appointment.reason || appointment.notes || '—'}</p>
        </CardContent>
        <CardFooter>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={handleStatusUpdate}>
              Update Status
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleReschedule}>
              Reschedule
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
