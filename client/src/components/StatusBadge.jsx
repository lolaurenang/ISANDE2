const LABELS = {
  available: 'Available',
  'on-duty': 'On duty',
  absent: 'Absent',
  'off-duty': 'Off duty',
  unavailable: 'Unavailable',
  scheduled: 'Scheduled',
  'in-progress': 'In progress',
  'for-approval': 'For approval',
  'ready-for-pickup': 'Ready for pickup',
  completed: 'Done',
  cancelled: 'Cancelled',
  present: 'Present',
  late: 'Late',
  pending: 'Pending',
  approved: 'Approved',
  denied: 'Denied',
  free: 'Free',
  manageable: 'Manageable',
  busy: 'Busy',
};

export default function StatusBadge({ status, label }) {
  return <span className={`status-badge status-${status}`}>{label || LABELS[status] || status}</span>;
}
