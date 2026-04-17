import apiClient, { extractErrorMessage } from "@/services/api/apiClient";

export type Appointment = {
  _id?: string;
  id?: string;
  patientName?: string;
  patientId?: string;
  doctorName?: string;
  doctorId?: string;
  date?: string;
  timeSlot?: string;
  status?: string;
  [key: string]: any;
};

function throwErr(err: unknown): never {
  throw new Error(extractErrorMessage(err));
}

function normalizeDateForSlotQuery(date: string): string {
  if (!date) return date;

  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toISOString().slice(0, 10);
}

export async function getAppointments(params?: {
  patientId?: string;
  doctorId?: string;
  status?: string;
}): Promise<Appointment[]> {
  const qs = new URLSearchParams();
  if (params?.patientId) qs.set("patientId", params.patientId);
  if (params?.doctorId) qs.set("doctorId", params.doctorId);
  if (params?.status) qs.set("status", params.status);
  const url = `/api/appointments${qs.toString() ? `?${qs}` : ""}`;

  try {
    const { data } = await apiClient.get<{
      success: boolean;
      count: number;
      data: Appointment[];
    }>(url);
    return data?.data || [];
  } catch (err) {
    throwErr(err);
  }
}

export async function getAppointmentById(id: string): Promise<Appointment | null> {
  try {
    const { data } = await apiClient.get<{ success: boolean; data: Appointment }>(
      `/api/appointments/${id}`
    );
    return data?.data || null;
  } catch (err) {
    throwErr(err);
  }
}

export async function updateAppointmentStatus(
  id: string,
  status: string,
  notes?: string
): Promise<Appointment> {
  try {
    const { data } = await apiClient.patch<{ success: boolean; data: Appointment }>(
      `/api/appointments/${id}/status`,
      { status, notes }
    );
    return data?.data;
  } catch (err) {
    throwErr(err);
  }
}

export async function cancelAppointment(
  id: string,
  reason?: string
): Promise<Appointment> {
  try {
    const { data } = await apiClient.post<{ success: boolean; data: Appointment }>(
      `/api/appointments/${id}/cancel`,
      { reason }
    );
    return data?.data;
  } catch (err) {
    throwErr(err);
  }
}

export async function rescheduleAppointment(
  id: string,
  newDate: string,
  newTimeSlot: string,
  reason?: string
): Promise<Appointment> {
  try {
    const { data } = await apiClient.put<{ success: boolean; data: Appointment }>(
      `/api/appointments/${id}/reschedule`,
      { newDate, newTimeSlot, reason }
    );
    return data?.data;
  } catch (err) {
    throwErr(err);
  }
}

export async function createAppointment(payload: {
  patientId: string;
  doctorId: string;
  date: string;
  timeSlot: string;
  consultationType?: string;
  symptoms?: string;
  notes?: string;
  paymentAmount?: number;
  reportFile?: File | null;
}): Promise<Appointment> {
  const url = "/api/appointments";

  if (payload.reportFile) {
    const form = new FormData();
    form.append("patientId", payload.patientId);
    form.append("doctorId", payload.doctorId);
    form.append("date", payload.date);
    form.append("timeSlot", payload.timeSlot);
    if (payload.consultationType) form.append("consultationType", payload.consultationType);
    if (payload.symptoms) form.append("symptoms", payload.symptoms);
    if (payload.notes) form.append("notes", payload.notes);
    if (typeof payload.paymentAmount !== "undefined") {
      form.append("paymentAmount", String(payload.paymentAmount));
    }
    form.append("report", payload.reportFile);

    try {
      console.log("[appointmentsService] createAppointment multipart payload:", {
        patientId: payload.patientId,
        doctorId: payload.doctorId,
        date: payload.date,
        timeSlot: payload.timeSlot,
        consultationType: payload.consultationType,
      });

      const { data } = await apiClient.post<{ success: boolean; data: Appointment }>(
        url,
        form,
        {
          headers: { "Content-Type": undefined as any },
        }
      );
      return data?.data;
    } catch (err) {
      console.error("[appointmentsService] createAppointment multipart error:", err);
      throwErr(err);
    }
  }

  try {
    console.log("[appointmentsService] createAppointment payload:", payload);
    const { data } = await apiClient.post<{ success: boolean; data: Appointment }>(
      url,
      payload
    );
    return data?.data;
  } catch (err) {
    console.error("[appointmentsService] createAppointment error:", err);
    throwErr(err);
  }
}

export async function searchDoctors(params?: {
  specialty?: string;
  name?: string;
  date?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.specialty) qs.set("specialty", params.specialty);
  if (params?.name) qs.set("name", params.name);
  if (params?.date) qs.set("date", normalizeDateForSlotQuery(params.date));

  const url = `/api/appointments/doctors/search${qs.toString() ? `?${qs}` : ""}`;

  try {
    console.log("[appointmentsService] searchDoctors ->", url);
    const { data } = await apiClient.get(url);
    console.log("[appointmentsService] searchDoctors <-", data);
    return (data as any)?.data || [];
  } catch (err) {
    console.error("[appointmentsService] searchDoctors error:", err);
    throwErr(err);
  }
}

export async function getAvailableSlots(doctorId: string, date: string) {
  const normalizedDate = normalizeDateForSlotQuery(date);
  const qs = new URLSearchParams({ doctorId, date: normalizedDate });
  const url = `/api/appointments/doctors/available-slots?${qs}`;

  try {
    console.log("[appointmentsService] getAvailableSlots request:", {
      doctorId,
      originalDate: date,
      normalizedDate,
      url,
    });

    const { data } = await apiClient.get(url);

    console.log("[appointmentsService] getAvailableSlots response:", data);

    return (data as any)?.data || [];
  } catch (err) {
    console.error("[appointmentsService] getAvailableSlots error:", err);
    throwErr(err);
  }
}

export const downloadReceipt = async (appointmentId: string) => {
  if (!appointmentId) {
    throw new Error("Appointment ID is missing");
  }

  const response = await fetch(`/api/appointments/${appointmentId}/receipt`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to download receipt");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `receipt-${appointmentId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};