/**
 * CONTROLLER: reports
 * ---------------------------------------------------------------
 * Turnover/hand-off reports for the manager, each meant to stand on
 * its own printable A4 page: staff hours worked, and tasks accomplished
 * (filterable by mechanic, service type, and client). Accepts an
 * explicit from/to date range picked by the manager.
 */
import ServiceJob from '../models/ServiceJob.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { toDateKey, startOfDay, endOfDay, rangeFor } from '../utils/dates.js';
import { staffHoursAndJobs, mergeStaffStats } from '../utils/staffStats.js';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function resolveRange(req) {
  const { from: fromParam, to: toParam, view, date } = req.query;

  // An explicit range wins - that's the whole point of letting the
  // manager pick their own dates for a report.
  if (fromParam && toParam && DATE_KEY.test(fromParam) && DATE_KEY.test(toParam)) {
    return { from: startOfDay(fromParam), to: endOfDay(toParam) };
  }

  return rangeFor(view || 'month', date || toDateKey());
}

export const summaryReport = asyncHandler(async (req, res) => {
  const { from, to } = resolveRange(req);
  const fromKey = toDateKey(from);
  const toKey = toDateKey(to);
  const { mechanic, serviceType, clientName } = req.query;

  const taskFilter = { status: 'completed', completedAt: { $gte: from, $lte: to } };
  if (mechanic) taskFilter.assignedTo = mechanic;
  if (serviceType) taskFilter.serviceType = serviceType;
  if (clientName) taskFilter.clientName = { $regex: clientName, $options: 'i' };

  const [staff, stats, tasksAccomplished] = await Promise.all([
    User.find({ isActive: true, role: { $ne: 'manager' } })
      .select('fullName jobTitle department role')
      .sort({ role: 1, fullName: 1 }),
    staffHoursAndJobs({ from, to, fromKey, toKey }),
    ServiceJob.find(taskFilter)
      .populate('assignedTo', 'fullName')
      .select('title clientName serviceType completedAt assignedTo')
      .sort({ completedAt: -1 })
      .limit(500),
  ]);

  const staffHours = mergeStaffStats(
    staff.map((u) => u.toObject()),
    stats
  ).map((s) => ({
    id: s._id,
    fullName: s.fullName,
    jobTitle: s.jobTitle,
    department: s.department,
    role: s.role,
    totalHours: s.totalHours,
    daysPresent: s.daysPresent,
    completedJobs: s.completedJobs,
  }));

  const tasks = tasksAccomplished.map((job) => ({
    id: job._id,
    title: job.title,
    clientName: job.clientName,
    serviceType: job.serviceType,
    completedAt: job.completedAt,
    mechanics: (job.assignedTo || []).map((u) => u.fullName).join(', '),
  }));

  res.json({
    success: true,
    range: { from: fromKey, to: toKey },
    data: { staffHours, tasksAccomplished: tasks },
  });
});
