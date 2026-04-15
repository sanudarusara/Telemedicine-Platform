import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, UserRound, Loader2, Stethoscope, Calendar, Clock, DollarSign, Search, X } from "lucide-react";
import { createAppointment, searchDoctors, getAvailableSlots } from "@/services/appointmentsService";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
  const [centers, setCenters] = useState<any[]>([]);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [dateSearch, setDateSearch] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const searchTimer = useRef<any>(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    let mounted = true;
    async function fetchCenters() {
      try {
        const base = API_BASE || "";
        const url = base ? `${base}/api/centers` : `/api/centers`;
        const res = await fetch(url, { method: "GET" });
        const body = await res.json().catch(() => null);
        if (!mounted) return;
        const items = getArrayFromResponse(body || []);
        setCenters(items.map((c: any) => ({
          _id: c._id || c.id,
          id: c.id || c._id,
          name: c.name || c.title || "",
          address: c.address || c.location || "",
          district: c.district || "",
          phone: c.phone || "",
          isActive: c.isActive,
        })));
      } catch (e) {
        // ignore silently
      }
    }

    fetchCenters();
    return () => {
      mounted = false;
    };
  }, []);

  // Load initial doctors
  useEffect(() => {
    let mounted = true;
    async function loadInitialDoctors() {
      try {
        setLoading(true);
        const results = await searchDoctors({});
        if (!mounted) return;
        const formattedDoctors = getArrayFromResponse(results).map((d: any) => ({
          _id: d._id || d.id,
          id: d.id || d._id,
          name: d.name || d.fullName || "",
          specialty: d.specialty || d.specialization || "General Medicine",
          clinic: d.clinic || (d.center && (d.center.name || d.center.title)) || (d.centerId && (d.centerId.name || d.centerId.title)) || "Main Clinic",
          clinicAddress: d.center?.address || d.centerId?.address || d.address || d.clinicAddress || "",
          fee: d.fee || d.consultationFee || d.feeAmount || 1500,
          centerId: d.centerId || null,
          raw: d,
        }));
        setDoctors(formattedDoctors);
        setInitialLoadDone(true);
      } catch (err: any) {
        console.error("Failed to load doctors:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialDoctors();
    return () => { mounted = false; };
  }, []);

  const centerSuggestions = useMemo(() => 
    centers.map((c) => c.name).filter(Boolean).sort((a, b) => a.localeCompare(b)), 
    [centers]
  );

  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(() => {
    const doctorParam = qs.get("doctor");
    return doctorParam || null;
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<any | null>(null);
  const [patientProfile, setPatientProfile] = useState<any | null>(null);
  const [symptoms, setSymptoms] = useState("");
  const [notes, setNotes] = useState("");

  const [patientId, setPatientId] = useState<string | null>(() => qs.get("patientId"));
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (selectedDoctor && modalOpen) {
      const doctorId = typeof selectedDoctor === 'object' ? selectedDoctor._id : selectedDoctor;
      if (doctorId) fetchSlotsForDoctor(doctorId, selectedDate);
    }
  }, [selectedDoctor, selectedDate, modalOpen]);

  useEffect(() => {
    if (patientId) return;
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        const id = u._id || u.id || u.patientId || u.userId || null;
        if (id) setPatientId(String(id));
      }
    } catch (e) {
      // ignore
    }
  }, [patientId]);

  async function doSearchDoctors() {
    try {
      setError("");
      setLoading(true);
      const params: any = {};
      if (doctorSearch) params.name = doctorSearch;
      if (specialtySearch) params.specialty = specialtySearch;
      if (dateSearch) params.date = dateSearch;
      if (centerSearch) params.center = centerSearch;

      const results = await searchDoctors(params);
      const formattedDoctors = getArrayFromResponse(results).map((d: any) => ({
        _id: d._id || d.id,
        id: d.id || d._id,
        name: d.name || d.fullName || "",
        specialty: d.specialty || d.specialization || "General Medicine",
        clinic: d.clinic || (d.center && (d.center.name || d.center.title)) || (d.centerId && (d.centerId.name || d.centerId.title)) || "Main Clinic",
        clinicAddress: d.center?.address || d.centerId?.address || d.address || d.clinicAddress || "",
        fee: d.fee || d.consultationFee || d.feeAmount || 1500,
        centerId: d.centerId || null,
        raw: d,
      }));
      setDoctors(formattedDoctors);
    } catch (err: any) {
      setError(err?.message || "Failed to load doctors");
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    const shouldSearch = Boolean(doctorSearch && doctorSearch.length >= 2) || 
                        Boolean(specialtySearch) || 
                        Boolean(centerSearch);
    
    if (!shouldSearch && initialLoadDone && !doctorSearch && !specialtySearch && !centerSearch) {
      const reloadAllDoctors = async () => {
        try {
          setLoading(true);
          const results = await searchDoctors({});
          const formatted = getArrayFromResponse(results).map((d: any) => ({
            _id: d._id || d.id,
            id: d.id || d._id,
            name: d.name || d.fullName || "",
            specialty: d.specialty || d.specialization || "General Medicine",
            clinic: d.clinic || (d.center && (d.center.name || d.center.title)) || (d.centerId && (d.centerId.name || d.centerId.title)) || "Main Clinic",
            clinicAddress: d.center?.address || d.centerId?.address || d.address || d.clinicAddress || "",
            fee: d.fee || d.consultationFee || d.feeAmount || 1500,
            centerId: d.centerId || null,
            raw: d,
          }));
          setDoctors(formatted);
        } catch (err) {
          console.error("Failed to reload doctors:", err);
        } finally {
          setLoading(false);
        }
      };
      reloadAllDoctors();
      return;
    }

    if (shouldSearch) {
      searchTimer.current = setTimeout(() => doSearchDoctors(), 500);
    }

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [doctorSearch, specialtySearch, centerSearch, dateSearch]);

  async function fetchSlotsForDoctor(doctorId: string, date: string) {
    if (!doctorId || !date) return;
    try {
      setSlotsLoading(true);
      setSlots([]);
      const results = await getAvailableSlots(doctorId, date);
      setSlots(getArrayFromResponse(results) || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load slots');
    } finally {
      setSlotsLoading(false);
    }
  }

  function slotToISO(date: string, timeSlot: string) {
    const dt = new Date(`${date} ${timeSlot}`);
    if (isNaN(dt.getTime())) {
      return new Date(date).toISOString();
    }
    return dt.toISOString();
  }

  async function handleBook(slot: any) {
    // kept for backward compatibility but prefer submitBooking via form
    submitBooking({ slot, symptoms: '', notes: '' });
  }

  async function openBookingForm(slot: any) {
    if (!selectedDoctor) return setError('No doctor selected');
    // ensure patient profile is loaded from localStorage
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        setPatientProfile(u);
        if (!patientId) setPatientId(u._id || u.id || u.patientId || u.userId || null);
      }
    } catch (e) {
      // ignore
    }
    setBookingSlot(slot);
    setSymptoms("");
    setNotes("");
    setBookingModalOpen(true);
  }

  async function submitBooking({ slot, symptoms: s = '', notes: n = '' }: { slot: any; symptoms?: string; notes?: string; }) {
    if (!selectedDoctor) return setError('No doctor selected');
    let pid = patientId;
    if (!pid && patientProfile) {
      pid = patientProfile._id || patientProfile.id || null;
      if (pid) setPatientId(String(pid));
    }
    if (!pid) return setError('Please sign in before booking');

    try {
      setBookingLoading(true);
      setError("");
      const time = typeof slot === 'string' ? slot : (slot.timeSlot || slot.time || slot.label);
      const iso = slotToISO(selectedDate, time);
      const payload = {
        patientId: pid as string,
        doctorId: typeof selectedDoctor === 'object' ? selectedDoctor._id : selectedDoctor,
        date: iso,
        timeSlot: time,
        consultationType: 'clinic',
        symptoms: s,
        notes: n,
      } as any;

      await createAppointment(payload);
      setBookingModalOpen(false);
      navigate('/appointments');
    } catch (e: any) {
      setError(e?.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  }

  const clearFilters = () => {
    setCenterSearch("");
    setDoctorSearch("");
    setSpecialtySearch("");
    setDateSearch(today);
  };

  return (
    <DashboardLayout title="Consultation">
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Find Your Doctor
            </h1>
            <p className="text-muted-foreground mt-2">Search and book appointments with top healthcare professionals</p>
            {initialLoadDone && doctors.length > 0 && (
              <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 bg-primary/10 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-primary font-medium">{doctors.length} Doctors Available</span>
              </div>
            )}
          </div>

          {/* Search Filters Card */}
          <Card className="mb-8 shadow-md border-0 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Center Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      list="center-options" 
                      value={centerSearch} 
                      onChange={(e) => setCenterSearch(e.target.value)} 
                      placeholder="Search by center..." 
                      className="pl-10 h-11" 
                    />
                    <datalist id="center-options">
                      {centerSuggestions.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Doctor Name</label>
                  <div className="relative">
                    <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      value={doctorSearch} 
                      onChange={(e) => setDoctorSearch(e.target.value)} 
                      placeholder="Search by name..." 
                      className="pl-10 h-11" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Specialty</label>
                  <div className="relative">
                    <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      value={specialtySearch} 
                      onChange={(e) => setSpecialtySearch(e.target.value)} 
                      placeholder="e.g. Cardiology" 
                      className="pl-10 h-11" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Appointment Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="date" 
                      min={today} 
                      value={dateSearch} 
                      onChange={(e) => setDateSearch(e.target.value)} 
                      className="pl-10 h-11" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                {(centerSearch || doctorSearch || specialtySearch) && (
                  <Button variant="outline" onClick={clearFilters} className="gap-2">
                    <X className="w-4 h-4" />
                    Clear Filters
                  </Button>
                )}
                <Button onClick={doSearchDoctors} disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {loading ? 'Searching...' : 'Search Doctors'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Doctors Grid - Centered Cards */}
          <div className="flex justify-center">
            <div className="w-full max-w-6xl">
              {loading ? (
                <div className="text-center py-20">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
                  <p className="text-muted-foreground">Finding the best doctors for you...</p>
                </div>
              ) : doctors.length === 0 ? (
                <Card className="text-center py-16 border-dashed">
                  <CardContent>
                    <Stethoscope className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">No Doctors Found</h3>
                    <p className="text-muted-foreground">
                      {centerSearch || doctorSearch || specialtySearch 
                        ? "Try adjusting your search criteria" 
                        : "Start typing to search for doctors"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
                  {doctors.map((doctor, index) => (
                    <Card 
                      key={doctor._id || index} 
                      className="w-full max-w-sm border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
                    >
                      <CardContent className="p-6 space-y-4">
                        {/* Doctor Avatar/Icon */}
                        <div className="flex justify-center">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <UserRound className="w-10 h-10 text-primary" />
                          </div>
                        </div>

                        {/* Doctor Info */}
                        <div className="text-center">
                          <h2 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                            {doctor.name}
                          </h2>
                          <p className="text-sm text-primary font-medium mt-1">{doctor.specialty}</p>
                        </div>

                        {/* Clinic Location */}
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          {doctor.clinicAddress ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="truncate text-left text-sm text-foreground/90 max-w-[200px]">{doctor.clinic || "Main Medical Center"}</button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <div className="max-w-xs text-sm">{doctor.clinicAddress}</div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="truncate">{doctor.clinic || "Main Medical Center"}</span>
                          )}
                        </div>

                        {/* Fee and Button */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <p className="text-lg font-bold text-foreground">
                              Rs. {Number(doctor.fee || 0).toLocaleString()}
                            </p>
                          </div>
                            <Button
                              className="gap-2"
                              onClick={() => {
                                setSelectedDoctor(doctor);
                                setSelectedDate(dateSearch);
                                setModalOpen(true);
                              }}
                            >
                              <Clock className="w-4 h-4" />
                              View Slots
                            </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Patient ID removed: booking will use logged-in user info from localStorage */}

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-destructive text-sm text-center">{error}</p>
            </div>
          )}

          {/* Modal for Slots */}
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  {selectedDoctor ? (selectedDoctor.name || selectedDoctor) : 'Available Slots'}
                </DialogTitle>
                <DialogDescription>
                  {selectedDoctor?.specialty} • {new Date(selectedDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                {slotsLoading ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
                    <p className="text-muted-foreground">Loading available time slots...</p>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="py-12 text-center">
                    <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                    <p className="text-muted-foreground font-medium">No slots available</p>
                    <p className="text-sm text-muted-foreground mt-1">Try selecting a different date</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto p-1">
                    {slots.map((s: any, idx: number) => {
                      const time = typeof s === 'string' ? s : (s.timeSlot || s.time || s.label);
                      const isBooked = typeof s === 'object' ? !!s.isBooked : false;
                      return (
                        <Button
                          key={idx}
                          variant={isBooked ? "outline" : "default"}
                          className={`h-auto py-3 flex flex-col gap-1 ${isBooked ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transition-transform'}`}
                          disabled={isBooked || bookingLoading}
                          onClick={() => {
                            // open booking form for this slot
                            setModalOpen(false);
                            openBookingForm(typeof s === 'string' ? { timeSlot: s } : s);
                          }}
                        >
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">{time}</span>
                          <span className="text-xs opacity-75">{isBooked ? 'Booked' : 'Available'}</span>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Booking Form Modal */}
          <Dialog open={bookingModalOpen} onOpenChange={setBookingModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Confirm Booking</DialogTitle>
                <DialogDescription>
                  Review and confirm your appointment details.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="text-sm">
                  <div className="font-medium">Doctor</div>
                  <div className="text-foreground/90">{selectedDoctor?.name || selectedDoctor}</div>
                  <div className="text-xs text-muted-foreground">{selectedDoctor?.specialty}</div>
                </div>

                <div className="text-sm">
                  <div className="font-medium">Patient</div>
                  <div className="text-foreground/90">{patientProfile?.fullName || patientProfile?.name || patientId || 'Not signed in'}</div>
                </div>

                <div className="text-sm">
                  <div className="font-medium">When</div>
                  <div className="text-foreground/90">{new Date(selectedDate).toLocaleDateString()} • {bookingSlot ? (typeof bookingSlot === 'string' ? bookingSlot : (bookingSlot.timeSlot || bookingSlot.time || bookingSlot.label)) : ''}</div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Symptoms</label>
                  <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} className="w-full border rounded-md p-2 min-h-[80px]" placeholder="Briefly describe symptoms" />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border rounded-md p-2 min-h-[60px]" placeholder="Any additional notes" />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setBookingModalOpen(false)}>Cancel</Button>
                <Button disabled={bookingLoading} onClick={() => submitBooking({ slot: bookingSlot, symptoms, notes })} className="ml-2">
                  {bookingLoading ? 'Booking...' : 'Confirm Appointment'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </DashboardLayout>
  );
}