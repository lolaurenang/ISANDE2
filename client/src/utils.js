/** Small formatting helpers shared by the views. */

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function toDateKey(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateRange(start, end) {
  const a = formatDate(start);
  const b = formatDate(end);
  return a === b ? a : `${a} - ${b}`;
}

export function formatTime(value) {
  if (!value) return '--:--';
  return new Date(value).toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Builds the 6-week grid a month calendar needs, including the greyed
 * out days from the neighbouring months.
 */
export function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return {
      date,
      key: toDateKey(date),
      dayNumber: date.getDate(),
      inMonth: date.getMonth() === month,
      isToday: toDateKey(date) === toDateKey(new Date()),
    };
  });
}

export function buildWeek(anchor = new Date()) {
  const start = new Date(anchor);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return { date, key: toDateKey(date), dayNumber: date.getDate(), isToday: toDateKey(date) === toDateKey(new Date()) };
  });
}

/** True when `key` (YYYY-MM-DD) falls inside a job's start..end range. */
export function jobCoversDate(job, key) {
  // The shop is closed Sundays, so nothing ever shows as happening that day -
  // even a job whose range spans across one.
  if (new Date(`${key}T00:00:00`).getDay() === 0) return false;
  return toDateKey(job.startDate) <= key && key <= toDateKey(job.endDate);
}

export function jobTypeClass(serviceType = 'other') {
  if (serviceType.includes('bike')) return 'tag-bike';
  if (serviceType.includes('motorcycle')) return 'tag-motorcycle';
  if (serviceType.includes('supplier')) return 'tag-supplier';
  return 'tag-other';
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
