import React from 'react';

const statusMap: Record<string, { label: string; className: string }> = {
  confirmed: { label: 'Confirmed', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  cancelled: { label: 'Cancelled', className: 'bg-rose-100 text-rose-800 border-rose-200' },
  completed: { label: 'Completed', className: 'bg-sky-100 text-sky-800 border-sky-200' },
};

export const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const key = (status || 'pending').toLowerCase();
  const info = statusMap[key] || { label: status || 'Unknown', className: 'bg-muted/20 text-muted-foreground' };
  return (
    <div className={`${info.className} rounded-full px-3 py-1 text-xs font-medium`}>{info.label}</div>
  );
};

export default StatusBadge;
