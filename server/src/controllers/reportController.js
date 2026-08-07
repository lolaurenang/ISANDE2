/**
 * CONTROLLER: reports
 * ---------------------------------------------------------------
 * One consolidated summary the manager can pull for a week, month
 * or year - staff hours, attendance, and completed vs scheduled
 * work. Built for hand-off / turnover use: everything a new manager
 * would need to see "what happened" in one place.
 */
import Attendance from '../models/Attendance.js';
import ServiceJob from '../models/ServiceJob.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { toDateKey, rangeFor } from '../utils/dates.js';

export const summaryReport = asyncHandler(async (req, res) => {
  const view = req.query.view || 'month';
  const { from, to } = rangeFor(view, req.query.date || toDateKey());
  const fromKey = toDateKey(from);
  const toKey = toDateKey(to);

  const [attendanceRows, jobsByStatus, jobsByType, completedByEmployee, staff] = await Promise.all([
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
      { $match: { startDate: { $lte: to }, endDate: { $gte: from } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    ServiceJob.aggregate([
      { $match: { startDate: { $lte: to }, endDate: { $gte: from } } },
      { $group: { _id: '$serviceType', count: { $sum: 1 } } },
    ]),
    ServiceJob.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: from, $lte: to } } },
      { $unwind: '$assignedTo' },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
    ]),
    User.find({ isActive: true, role: { $ne: 'manager' } })
      .select('fullName jobTitle department role')
      .sort({ role: 1, fullName: 1 }),
  ]);

  const hoursById = new Map(attendanceRows.map((r) => [String(r._id), r]));
  const completedById = new Map(completedByEmployee.map((r) => [String(r._id), r.count]));

  const staffSummary = staff.map((u) => {
    const attendance = hoursById.get(String(u._id));
    return {
      id: u._id,
      fullName: u.fullName,
      jobTitle: u.jobTitle,
      department: u.department,
      role: u.role,
      totalHours: attendance ? Math.round((attendance.totalMinutes / 60) * 100) / 100 : 0,
      daysPresent: attendance?.daysPresent || 0,
      completedJobs: completedById.get(String(u._id)) || 0,
    };
  });

  const jobStatusTotals = {
    scheduled: 0,
    'in-progress': 0,
    'for-approval': 0,
    'ready-for-pickup': 0,
    completed: 0,
    cancelled: 0,
  };
  for (const row of jobsByStatus) jobStatusTotals[row._id] = row.count;

  const jobTypeTotals = {};
  for (const row of jobsByType) jobTypeTotals[row._id] = row.count;

  const totals = {
    staffCount: staffSummary.length,
    totalHours: Math.round(staffSummary.reduce((sum, s) => sum + s.totalHours, 0) * 100) / 100,
    totalCompletedJobs: staffSummary.reduce((sum, s) => sum + s.completedJobs, 0),
    totalJobsInRange: Object.values(jobStatusTotals).reduce((a, b) => a + b, 0),
  };

  res.json({
    success: true,
    range: { view, from: fromKey, to: toKey },
    data: { staffSummary, jobStatusTotals, jobTypeTotals, totals },
  });
});
