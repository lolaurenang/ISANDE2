/**
 * CONTROLLER: dashboard
 * Read-only aggregations that fill the Home page and the manager's
 * Dashboard. One request per screen instead of six, so the app stays
 * usable on the shop's mobile data connection.
 */
import ServiceJob from '../models/ServiceJob.js';
import Attendance from '../models/Attendance.js';
import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import asyncHandler from '../utils/asyncHandler.js';
import { toDateKey, startOfDay, endOfDay, rangeFor, rangeForElapsed } from '../utils/dates.js';
import { withClockStatus, staffHoursAndJobs, mergeStaffStats } from '../utils/staffStats.js';

/** Home screen for whoever is logged in. */
export const home = asyncHandler(async (req, res) => {
  const today = toDateKey();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);

  const mine = req.user.role === 'manager' ? {} : { assignedTo: req.user.id };

  const [todayJobs, upcoming, attendance, unreadCount] = await Promise.all([
    ServiceJob.find({ ...mine, startDate: { $lte: dayEnd }, endDate: { $gte: dayStart }, status: { $ne: 'cancelled' } })
      .populate('assignedTo', 'fullName jobTitle')
      .sort({ startDate: 1 }),
    ServiceJob.find({ ...mine, startDate: { $gt: dayEnd }, status: 'scheduled' })
      .populate('assignedTo', 'fullName jobTitle')
      .sort({ startDate: 1 })
      .limit(5),
    Attendance.findOne({ employee: req.user.id, workDate: today }),
    Notification.countDocuments({ recipient: req.user.id, isRead: false }),
  ]);

  const payload = {
    user: { fullName: req.user.fullName, role: req.user.role, jobTitle: req.user.jobTitle },
    today,
    todayJobs,
    upcoming,
    attendance,
    unreadCount,
  };

  // Managers also get the live activity feed.
  if (req.user.role === 'manager') {
    const logs = await ActivityLog.find({ loggedAt: { $gte: dayStart, $lte: dayEnd } })
      .populate('employee', 'fullName jobTitle')
      .sort({ loggedAt: -1 })
      .limit(20);

    payload.todayLogs = logs;
  }

  res.json({ success: true, data: payload });
});

/** Manager dashboard: Logs tab + Staff tab, filtered by week/month/year. */
export const managerDashboard = asyncHandler(async (req, res) => {
  const view = req.query.view || 'week';
  // Logs/attendance can't exist for days that haven't happened yet, but
  // the "Scheduled" job count for the rest of the month should still show
  // up - so only the log window gets capped at today.
  const { from, to } = rangeForElapsed(view, req.query.date || toDateKey());
  const jobRange = rangeFor(view, req.query.date || toDateKey());
  const fromKey = toDateKey(from);
  const toKey = toDateKey(to);

  const [logs, staff, jobStats, stats] = await Promise.all([
    ActivityLog.find({ loggedAt: { $gte: from, $lte: to } })
      .populate('employee', 'fullName jobTitle department')
      .sort({ loggedAt: -1 })
      .limit(200),
    // The manager doesn't need to see themselves in their own staff roster.
    User.find({ isActive: true, role: { $ne: 'manager' } })
      .select('fullName jobTitle department role avatarUrl')
      .sort({ role: 1, fullName: 1 }),
    ServiceJob.aggregate([
      { $match: { startDate: { $lte: jobRange.to }, endDate: { $gte: jobRange.from } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    // Same query shape the Reports page uses, so the numbers here are
    // never a step removed from what a "List of tasks accomplished" /
    // "Employee hours worked" report would show for the same range.
    staffHoursAndJobs({ from, to, fromKey, toKey }),
  ]);

  const jobs = {
    scheduled: 0,
    'in-progress': 0,
    'for-approval': 0,
    'ready-for-pickup': 0,
    completed: 0,
    cancelled: 0,
  };
  for (const row of jobStats) jobs[row._id] = row.count;

  // Clocking in is the only thing that can make someone "available" -
  // there's no manager-set toggle, employees confirm their own attendance.
  const staffWithClock = await withClockStatus(staff);
  const staffWithHours = mergeStaffStats(staff.map((s) => s.toObject()), stats);
  const hoursById = new Map(staffWithHours.map((s) => [String(s._id), s]));
  const staffFinal = staffWithClock.map((s) => ({ ...s, ...hoursById.get(String(s._id)) }));

  res.json({
    success: true,
    range: { view, from: toDateKey(from), to: toDateKey(to) },
    data: { logs, staff: staffFinal, jobs },
  });
});

/** Personal dashboard for any staff member: Logs tab, scoped to me. Same query shape as managerDashboard. */
export const myDashboard = asyncHandler(async (req, res) => {
  const view = req.query.view || 'week';
  // Logs can never exist for days that haven't happened yet, but a
  // mechanic's scheduled/in-progress work for the rest of the month should
  // still count - so only the log window gets capped at today.
  const { from, to } = rangeForElapsed(view, req.query.date || toDateKey());
  const jobRange = rangeFor(view, req.query.date || toDateKey());

  const [logs, jobStats] = await Promise.all([
    ActivityLog.find({ employee: req.user.id, loggedAt: { $gte: from, $lte: to } })
      .populate('employee', 'fullName jobTitle department')
      .populate('relatedJob', 'title')
      .sort({ loggedAt: -1 })
      .limit(200),
    ServiceJob.aggregate([
      { $match: { assignedTo: req.user._id, startDate: { $lte: jobRange.to }, endDate: { $gte: jobRange.from } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const jobs = {
    scheduled: 0,
    'in-progress': 0,
    'for-approval': 0,
    'ready-for-pickup': 0,
    completed: 0,
    cancelled: 0,
  };
  for (const row of jobStats) jobs[row._id] = row.count;

  res.json({
    success: true,
    range: { view, from: toDateKey(from), to: toDateKey(to) },
    data: { logs, jobs },
  });
});

/** Everything the Calendar page needs for one week / month / year. */
export const calendar = asyncHandler(async (req, res) => {
  const view = req.query.view || 'month';
  const { from, to } = rangeFor(view, req.query.date || toDateKey());

  const filter = {
    startDate: { $lte: to },
    endDate: { $gte: from },
    status: { $ne: 'cancelled' },
  };
  if (req.user.role !== 'manager') filter.assignedTo = req.user.id;

  const jobs = await ServiceJob.find(filter)
    .populate('assignedTo', 'fullName jobTitle')
    .sort({ startDate: 1 });

  res.json({
    success: true,
    range: { view, from: toDateKey(from), to: toDateKey(to) },
    count: jobs.length,
    data: jobs,
  });
});
