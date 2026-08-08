/**
 * Shared staff aggregations so the Manager Dashboard, Mechanic/Staff
 * dashboards, and the Reports page all report the exact same numbers
 * for the exact same range - one query shape, reused everywhere instead
 * of drifting apart.
 */
import Attendance from '../models/Attendance.js';
import ServiceJob from '../models/ServiceJob.js';
import { toDateKey } from './dates.js';

/** Who has an attendance record today - the only thing "clocked in" means. */
export async function clockedInTodaySet() {
  const rows = await Attendance.find({ workDate: toDateKey() }).select('employee');
  return new Set(rows.map((r) => String(r.employee)));
}

/**
 * Attaches clockedInToday to each user. Employees confirm their own
 * attendance by clocking in - there is no manager-set "available" toggle,
 * so this is the only status the UI should ever show.
 */
export async function withClockStatus(users) {
  const clockedIn = await clockedInTodaySet();
  return users.map((u) => {
    const obj = typeof u.toObject === 'function' ? u.toObject() : { ...u };
    obj.clockedInToday = clockedIn.has(String(obj._id));
    return obj;
  });
}

/** Hours worked, days present, and completed jobs per employee for a date range. */
export async function staffHoursAndJobs({ from, to, fromKey, toKey }) {
  const [attendanceRows, completedByEmployee] = await Promise.all([
    Attendance.aggregate([
      { $match: { workDate: { $gte: fromKey, $lte: toKey } } },
      {
        $group: {
          _id: '$employee',
          totalMinutes: { $sum: '$minutesWorked' },
          daysPresent: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
        },
      },
    ]),
    ServiceJob.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: from, $lte: to } } },
      { $unwind: '$assignedTo' },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
    ]),
  ]);

  const hoursById = new Map(attendanceRows.map((r) => [String(r._id), r]));
  const completedById = new Map(completedByEmployee.map((r) => [String(r._id), r.count]));

  return { hoursById, completedById };
}

/** Merge staffHoursAndJobs results onto a list of user objects. */
export function mergeStaffStats(users, { hoursById, completedById }) {
  return users.map((u) => {
    const id = String(u._id);
    const attendance = hoursById.get(id);
    return {
      ...u,
      totalHours: attendance ? Math.round((attendance.totalMinutes / 60) * 100) / 100 : 0,
      daysPresent: attendance?.daysPresent || 0,
      completedJobs: completedById.get(id) || 0,
    };
  });
}
