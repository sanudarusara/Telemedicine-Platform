export type Appointment = {
  _id?: string;
  id?: string;
  patientName?: string;
  patientId?: string;
  doctorName?: string;
  doctorId?: string;
  date?: string; // ISO date
  timeSlot?: string;
  status?: string;
  [key: string]: any;
}

const API_BASE = import.meta.env.VITE_APPOINTMENT_API_URL || "http://localhost:3001";

export async function getAppointments(params?: {
  patientId?: string;
  doctorId?: string;
  status?: string;
}): Promise<Appointment[]> {
  const qs = new URLSearchParams();
  if (params?.patientId) qs.set('patientId', params.patientId);
  if (params?.doctorId) qs.set('doctorId', params.doctorId);
  if (params?.status) qs.set('status', params.status);

  const url = `${API_BASE}/api/appointments${qs.toString() ? `?${qs.toString()}` : ''}`;

  const res = await fetch(url, { method: 'GET' });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || data?.message || 'Failed to fetch appointments');
  }

  // API returns { success, count, data }
  return data?.data || [];
}

export async function getAppointmentById(id: string): Promise<Appointment | null> {
  const res = await fetch(`${API_BASE}/api/appointments/${id}`, { method: 'GET' });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || data?.message || 'Failed to fetch appointment');
  }

  return data?.data || null;
}

export async function updateAppointmentStatus(
  id: string,
  status: string,
  notes?: string
): Promise<Appointment> {
  const res = await fetch(`${API_BASE}/api/appointments/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes }),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || data?.message || 'Failed to update status');
  }

  return data?.data;
}

export async function cancelAppointment(id: string, reason?: string): Promise<Appointment> {
  const res = await fetch(`${API_BASE}/api/appointments/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || data?.message || 'Failed to cancel appointment');
  }

  return data?.data;
}

export async function rescheduleAppointment(
  id: string,
  newDate: string,
  newTimeSlot: string,
  reason?: string
): Promise<Appointment> {
  const res = await fetch(`${API_BASE}/api/appointments/${id}/reschedule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newDate, newTimeSlot, reason }),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || data?.message || 'Failed to reschedule appointment');
  }

  return data?.data;
}
