/**
 * CONTROLLER: attendance (clock in / clock out / work hour reports)
 * This is the module that answers the shop's biggest question:
 * "who was here, for how long, and what did they do?"
 */
import Attendance from '../models/Attendance.js';
import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { toDateKey, minutesBetween, rangeFor } from '../utils/dates.js';

const LATE_AFTER_HOUR = 9; // shop opens at 08:00, 1 hour grace

export const clockIn = asyncHandler(async (req, res) => {
  const workDate = toDateKey();
  const now = new Date();

  const existing = await Attendance.findOne({ employee: req.user.id, workDate });
  if (existing?.clockIn && !existing.clockOut) {
    throw ApiError.conflict('You are already clocked in for today');
  }
  if (existing?.clockOut) {
    throw ApiError.conflict('You already finished your shift for today');
  }

  const record = await Attendance.findOneAndUpdate(
    { employee: req.user.id, workDate },
    {
      clockIn: now,
      status: now.getHours() >= LATE_AFTER_HOUR ? 'late' : 'present',
      notes: req.body.notes || '',
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  await User.findByIdAndUpdate(req.user.id, { status: 'on-duty' });
  await ActivityLog.create({
    employee: req.user.id,
    type: 'clock-in',
    message: 'Logged in on-duty',
    loggedAt: now,
  });

  res.status(201).json({ success: true, message: 'Clocked in', data: record });
});

export const clockOut = asyncHandler(async (req, res) => {
  const workDate = toDateKey();
  const record = await Attendance.findOne({ employee: req.user.id, workDate });

  if (!record?.clockIn) throw ApiError.badRequest('You have not clocked in today');
  if (record.clockOut) throw ApiError.conflict('You already clocked out today');

  const now = new Date();
  record.clockOut = now;
  record.minutesWorked = minutesBetween(record.clockIn, now);
  await record.save();

  await User.findByIdAndUpdate(req.user.id, { status: 'available' });
  await ActivityLog.create({
    employee: req.user.id,
    type: 'clock-out',
    message: 'Signed out',
    loggedAt: now,
  });

  res.json({ success: true, message: 'Clocked out', data: record });
});

/** The record for the logged-in user today - drives the clock button state. */
export const todayForMe = asyncHandler(async (req, res) => {
  const record = await Attendance.findOne({ employee: req.user.id, workDate: toDateKey() });
  res.json({ success: true, data: record });
});

export const listAttendance = asyncHandler(async (req, res) => {
  const { employee, from, to } = req.query;
  const filter = {};

  // Employees only ever see their own rows, whatever they ask for.
  if (req.user.role === 'manager') {
    if (employee) filter.employee = employee;
  } else {
    filter.employee = req.user.id;
  }
  if (from || to) {
    filter.workDate = {};
    if (from) filter.workDate.$gte = from;
    if (to) filter.workDate.$lte = to;
  }

  const records = await Attendance.find(filter)
    .populate('employee', 'fullName jobTitle department role')
    .sort({ workDate: -1, createdAt: -1 })
    .limit(Number(req.query.limit) || 200);

  res.json({ success: true, count: records.length, data: records });
});

/** Manager correction, e.g. someone forgot to clock out. */
export const updateAttendance = asyncHandler(async (req, res) => {
  const record = await Attendance.findById(req.params.id);
  if (!record) throw ApiError.notFound('No attendance record with that id');

  const { clockIn, clockOut, status, notes } = req.body;
  if (clockIn) record.clockIn = new Date(clockIn);
  if (clockOut) record.clockOut = new Date(clockOut);
  if (status) record.status = status;
  if (notes !== undefined) record.notes = notes;

  if (record.clockIn && record.clockOut) {
    if (record.clockOut < record.clockIn) throw ApiError.badRequest('Clock-out cannot be before clock-in');
    record.minutesWorked = minutesBetween(record.clockIn, record.clockOut);
  }

  await record.save();
  res.json({ success: true, message: 'Attendance corrected', data: record });
});

/**
 * Hours summary per employee for a week / month / year.
 * This is the "consolidated performance data" the manager never had.
 */
export const attendanceSummary = asyncHandler(async (req, res) => {
  const view = req.query.view || 'week';
  const { from, to } = rangeFor(view, req.query.date || toDateKey());
  const fromKey = toDateKey(from);
  const toKey = toDateKey(to);

  const rows = await Attendance.aggregate([
    { $match: { workDate: { $gte: fromKey, $lte: toKey } } },
    {
      $group: {
        _id: '$employee',
        totalMinutes: { $sum: '$minutesWorked' },
        daysPresent: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
        daysLate: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
        daysAbsent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
      },
    },
  ]);

  const users = await User.find({ _id: { $in: rows.map((r) => r._id) } }).select(
    'fullName jobTitle department weeklyHourTarget'
  );
  const byId = new Map(users.map((u) => [u.id, u]));

  const data = rows.map((r) => {
    const u = byId.get(String(r._id));
    return {
      employee: u ? { id: u.id, fullName: u.fullName, jobTitle: u.jobTitle, department: u.department } : null,
      totalHours: Math.round((r.totalMinutes / 60) * 100) / 100,
      daysPresent: r.daysPresent,
      daysLate: r.daysLate,
      daysAbsent: r.daysAbsent,
      targetHours: u?.weeklyHourTarget ?? null,
    };
  });

  res.json({ success: true, range: { view, from: fromKey, to: toKey }, count: data.length, data });
});
