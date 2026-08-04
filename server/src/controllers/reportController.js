/**
 * CONTROLLER: reports
 * ---------------------------------------------------------------
 * Six manager reports, each available two ways from the same handler:
 *
 *   ?format=json  → rows + columns, for the on-screen preview table
 *   ?format=csv   → the same rows as a downloadable file
 *
 * Building both from one query means the file can never disagree with
 * what the manager saw before pressing Download.
 */
import Attendance from '../models/Attendance.js';
import ServiceJob from '../models/ServiceJob.js';
import ActivityLog from '../models/ActivityLog.js';
import Availability from '../models/Availability.js';
import ShiftRequest from '../models/ShiftRequest.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendCsv, reportFilename } from '../utils/csv.js';
import { toDateKey, startOfDay, endOfDay, rangeFor } from '../utils/dates.js';

const SERVICE_LABELS = {
  'motorcycle-repair': 'Motorcycle repair',
  'bike-repair': 'Bike repair',
  'oil-change': 'Oil change',
  'engine-tuneup': 'Engine tune-up',
  overhaul: 'Overhaul',
  'wheel-alignment': 'Wheel alignment',
  'supplier-delivery': 'Supplier delivery',
  other: 'Other',
};

const time = (d) =>
  d ? new Date(d).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
const hours = (mins) => Math.round(((mins || 0) / 60) * 100) / 100;

/* ------------------------------------------------------------------ */
/* Each builder returns { title, columns, rows }                       */
/* ------------------------------------------------------------------ */

async function attendanceReport(fromKey, toKey) {
  const records = await Attendance.find({ workDate: { $gte: fromKey, $lte: toKey } })
    .populate('employee', 'fullName jobTitle department')
    .sort({ workDate: 1, createdAt: 1 });

  return {
    title: 'Daily attendance',
    columns: [
      { key: 'workDate', label: 'Date' },
      { key: 'employee', label: 'Employee' },
      { key: 'jobTitle', label: 'Job title' },
      { key: 'department', label: 'Department' },
      { key: 'clockIn', label: 'Clock in' },
      { key: 'clockOut', label: 'Clock out' },
      { key: 'hours', label: 'Hours' },
      { key: 'status', label: 'Status' },
      { key: 'notes', label: 'Notes' },
    ],
    rows: records.map((r) => ({
      workDate: r.workDate,
      employee: r.employee?.fullName || 'Removed account',
      jobTitle: r.employee?.jobTitle || '',
      department: r.employee?.department || '',
      clockIn: time(r.clockIn),
      clockOut: time(r.clockOut),
      hours: hours(r.minutesWorked),
      status: r.status,
      notes: r.notes || '',
    })),
  };
}

async function hoursSummaryReport(fromKey, toKey) {
  const grouped = await Attendance.aggregate([
    { $match: { workDate: { $gte: fromKey, $lte: toKey } } },
    {
      $group: {
        _id: '$employee',
        totalMinutes: { $sum: '$minutesWorked' },
        daysPresent: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
        daysLate: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
        daysAbsent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        daysOnLeave: { $sum: { $cond: [{ $eq: ['$status', 'on-leave'] }, 1, 0] } },
        openShifts: { $sum: { $cond: [{ $and: ['$clockIn', { $not: ['$clockOut'] }] }, 1, 0] } },
      },
    },
  ]);

  const users = await User.find({ isActive: true }).select(
    'fullName jobTitle department weeklyHourTarget'
  );
  const byId = new Map(grouped.map((g) => [String(g._id), g]));

  const rows = users
    .map((u) => {
      const g = byId.get(u.id) || {};
      const total = hours(g.totalMinutes);
      const present = g.daysPresent || 0;
      return {
        employee: u.fullName,
        jobTitle: u.jobTitle,
        department: u.department,
        totalHours: total,
        daysPresent: present,
        daysLate: g.daysLate || 0,
        daysAbsent: g.daysAbsent || 0,
        daysOnLeave: g.daysOnLeave || 0,
        avgHoursPerDay: present ? Math.round((total / present) * 100) / 100 : 0,
        missingClockOut: g.openShifts || 0,
      };
    })
    .sort((a, b) => b.totalHours - a.totalHours);

  return {
    title: 'Hours summary',
    columns: [
      { key: 'employee', label: 'Employee' },
      { key: 'jobTitle', label: 'Job title' },
      { key: 'department', label: 'Department' },
      { key: 'totalHours', label: 'Total hours' },
      { key: 'daysPresent', label: 'Days present' },
      { key: 'daysLate', label: 'Days late' },
      { key: 'daysAbsent', label: 'Days absent' },
      { key: 'daysOnLeave', label: 'Days on leave' },
      { key: 'avgHoursPerDay', label: 'Avg hours/day' },
      { key: 'missingClockOut', label: 'Missing clock-out' },
    ],
    rows,
  };
}

async function serviceJobReport(from, to) {
  const jobs = await ServiceJob.find({ startDate: { $lte: to }, endDate: { $gte: from } })
    .populate('assignedTo', 'fullName jobTitle')
    .populate('createdBy', 'fullName')
    .sort({ startDate: 1 });

  return {
    title: 'Service jobs',
    columns: [
      { key: 'startDate', label: 'Start date' },
      { key: 'endDate', label: 'End date' },
      { key: 'title', label: 'Job' },
      { key: 'serviceType', label: 'Service type' },
      { key: 'clientName', label: 'Client' },
      { key: 'assignedTo', label: 'Assigned to' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'durationDays', label: 'Days' },
      { key: 'completedAt', label: 'Completed on' },
      { key: 'description', label: 'Description' },
    ],
    rows: jobs.map((j) => ({
      startDate: toDateKey(j.startDate),
      endDate: toDateKey(j.endDate),
      title: j.title,
      serviceType: SERVICE_LABELS[j.serviceType] || j.serviceType,
      clientName: j.clientName || '',
      assignedTo: j.assignedTo?.fullName || 'Unassigned',
      status: j.status,
      priority: j.priority,
      durationDays: j.durationDays,
      completedAt: j.completedAt ? toDateKey(j.completedAt) : '',
      description: j.description || '',
    })),
  };
}

async function productivityReport(from, to, fromKey, toKey) {
  const [jobGroups, logGroups, attendanceGroups, users] = await Promise.all([
    ServiceJob.aggregate([
      { $match: { startDate: { $lte: to }, endDate: { $gte: from }, assignedTo: { $ne: null } } },
      {
        $group: {
          _id: '$assignedTo',
          assigned: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        },
      },
    ]),
    ActivityLog.aggregate([
      { $match: { loggedAt: { $gte: from, $lte: to }, type: 'work' } },
      { $group: { _id: '$employee', workLogs: { $sum: 1 } } },
    ]),
    Attendance.aggregate([
      { $match: { workDate: { $gte: fromKey, $lte: toKey } } },
      { $group: { _id: '$employee', minutes: { $sum: '$minutesWorked' } } },
    ]),
    User.find({ isActive: true, role: { $ne: 'manager' } }).select('fullName jobTitle department'),
  ]);

  const jobMap = new Map(jobGroups.map((g) => [String(g._id), g]));
  const logMap = new Map(logGroups.map((g) => [String(g._id), g]));
  const attMap = new Map(attendanceGroups.map((g) => [String(g._id), g]));

  const rows = users
    .map((u) => {
      const j = jobMap.get(u.id) || {};
      const assigned = j.assigned || 0;
      const completed = j.completed || 0;
      const worked = hours(attMap.get(u.id)?.minutes);
      return {
        employee: u.fullName,
        jobTitle: u.jobTitle,
        department: u.department,
        jobsAssigned: assigned,
        jobsCompleted: completed,
        completionRate: assigned ? `${Math.round((completed / assigned) * 100)}%` : '-',
        workLogs: logMap.get(u.id)?.workLogs || 0,
        hoursWorked: worked,
        hoursPerJob: completed ? Math.round((worked / completed) * 100) / 100 : 0,
      };
    })
    .sort((a, b) => b.jobsCompleted - a.jobsCompleted);

  return {
    title: 'Employee productivity',
    columns: [
      { key: 'employee', label: 'Employee' },
      { key: 'jobTitle', label: 'Job title' },
      { key: 'department', label: 'Department' },
      { key: 'jobsAssigned', label: 'Jobs assigned' },
      { key: 'jobsCompleted', label: 'Jobs completed' },
      { key: 'completionRate', label: 'Completion rate' },
      { key: 'workLogs', label: 'Work logs' },
      { key: 'hoursWorked', label: 'Hours worked' },
      { key: 'hoursPerJob', label: 'Hours per completed job' },
    ],
    rows,
  };
}

async function activityLogReport(from, to) {
  const logs = await ActivityLog.find({ loggedAt: { $gte: from, $lte: to } })
    .populate('employee', 'fullName jobTitle')
    .populate('relatedJob', 'title')
    .sort({ loggedAt: -1 });

  return {
    title: 'Activity log',
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'time', label: 'Time' },
      { key: 'employee', label: 'Employee' },
      { key: 'type', label: 'Type' },
      { key: 'message', label: 'Entry' },
      { key: 'work', label: 'Work done' },
      { key: 'clientName', label: 'Client' },
      { key: 'job', label: 'Related job' },
    ],
    rows: logs.map((l) => ({
      date: toDateKey(l.loggedAt),
      time: time(l.loggedAt),
      employee: l.employee?.fullName || 'Removed account',
      type: l.type,
      message: l.message,
      work: l.work || '',
      clientName: l.clientName || '',
      job: l.relatedJob?.title || '',
    })),
  };
}

async function availabilityReport(fromKey, toKey) {
  const slots = await Availability.find({ workDate: { $gte: fromKey, $lte: toKey } })
    .populate('employee', 'fullName jobTitle department')
    .sort({ workDate: 1 });

  return {
    title: 'Declared availability',
    columns: [
      { key: 'workDate', label: 'Date' },
      { key: 'employee', label: 'Employee' },
      { key: 'jobTitle', label: 'Job title' },
      { key: 'available', label: 'Available' },
      { key: 'startTime', label: 'From' },
      { key: 'endTime', label: 'Until' },
      { key: 'note', label: 'Note' },
    ],
    rows: slots.map((s) => ({
      workDate: s.workDate,
      employee: s.employee?.fullName || 'Removed account',
      jobTitle: s.employee?.jobTitle || '',
      available: s.isAvailable ? 'Yes' : 'No',
      startTime: s.startTime,
      endTime: s.endTime,
      note: s.note || '',
    })),
  };
}

async function shiftRequestReport(fromKey, toKey) {
  const requests = await ShiftRequest.find({ workDate: { $gte: fromKey, $lte: toKey } })
    .populate('requestedBy', 'fullName jobTitle')
    .populate('reviewedBy', 'fullName')
    .sort({ workDate: 1 });

  return {
    title: 'Shift requests',
    columns: [
      { key: 'workDate', label: 'Date requested' },
      { key: 'requestedBy', label: 'Employee' },
      { key: 'type', label: 'Type' },
      { key: 'reason', label: 'Reason' },
      { key: 'status', label: 'Status' },
      { key: 'reviewedBy', label: 'Reviewed by' },
      { key: 'reviewedAt', label: 'Reviewed on' },
      { key: 'reviewNote', label: 'Review note' },
    ],
    rows: requests.map((r) => ({
      workDate: r.workDate,
      requestedBy: r.requestedBy?.fullName || 'Removed account',
      type: r.type,
      reason: r.reason,
      status: r.status,
      reviewedBy: r.reviewedBy?.fullName || '',
      reviewedAt: r.reviewedAt ? toDateKey(r.reviewedAt) : '',
      reviewNote: r.reviewNote || '',
    })),
  };
}

/* ------------------------------------------------------------------ */

const BUILDERS = {
  attendance: (ctx) => attendanceReport(ctx.fromKey, ctx.toKey),
  hours: (ctx) => hoursSummaryReport(ctx.fromKey, ctx.toKey),
  jobs: (ctx) => serviceJobReport(ctx.from, ctx.to),
  productivity: (ctx) => productivityReport(ctx.from, ctx.to, ctx.fromKey, ctx.toKey),
  logs: (ctx) => activityLogReport(ctx.from, ctx.to),
  availability: (ctx) => availabilityReport(ctx.fromKey, ctx.toKey),
  requests: (ctx) => shiftRequestReport(ctx.fromKey, ctx.toKey),
};

export const REPORT_TYPES = [
  { id: 'attendance', name: 'Daily attendance', description: 'Every clock-in and clock-out, day by day' },
  { id: 'hours', name: 'Hours summary', description: 'Total hours per employee, with late and absent counts' },
  { id: 'jobs', name: 'Service jobs', description: 'All scheduled work, who it went to and how it ended' },
  { id: 'productivity', name: 'Employee productivity', description: 'Jobs completed and hours spent per person' },
  { id: 'logs', name: 'Activity log', description: 'The full audit trail for the period' },
  { id: 'availability', name: 'Declared availability', description: 'Which days each employee offered to work' },
  { id: 'requests', name: 'Shift requests', description: 'Time-off and shift-change requests and their outcome' },
];

export const listReportTypes = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: REPORT_TYPES });
});

/**
 * GET /api/reports/:type?from=&to=&format=json|csv
 * Falls back to the current month when no range is given.
 */
export const runReport = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const builder = BUILDERS[type];

  if (!builder) {
    throw ApiError.badRequest(
      `Unknown report "${type}". Choose one of: ${Object.keys(BUILDERS).join(', ')}`
    );
  }

  let fromKey = req.query.from;
  let toKey = req.query.to;

  if (!fromKey || !toKey) {
    const range = rangeFor(req.query.view || 'month', req.query.date || toDateKey());
    fromKey = toDateKey(range.from);
    toKey = toDateKey(range.to);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromKey) || !/^\d{4}-\d{2}-\d{2}$/.test(toKey)) {
    throw ApiError.badRequest('Dates must be in YYYY-MM-DD form');
  }
  if (fromKey > toKey) {
    throw ApiError.badRequest('The start date has to be on or before the end date');
  }

  const ctx = { fromKey, toKey, from: startOfDay(fromKey), to: endOfDay(toKey) };
  const report = await builder(ctx);

  if (req.query.format === 'csv') {
    return sendCsv(res, reportFilename(type, fromKey, toKey), report.columns, report.rows);
  }

  return res.json({
    success: true,
    data: {
      type,
      title: report.title,
      range: { from: fromKey, to: toKey },
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.fullName,
      columns: report.columns,
      rows: report.rows,
      count: report.rows.length,
    },
  });
});
