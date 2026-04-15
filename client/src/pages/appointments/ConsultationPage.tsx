import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, UserRound, Loader2 } from "lucide-react";
import { createAppointment, searchDoctors, getAvailableSlots } from "@/services/appointmentsService";

function getArrayFromResponse(data: any) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

const API_BASE = import.meta.env.VITE_APPOINTMENT_API_URL || "";

export default function ConsultationPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const qs = useMemo(() => new URLSearchParams(search), [search]);

  const [centerSearch, setCenterSearch] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(qs.get("doctor"));
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [patientId, setPatientId] = useState<string | null>(qs.get("patientId"));
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    // If a doctor is preselected via querystring, fetch their slots
    if (selectedDoctor) fetchSlotsForDoctor(typeof selectedDoctor === 'object' ? selectedDoctor._id : selectedDoctor, selectedDate);
  }, [selectedDoctor, selectedDate]);

  async function doSearchDoctors() {
    try {
      setError("");
      setLoading(true);
      const results = await searchDoctors({ name: doctorSearch || undefined });
      setDoctors(results.map((d: any) => ({
        _id: d._id || d.id,
        id: d.id || d._id,
        name: d.name || d.fullName || "",
        specialty: d.specialty || d.specialization || "",
        clinic: d.clinic || (d.centerId && d.centerId.name) || "",
        fee: d.fee,
      })));
    } catch (err: any) {
      setError(err?.message || "Failed to load doctors");
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSlotsForDoctor(doctorId: string, date: string) {
    if (!doctorId || !date) return;
    try {
      setSlotsLoading(true);
      setSlots([]);
      const results = await getAvailableSlots(doctorId, date);
      setSlots(results || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load slots');
    } finally {
      setSlotsLoading(false);
    }
  }

  function slotToISO(date: string, timeSlot: string) {
    // attempt to parse '09:30 AM' style into ISO using local timezone
    const dt = new Date(`${date} ${timeSlot}`);
    if (isNaN(dt.getTime())) {
      // fallback: return date at midnight
      return new Date(date).toISOString();
    }
    return dt.toISOString();
  }

  async function handleBook(slot: any) {
    if (!selectedDoctor) return setError('No doctor selected');
    if (!patientId) return setError('Please provide a Patient ID to proceed');

    try {
      setBookingLoading(true);
      setError("");
      const iso = slotToISO(selectedDate, slot.timeSlot || slot.time || slot.label || '00:00');
      const payload = {
        patientId: patientId as string,
        doctorId: typeof selectedDoctor === 'object' ? selectedDoctor._id : selectedDoctor,
        date: iso,
        timeSlot: slot.timeSlot || slot.time || slot.label,
        consultationType: 'clinic'
      } as any;

      await createAppointment(payload);
      // on success navigate back to appointments list and refresh
      navigate('/appointments');
    } catch (e: any) {
      setError(e?.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  }

  return (
    <div className="px-4 py-8 max-w-6xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="font-heading text-3xl font-semibold">Consultation</h1>
        <p className="text-sm text-muted-foreground mt-1">Search doctors and book available slots</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end mb-6">
        <div>
          <label className="text-sm font-medium text-foreground">Center</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={centerSearch} onChange={(e) => setCenterSearch(e.target.value)} placeholder="Search center..." className="pl-10 h-11" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">Doctor</label>
          <div className="relative">
            <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={doctorSearch} onChange={(e) => setDoctorSearch(e.target.value)} placeholder="Search doctor or specialization..." className="pl-10 h-11" />
          </div>
        </div>

        <div>
          <Button onClick={doSearchDoctors} className="h-11 px-6 w-full md:w-auto" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Search'}
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading doctors...</div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No doctors found</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {doctors.map((doctor) => (
                <Card key={doctor._id} className="border shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{doctor.name}</h2>
                      <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{doctor.clinic || "Center not available"}</span>
                    </div>

                    <p className="text-sm font-medium text-foreground">Fee: Rs. {Number(doctor.fee || 0).toLocaleString()}</p>

                    <Button className="w-full" onClick={() => { setSelectedDoctor(doctor); fetchSlotsForDoctor(doctor._id, selectedDate); }}>
                      View Available Slots
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-md border p-4">
            <label className="text-sm font-medium">Patient ID</label>
            <Input value={patientId || ''} onChange={(e) => setPatientId(e.target.value)} placeholder="Enter patientId" className="mt-2" />
          </div>

          <div className="rounded-md border p-4">
            <label className="text-sm font-medium">Selected Date</label>
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="mt-2" />
          </div>

          <div className="rounded-md border p-4">
            <label className="text-sm font-medium">Selected Doctor</label>
            <div className="mt-2 text-sm text-muted-foreground">{selectedDoctor ? (selectedDoctor.name || selectedDoctor) : 'None'}</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-3">Available Slots</h3>
        {slotsLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading slots...</div>
        ) : slots.length === 0 ? (
          <div className="py-6 text-muted-foreground">No slots available for selected date</div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-3">
            {slots.map((s: any) => (
              <div key={s._id || s.id || s.timeSlot} className={`p-3 rounded-lg border ${s.isBooked ? 'opacity-60' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.timeSlot || s.label || s.time}</div>
                    <div className="text-xs text-muted-foreground">{s.isBooked ? 'Booked' : 'Available'}</div>
                  </div>
                  <div>
                    <Button disabled={s.isBooked || bookingLoading} onClick={() => handleBook(s)} size="sm">
                      Book
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="mt-4 text-sm text-destructive">{error}</div>}
    </div>
  );
}
