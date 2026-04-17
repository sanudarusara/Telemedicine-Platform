import React from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { getAppointments, cancelAppointment, searchDoctors, getAvailableSlots, createAppointment, downloadReceipt } from "@/services/appointmentsService";
import type { Appointment } from "@/services/appointmentsService";
import { createPayment, createPayherePayment } from "@/services/paymentService";
import { Calendar, Filter, Search, Plus, Clock, MapPin, DollarSign, User, Stethoscope, X, Loader2, CreditCard, Calendar as CalendarIcon, FileText, Download, Eye, Building, Video } from "lucide-react";
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

async function fetchDoctorDetailsFromSearch(doctorId: string) {
  try {
    const results = await searchDoctors({});
    const doctors = getArrayFromResponse(results);
    const doctor = doctors.find((d: any) => (d._id === doctorId || d.id === doctorId));

    if (doctor) {
      return {
        name: doctor.name || doctor.fullName,
        specialty: doctor.specialty || doctor.specialization,
        fee: doctor.fee || doctor.consultationFee || doctor.feeAmount || 1500,
        clinic: doctor.clinic || (doctor.center && doctor.center.name) || (doctor.centerId && doctor.centerId.name),
        clinicAddress: doctor.center?.address || doctor.centerId?.address || doctor.address,
      };
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch doctor details:", error);
    return null;
  }
}

function mapAppointment(a: any, doctorDetails?: any) {
  const doctor = doctorDetails || (typeof a.doctorId === 'object' && a.doctorId !== null ? a.doctorId : null);
  const slot = typeof a.slotId === 'object' && a.slotId !== null ? a.slotId : null;
  const fee = doctor?.fee || a.fee || a.consultationFee || a.feeAmount || a.paymentAmount || 1500;

  return {
    id: a._id || a.id || '',
    doctorId: doctor?._id || doctor?.id || a.doctorId,
    doctorName: doctor?.name || a.doctorName || 'Doctor',
    specialization: doctor?.specialty || doctor?.specialization || a.specialization || a.specialty || 'General Physician',
    clinic: doctor?.clinic || a.clinic || 'Main Clinic',
    clinicAddress: doctor?.clinicAddress || a.clinicAddress || '',
    date: slot?.date || (a.date ? new Date(a.date).toLocaleDateString() : 'Date not set'),
    rawDate: a.date,
    time: slot?.startTime || a.timeSlot || 'Time not set',
    status: (a.status || 'pending'),
    paymentStatus: a.paymentStatus || 'pending',
    fee: fee,
    note: a.note || a.notes || '',
    symptoms: a.symptoms || '',
    reports: a.reports || [],
    consultationType: a.consultationType || 'clinic',
    createdAt: a.createdAt || a.date,
    raw: a
  };
}

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [query, setQuery] = React.useState<string>("");
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(6);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [userProfile, setUserProfile] = React.useState<any | null>(null);
  const [selectedAppointment, setSelectedAppointment] = React.useState<any | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = React.useState(false);
  const [enrichedAppointments, setEnrichedAppointments] = React.useState<any[]>([]);

  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
  const [paymentAppointment, setPaymentAppointment] = React.useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<"PAYHERE" | "STRIPE">("PAYHERE");

  // Report viewing state
  const [reportViewerOpen, setReportViewerOpen] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState<any | null>(null);

  // Reschedule state
  const [rescheduleModalOpen, setRescheduleModalOpen] = React.useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = React.useState<any | null>(null);
  const [newDate, setNewDate] = React.useState<string>("");
  const [availableSlots, setAvailableSlots] = React.useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = React.useState<string>("");
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [rescheduleLoading, setRescheduleLoading] = React.useState(false);

  // Cancel confirmation state
  const [confirmCancelOpen, setConfirmCancelOpen] = React.useState(false);
  const [cancelTarget, setCancelTarget] = React.useState<any | null>(null);
  const [cancelLoading, setCancelLoading] = React.useState(false);

  const [paymentLoading, setPaymentLoading] = React.useState<string | null>(null);

  // Fetch appointments and enrich with doctor/center details
  React.useEffect(() => {
    let mounted = true;

    async function fetchAndEnrichAppointments() {
      setLoading(true);
      setError(null);

      try {
        const params: any = {};
        if (statusFilter) params.status = statusFilter;

        let patientId = null;
        try {
          const raw = localStorage.getItem('user');
          if (raw) {
            const u = JSON.parse(raw);
            patientId = u._id || u.id || u.patientId || u.userId || null;
            if (patientId) {
              params.patientId = patientId;
              setUserId(String(patientId));
              setUserProfile(u);
            }
          }
        } catch (e) {
          console.error("Failed to parse user from localStorage:", e);
        }

        if (!patientId) {
          setError("Please sign in to view your appointments");
          setLoading(false);
          return;
        }

        const appointmentsData = await getAppointments(params);

        if (!mounted) return;

        let allDoctors: any[] = [];
        try {
          const doctorsResult = await searchDoctors({});
          allDoctors = getArrayFromResponse(doctorsResult);
        } catch (err) {
          console.error("Failed to fetch doctors list:", err);
        }

        const enriched = appointmentsData.map((appointment: any) => {
          let doctorDetails = null;
          const doctorId = typeof appointment.doctorId === 'string'
            ? appointment.doctorId
            : appointment.doctorId?._id || appointment.doctorId?.id;

          if (doctorId && allDoctors.length > 0) {
            const foundDoctor = allDoctors.find((d: any) => (d._id === doctorId || d.id === doctorId));
            if (foundDoctor) {
              doctorDetails = {
                name: foundDoctor.name || foundDoctor.fullName,
                specialty: foundDoctor.specialty || foundDoctor.specialization,
                fee: foundDoctor.fee || foundDoctor.consultationFee || foundDoctor.feeAmount || 1500,
                clinic: foundDoctor.clinic || (foundDoctor.center && foundDoctor.center.name) || (foundDoctor.centerId && foundDoctor.centerId.name),
                clinicAddress: foundDoctor.center?.address || foundDoctor.centerId?.address || foundDoctor.address,
              };
            }
          }

          if (!doctorDetails && typeof appointment.doctorId === 'object' && appointment.doctorId !== null) {
            doctorDetails = {
              name: appointment.doctorId.name,
              specialty: appointment.doctorId.specialty || appointment.doctorId.specialization,
              fee: appointment.doctorId.fee || appointment.doctorId.consultationFee || 1500,
              clinic: appointment.doctorId.clinic,
            };
          }

          return mapAppointment(appointment, doctorDetails);
        });

        setEnrichedAppointments(enriched);
        setAppointments(appointmentsData);
      } catch (err: any) {
        console.error("Failed to fetch appointments:", err);
        setError(err?.message || 'Failed to load appointments');
      } finally {
        setLoading(false);
      }
    }

    fetchAndEnrichAppointments();

    const interval = setInterval(() => {
      if (!loading) {
        fetchAndEnrichAppointments();
      }
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [statusFilter]);

  const filteredAppointments = React.useMemo(() => {
    if (!enrichedAppointments.length) return [];
    return enrichedAppointments.filter((appointment) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        appointment.doctorName.toLowerCase().includes(q) ||
        appointment.clinic.toLowerCase().includes(q) ||
        appointment.specialization.toLowerCase().includes(q)
      );
    });
  }, [enrichedAppointments, query]);

  const paginatedAppointments = React.useMemo(() => {
    return filteredAppointments.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredAppointments, page, pageSize]);

  const totalPages = Math.ceil(filteredAppointments.length / pageSize);

  // Cancel appointment - only for pending appointments
  const handleCancel = (id: string, status: string, appointment?: any) => {
    if (status === 'confirmed') {
      setError("Cannot cancel a confirmed appointment. Please contact the clinic.");
      return;
    }
    setCancelTarget({ id, status, appointment });
    setConfirmCancelOpen(true);
  };

  const executeCancel = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await cancelAppointment(cancelTarget.id, 'Cancelled by user');
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (userId) params.patientId = userId;
      const refreshed = await getAppointments(params);

      let allDoctors: any[] = [];
      try {
        const doctorsResult = await searchDoctors({});
        allDoctors = getArrayFromResponse(doctorsResult);
      } catch (err) {
        console.error("Failed to fetch doctors list:", err);
      }

      const enriched = refreshed.map((appointment: any) => {
        let doctorDetails = null;
        const doctorId = typeof appointment.doctorId === 'string'
          ? appointment.doctorId
          : appointment.doctorId?._id || appointment.doctorId?.id;

        if (doctorId && allDoctors.length > 0) {
          const foundDoctor = allDoctors.find((d: any) => (d._id === doctorId || d.id === doctorId));
          if (foundDoctor) {
            doctorDetails = {
              name: foundDoctor.name || foundDoctor.fullName,
              specialty: foundDoctor.specialty || foundDoctor.specialization,
              fee: foundDoctor.fee || foundDoctor.consultationFee || foundDoctor.feeAmount || 1500,
              clinic: foundDoctor.clinic || (foundDoctor.center && foundDoctor.center.name) || (foundDoctor.centerId && foundDoctor.centerId.name),
              clinicAddress: foundDoctor.center?.address || foundDoctor.centerId?.address || foundDoctor.address,
            };
          }
        }

        if (!doctorDetails && typeof appointment.doctorId === 'object' && appointment.doctorId !== null) {
          doctorDetails = {
            name: appointment.doctorId.name,
            specialty: appointment.doctorId.specialty || appointment.doctorId.specialization,
            fee: appointment.doctorId.fee || appointment.doctorId.consultationFee || 1500,
            clinic: appointment.doctorId.clinic,
          };
        }

        return mapAppointment(appointment, doctorDetails);
      });

      setEnrichedAppointments(enriched);
      setAppointments(refreshed);
      setConfirmCancelOpen(false);
      setCancelTarget(null);
      setError(null);
    } catch (e) {
      setError('Failed to cancel appointment');
    } finally {
      setCancelLoading(false);
    }
  };

  const proceedPayment = async () => {
    if (!paymentAppointment) return;
    setPaymentModalOpen(false);
    await handlePayment({ ...paymentAppointment, selectedPaymentMethod: paymentMethod });
  };

  const handlePayment = async (appointment: any) => {
    try {
      setPaymentLoading(appointment.id);
      setError(null);

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const uid = user._id || user.id || user.userId || userId || '';

      const method = (appointment.selectedPaymentMethod || 'STRIPE').toUpperCase();
      const payload = {
        userId: uid,
        appointmentId: appointment.id || appointment.raw?._id,
        amount: appointment.fee,
        currency: 'usd',
        paymentMethod: method,
      };

      const result = method === 'PAYHERE'
        ? await createPayherePayment(payload)
        : await createPayment(payload);

      const r = result as any;

      if (method === 'PAYHERE' && r.merchant_id) {
        // PayHere returns form fields — POST them to the checkout page via a hidden form
        const PAYHERE_URL = 'https://sandbox.payhere.lk/pay/checkout';
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = PAYHERE_URL;
        Object.entries(r).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = String(value ?? '');
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
      } else if (r.checkoutUrl) {
        window.location.href = r.checkoutUrl;
      } else {
        setError('Payment session could not be created. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Payment failed. Please try again.');
    } finally {
      setPaymentLoading(null);
    }
  };

  const openRescheduleModal = async (appointment: any) => {
    setRescheduleAppointment(appointment);
    setNewDate("");
    setSelectedSlot("");
    setAvailableSlots([]);
    setRescheduleModalOpen(true);
  };

  const fetchSlotsForReschedule = async () => {
    if (!newDate || !rescheduleAppointment?.doctorId) return;

    try {
      setSlotsLoading(true);
      const results = await getAvailableSlots(rescheduleAppointment.doctorId, newDate);
      const slots = getArrayFromResponse(results) || [];
      setAvailableSlots(slots);
    } catch (e: any) {
      setError(e?.message || 'Failed to load slots');
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedSlot) {
      setError("Please select a time slot");
      return;
    }

    if (!newDate) {
      setError("Please select a date");
      return;
    }

    try {
      setRescheduleLoading(true);

      const originalNote = rescheduleAppointment?.note || rescheduleAppointment?.raw?.note || rescheduleAppointment?.raw?.notes || '';
      const originalSymptoms = rescheduleAppointment?.symptoms || rescheduleAppointment?.raw?.symptoms || '';
      const originalConsultationType = rescheduleAppointment?.consultationType || 'clinic';

      const payload = {
        patientId: userId,
        doctorId: rescheduleAppointment.doctorId,
        date: new Date(newDate).toISOString(),
        timeSlot: selectedSlot,
        consultationType: originalConsultationType,
        symptoms: originalSymptoms,
        notes: originalNote
          ? `${originalNote}\n\n[Rescheduled from original appointment ${rescheduleAppointment.id} on ${rescheduleAppointment.date} at ${rescheduleAppointment.time}]`
          : `Rescheduled from original appointment ${rescheduleAppointment.id} on ${rescheduleAppointment.date} at ${rescheduleAppointment.time}`,
      };

      await createAppointment(payload);
      await cancelAppointment(rescheduleAppointment.id, `Rescheduled by user to ${newDate} at ${selectedSlot}`);

      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (userId) params.patientId = userId;
      const refreshed = await getAppointments(params);

      let allDoctors: any[] = [];
      try {
        const doctorsResult = await searchDoctors({});
        allDoctors = getArrayFromResponse(doctorsResult);
      } catch (err) {
        console.error("Failed to fetch doctors list:", err);
      }

      const enriched = refreshed.map((appointment: any) => {
        let doctorDetails = null;
        const doctorId = typeof appointment.doctorId === 'string'
          ? appointment.doctorId
          : appointment.doctorId?._id || appointment.doctorId?.id;

        if (doctorId && allDoctors.length > 0) {
          const foundDoctor = allDoctors.find((d: any) => (d._id === doctorId || d.id === doctorId));
          if (foundDoctor) {
            doctorDetails = {
              name: foundDoctor.name || foundDoctor.fullName,
              specialty: foundDoctor.specialty || foundDoctor.specialization,
              fee: foundDoctor.fee || foundDoctor.consultationFee || foundDoctor.feeAmount || 1500,
              clinic: foundDoctor.clinic || (foundDoctor.center && foundDoctor.center.name) || (foundDoctor.centerId && foundDoctor.centerId.name),
              clinicAddress: foundDoctor.center?.address || foundDoctor.centerId?.address || foundDoctor.address,
            };
          }
        }

        if (!doctorDetails && typeof appointment.doctorId === 'object' && appointment.doctorId !== null) {
          doctorDetails = {
            name: appointment.doctorId.name,
            specialty: appointment.doctorId.specialty || appointment.doctorId.specialization,
            fee: appointment.doctorId.fee || appointment.doctorId.consultationFee || 1500,
            clinic: appointment.doctorId.clinic,
          };
        }

        return mapAppointment(appointment, doctorDetails);
      });

      setEnrichedAppointments(enriched);
      setAppointments(refreshed);
      setRescheduleModalOpen(false);
      setError(null);

      alert("Appointment rescheduled successfully! Your original notes and symptoms have been preserved.");
    } catch (e: any) {
      setError(e?.message || 'Failed to reschedule appointment');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("");
    setPage(1);
  };

  const viewAppointmentDetails = (appointment: any) => {
    setSelectedAppointment(appointment);
    setDetailsModalOpen(true);
  };

  const viewReport = (report: any) => {
    setSelectedReport(report);
    setReportViewerOpen(true);
  };

  const downloadReport = (report: any) => {
    if (report.path || report.url) {
      window.open(report.path || report.url, '_blank');
    } else {
      alert('Report file not available for download');
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <DashboardLayout title="Appointments">
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              My Appointments
            </h1>
            <p className="text-muted-foreground mt-2">Manage and track all your medical appointments</p>
            {enrichedAppointments.length > 0 && (
              <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 bg-primary/10 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-primary font-medium">{enrichedAppointments.length} Total Appointments</span>
              </div>
            )}
          </div>

          {/* Search Filters Card */}
          <Card className="mb-8 shadow-md border-0 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Search Appointments</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by doctor name, clinic, or specialty..."
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                      }}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Filter by Status</label>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                      }}
                      className="w-full pl-10 pr-8 py-2.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary h-11"
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                {(query || statusFilter) && (
                  <Button variant="outline" onClick={clearFilters} className="gap-2">
                    <X className="w-4 h-4" />
                    Clear Filters
                  </Button>
                )}
                <Button onClick={() => navigate('/appointments/consultation')} className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Appointment
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="grid grid-cols-1 gap-6">
            {/* Loading State */}
            {loading && (
              <div className="text-center py-20">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
                <p className="text-muted-foreground">Loading your appointments...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <Card className="text-center py-16 border-destructive">
                <CardContent>
                  <p className="text-destructive font-medium">{error}</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!loading && !error && filteredAppointments.length === 0 && (
              <Card className="text-center py-16 border-dashed">
                <CardContent>
                  <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Appointments Found</h3>
                  <p className="text-muted-foreground mb-6">
                    {query || statusFilter
                      ? "Try adjusting your search filters"
                      : "You don't have any appointments yet"}
                  </p>
                  {!query && !statusFilter && (
                    <Button onClick={() => navigate('/appointments/consultation')} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Book Your First Appointment
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Appointments Grid */}
            {!loading && !error && filteredAppointments.length > 0 && (
              <>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {paginatedAppointments.map((appointment, index) => (
                    <Card
                      key={appointment.id || index}
                      className="border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
                      onClick={() => viewAppointmentDetails(appointment)}
                    >
                      <CardContent className="p-6 space-y-4">
                        {/* Status Badge */}
                        <div className="flex justify-between items-start">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${appointment.status === 'confirmed' ? 'bg-green-600' :
                              appointment.status === 'pending' ? 'bg-yellow-600' :
                                appointment.status === 'cancelled' ? 'bg-red-600' : 'bg-blue-600'
                              }`} />
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                          {appointment.reports && appointment.reports.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              <FileText className="w-3 h-3" />
                              {appointment.reports.length} Report(s)
                            </span>
                          )}
                        </div>

                        {/* Doctor Info */}
                        <div className="text-center">
                          <div className="flex justify-center mb-3">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <User className="w-8 h-8 text-primary" />
                            </div>
                          </div>
                          <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                            {appointment.doctorName}
                          </h2>
                          <p className="text-sm text-primary font-medium mt-1">{appointment.specialization}</p>
                        </div>

                        {/* Clinic Location */}
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{appointment.clinic}</span>
                        </div>

                        {/* Date, Time & Fee */}
                        <div className="flex items-center justify-between pt-3 border-t">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{appointment.date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{appointment.time}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                            <DollarSign className="w-3 h-3 text-green-600" />
                            <span className="text-sm font-semibold text-green-600">Rs. {Number(appointment.fee).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              viewAppointmentDetails(appointment);
                            }}
                          >
                            View Details
                          </Button>

                          {appointment.paymentStatus === 'paid' ? (
                            <div className="flex flex-1 gap-2">
                              <Button
                                size="sm"
                                className="flex-1 bg-green-500 cursor-not-allowed hover:bg-green-400"
                                disabled
                              >
                                Paid
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                className="px-3"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadReceipt(appointment.id || appointment._id);
                                }}
                                title="Download Receipt"
                              >
                                ⬇
                              </Button>
                            </div>
                          ) : appointment.status === 'confirmed' && (
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                              disabled={paymentLoading === appointment.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPaymentAppointment(appointment);
                                setPaymentMethod("STRIPE");
                                setPaymentModalOpen(true);
                              }}
                            >
                              {paymentLoading === appointment.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <CreditCard className="w-3 h-3" />}
                              Pay Here
                            </Button>
                          )}

                          {appointment.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openRescheduleModal(appointment);
                                }}
                              >
                                <CalendarIcon className="w-3 h-3" />
                                Reschedule
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancel(appointment.id, appointment.status, appointment);
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }

                        if (pageNum > 0 && pageNum <= totalPages) {
                          return (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(pageNum)}
                              className="w-10"
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                        return null;
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}

                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, filteredAppointments.length)} of {filteredAppointments.length} appointments
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Appointment Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Appointment Details
            </DialogTitle>
            <DialogDescription>
              Complete information about your appointment
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4 py-2">
              {/* Status */}
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Status</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedAppointment.status)}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${selectedAppointment.status === 'confirmed' ? 'bg-green-600' :
                    selectedAppointment.status === 'pending' ? 'bg-yellow-600' :
                      selectedAppointment.status === 'cancelled' ? 'bg-red-600' : 'bg-blue-600'
                    }`} />
                  {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                </span>
              </div>

              {/* Doctor Info */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <User className="w-5 h-5 text-primary" />
                  <span className="font-medium">Doctor Information</span>
                </div>
                <p className="text-base font-semibold">{selectedAppointment.doctorName}</p>
                <p className="text-sm text-primary mt-1">{selectedAppointment.specialization}</p>
              </div>

              {/* Location */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span className="font-medium">Location</span>
                </div>
                <p className="text-sm">{selectedAppointment.clinic}</p>
                {selectedAppointment.clinicAddress && (
                  <p className="text-xs text-muted-foreground mt-1">{selectedAppointment.clinicAddress}</p>
                )}
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Date</span>
                  </div>
                  <p className="text-sm font-medium">{selectedAppointment.date}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Time</span>
                  </div>
                  <p className="text-sm font-medium">{selectedAppointment.time}</p>
                </div>
              </div>

              {/* Consultation Type */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  {selectedAppointment.consultationType === 'video' ? (
                    <Video className="w-5 h-5 text-primary" />
                  ) : (
                    <Building className="w-5 h-5 text-primary" />
                  )}
                  <span className="font-medium">Consultation Type</span>
                </div>
                <p className="text-sm font-medium">
                  {selectedAppointment.consultationType === 'video' ? 'Video Call Consultation' : 'In-Clinic Consultation'}
                </p>
                {selectedAppointment.consultationType === 'video' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    A video consultation link will be sent to your email before the appointment
                  </p>
                )}
              </div>

              {/* Fee */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Consultation Fee</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">Rs. {Number(selectedAppointment.fee).toLocaleString()}</p>
                </div>
              </div>

              {/* Reports Section */}
              {selectedAppointment.reports && selectedAppointment.reports.length > 0 && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="font-medium">Attached Reports ({selectedAppointment.reports.length})</span>
                  </div>
                  <div className="space-y-2">
                    {selectedAppointment.reports.map((report: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-background rounded-md border">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[200px]">
                            {report.originalName || report.filename || `Report ${idx + 1}`}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewReport(report)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadReport(report)}
                            className="h-8 w-8 p-0"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Button in Modal for Confirmed Appointments */}
              {selectedAppointment.paymentStatus === 'paid' ? (
                <Button className="w-full bg-gray-400 hover:bg-gray-400" disabled>
                  Paid
                </Button>
              ) : selectedAppointment.status === 'confirmed' ? (
                <Button
                  className="w-full gap-2 bg-green-600 hover:bg-green-700"
                  disabled={paymentLoading === selectedAppointment.id}
                  onClick={() => {
                    setDetailsModalOpen(false);
                    setPaymentAppointment(selectedAppointment);
                    setPaymentMethod("STRIPE");
                    setPaymentModalOpen(true);
                  }}
                >
                  {paymentLoading === selectedAppointment.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CreditCard className="w-4 h-4" />}
                  Pay Now
                </Button>
              ) : null}

              {/* Reschedule Button in Modal for Pending Appointments */}
              {selectedAppointment.status === 'pending' && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    setDetailsModalOpen(false);
                    openRescheduleModal(selectedAppointment);
                  }}
                >
                  <CalendarIcon className="w-4 h-4" />
                  Reschedule Appointment
                </Button>
              )}

              {/* Symptoms */}
              {selectedAppointment.symptoms && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Stethoscope className="w-5 h-5 text-primary" />
                    <span className="font-medium">Symptoms</span>
                  </div>
                  <p className="text-sm">{selectedAppointment.symptoms}</p>
                </div>
              )}

              {/* Additional Notes */}
              {selectedAppointment.note && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium">Additional Notes</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{selectedAppointment.note}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Choose Payment Method
            </DialogTitle>
            <DialogDescription>
              Select your payment gateway to continue
            </DialogDescription>
          </DialogHeader>

          {paymentAppointment && (
            <div className="space-y-4 py-2">
              {/* Appointment Details */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">Appointment Details</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Doctor</p>
                    <p className="font-medium">{paymentAppointment.doctorName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Specialization</p>
                    <p className="font-medium">{paymentAppointment.specialization}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Date</p>
                    <p className="font-medium">{paymentAppointment.date}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Time</p>
                    <p className="font-medium">{paymentAppointment.time}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Clinic</p>
                    <p className="font-medium">{paymentAppointment.clinic}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Type</p>
                    <p className="font-medium capitalize">
                      {paymentAppointment.consultationType === 'video' ? 'Video Call' : 'In-Clinic'}
                    </p>
                  </div>
                </div>
                {paymentAppointment.symptoms && (
                  <div className="pt-1 border-t">
                    <p className="text-muted-foreground text-xs">Symptoms</p>
                    <p className="text-sm mt-0.5">{paymentAppointment.symptoms}</p>
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Total Amount</span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  Rs. {Number(paymentAppointment.fee || paymentAppointment.paymentAmount || 1500).toLocaleString()}
                </span>
              </div>

              {/* Gateway Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Select Payment Gateway</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("STRIPE")}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                      paymentMethod === 'STRIPE'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <CreditCard className="w-6 h-6" />
                    Stripe
                    <span className="text-xs text-muted-foreground font-normal">Credit / Debit Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("PAYHERE")}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                      paymentMethod === 'PAYHERE'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <DollarSign className="w-6 h-6" />
                    PayHere
                    <span className="text-xs text-muted-foreground font-normal">Local Payment</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentModalOpen(false)}
              disabled={!!paymentLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={proceedPayment}
              disabled={!!paymentLoading}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Continue Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Viewer Modal */}
      <Dialog open={reportViewerOpen} onOpenChange={setReportViewerOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Report Details
            </DialogTitle>
            <DialogDescription>
              {selectedReport?.originalName || selectedReport?.filename || 'Medical Report'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {selectedReport && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-2">File Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Filename:</span> {selectedReport.originalName || selectedReport.filename}</p>
                    <p><span className="text-muted-foreground">File Type:</span> {selectedReport.mimeType || 'Unknown'}</p>
                    {selectedReport.size && (
                      <p><span className="text-muted-foreground">Size:</span> {(selectedReport.size / 1024).toFixed(2)} KB</p>
                    )}
                    {selectedReport.uploadedAt && (
                      <p><span className="text-muted-foreground">Uploaded:</span> {new Date(selectedReport.uploadedAt).toLocaleString()}</p>
                    )}
                  </div>
                </div>

                {/* Preview for images */}
                {selectedReport.mimeType?.startsWith('image/') && (selectedReport.path || selectedReport.url) && (
                  <div className="border rounded-lg p-2">
                    <img
                      src={selectedReport.path || selectedReport.url}
                      alt="Report preview"
                      className="max-w-full h-auto rounded"
                      style={{ maxHeight: '400px', margin: '0 auto' }}
                    />
                  </div>
                )}

                {/* For PDFs and other files */}
                {selectedReport.mimeType === 'application/pdf' && (selectedReport.path || selectedReport.url) && (
                  <div className="border rounded-lg p-2">
                    <iframe
                      src={selectedReport.path || selectedReport.url}
                      className="w-full"
                      style={{ height: '400px' }}
                      title="PDF Viewer"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportViewerOpen(false)}>
              Close
            </Button>
            {selectedReport && (
              <Button onClick={() => downloadReport(selectedReport)} className="gap-2">
                <Download className="w-4 h-4" />
                Download Report
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Modal */}
      <Dialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Cancellation</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {cancelTarget?.appointment ? (
              <div className="space-y-2">
                <div className="font-medium">Doctor: {cancelTarget.appointment.doctorName || cancelTarget.appointment.doctorId}</div>
                <div className="text-sm text-muted-foreground">Date: {cancelTarget.appointment.date || cancelTarget.appointment.rawDate}</div>
                <div className="text-sm text-muted-foreground">Time: {cancelTarget.appointment.time}</div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmCancelOpen(false); setCancelTarget(null); }}>
              Keep Appointment
            </Button>
            <Button className="ml-2" disabled={cancelLoading} onClick={executeCancel}>
              {cancelLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={rescheduleModalOpen} onOpenChange={setRescheduleModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              Reschedule Appointment
            </DialogTitle>
            <DialogDescription>
              Choose a new date and time for your appointment with {rescheduleAppointment?.doctorName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select New Date</label>
              <Input
                type="date"
                min={today}
                value={newDate}
                onChange={(e) => {
                  setNewDate(e.target.value);
                  setSelectedSlot("");
                  setAvailableSlots([]);
                }}
                className="h-11"
              />
              {newDate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={fetchSlotsForReschedule}
                  disabled={slotsLoading}
                >
                  {slotsLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Check Available Slots
                </Button>
              )}
            </div>

            {availableSlots.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Select Time Slot</label>
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                  {availableSlots.map((slot: any, idx: number) => {
                    const time = typeof slot === 'string' ? slot : (slot.timeSlot || slot.time || slot.label);
                    const isBooked = typeof slot === 'object' ? !!slot.isBooked : false;
                    return (
                      <Button
                        key={idx}
                        variant={selectedSlot === time ? "default" : "outline"}
                        size="sm"
                        disabled={isBooked}
                        onClick={() => setSelectedSlot(time)}
                        className="justify-start"
                      >
                        <Clock className="w-3 h-3 mr-2" />
                        {time}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {newDate && !slotsLoading && availableSlots.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No slots available for this date
              </div>
            )}

            {/* Display original notes being preserved */}
            {rescheduleAppointment && (rescheduleAppointment.note || rescheduleAppointment.symptoms) && (
              <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">📝 The following will be preserved:</p>
                {rescheduleAppointment.symptoms && (
                  <p className="text-xs"><strong>Symptoms:</strong> {rescheduleAppointment.symptoms}</p>
                )}
                {rescheduleAppointment.note && (
                  <p className="text-xs mt-1"><strong>Notes:</strong> {rescheduleAppointment.note.substring(0, 100)}...</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={!selectedSlot || rescheduleLoading}
              className="gap-2"
            >
              {rescheduleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}