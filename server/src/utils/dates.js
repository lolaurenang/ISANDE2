/**
 * Date helpers. The whole system stores calendar days as 'YYYY-MM-DD'
 * strings so that a shift on July 3 is July 3 for everyone, regardless
 * of the timezone of the phone or laptop that created it.
 */
export function toDateKey(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date');
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfDay(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

export function endOfDay(dateKey) {
  return new Date(`${dateKey}T23:59:59.999`);
}

/** Inclusive list of 'YYYY-MM-DD' keys between two dates. */
export function eachDateKey(start, end) {
  const keys = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cursor <= last) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export function minutesBetween(from, to) {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
}

/** Range covering a week / month / year that contains `dateKey`. */
export function rangeFor(view, dateKey) {
  const base = startOfDay(dateKey);
  let from;
  let to;

  if (view === 'week') {
    from = new Date(base);
    from.setDate(from.getDate() - from.getDay()); // Sunday
    to = new Date(from);
    to.setDate(to.getDate() + 6);
  } else if (view === 'year') {
    from = new Date(base.getFullYear(), 0, 1);
    to = new Date(base.getFullYear(), 11, 31);
  } else {
    from = new Date(base.getFullYear(), base.getMonth(), 1);
    to = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  }

  to.setHours(23, 59, 59, 999);
  return { from, to };
}
