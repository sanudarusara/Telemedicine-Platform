import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Calendar, Clock, MapPin } from 'lucide-react';

type Props = {
  appointment: any;
  onCancel?: (id: string) => void;
};

export const AppointmentCard: React.FC<Props> = ({ appointment, onCancel }) => {
  const [doctor, setDoctor] = useState<any>(typeof appointment.doctorId === 'object' ? appointment.doctorId : null);
  const [loadingDoctor, setLoadingDoctor] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchDoctorIfNeeded() {
      if (doctor) return;
      const docId = appointment.doctorId;
      if (!docId || typeof docId !== 'string') return;
      try {
        setLoadingDoctor(true);
        const API_BASE = import.meta.env.VITE_APPOINTMENT_API_URL || '';
        const DOCTOR_BASE = import.meta.env.VITE_DOCTOR_SERVICE_URL || API_BASE || '';
        const res = await fetch(`${DOCTOR_BASE}/api/auth/doctors/${docId}`);
        const j = await res.json().catch(() => null);
        if (!mounted) return;
        if (res.ok && j?.data) {
          setDoctor(j.data);
        }
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoadingDoctor(false);
      }
    }
    fetchDoctorIfNeeded();
    return () => { mounted = false; };
  }, [appointment.doctorId, doctor]);

  const dispName = doctor?.name || appointment.doctorName || 'Doctor not available';
  const dispSpec = doctor?.specialty || doctor?.specialization || appointment.specialization || 'Not available';
  const dispClinic = appointment.clinic || doctor?.clinic || (doctor?.center && doctor.center.name) || 'Center not available';
  const dispDate = appointment.date || (appointment.slot && appointment.slot.date) || 'Not available';
  const dispTime = appointment.time || (appointment.slot && (appointment.slot.startTime || appointment.slot.time)) || 'Not available';
  const dispFee = Number(appointment.fee || doctor?.fee || 0);

  return (
    <Card className="animate-fade-in">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-display font-semibold text-foreground">{dispName}{loadingDoctor && <span className="ml-2 text-xs text-muted-foreground">(loading)</span>}</h3>
            <p className="text-sm text-primary">{dispSpec}</p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" />
            <span>{dispClinic}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>{dispDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            <span>{dispTime}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <span className="text-sm font-medium text-foreground">Rs. {dispFee.toLocaleString()}</span>
          {(appointment.status === 'pending' || appointment.status === 'confirmed') && onCancel && (
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => onCancel(appointment.id)}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AppointmentCard;
