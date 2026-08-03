/**
 * CONTROLLER: availability
 * Mechanics declare which days they can work; the manager reads the
 * roster before assigning jobs.
 */
import Availability from '../models/Availability.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { toDateKey, rangeFor } from '../utils/dates.js';

export const listAvailability = asyncHandler(async (req, res) => {
  const { from, to, employee } = req.query;
  const filter = {};

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

  const slots = await Availability.find(filter)
    .populate('employee', 'fullName jobTitle')
    .sort({ workDate: 1 });

  res.json({ success: true, count: slots.length, data: slots });
});

/** Create or overwrite one day. Upsert keeps it idempotent. */
export const setAvailability = asyncHandler(async (req, res) => {
  const { workDate, isAvailable = true, startTime, endTime, note } = req.body;

  const slot = await Availability.findOneAndUpdate(
    { employee: req.user.id, workDate },
    {
      isAvailable,
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
      ...(note !== undefined && { note }),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  res.status(201).json({ success: true, message: 'Availability saved', data: slot });
});

/** Save a whole week in one request - what the mobile Schedule tab sends. */
export const setAvailabilityBulk = asyncHandler(async (req, res) => {
  const { dates } = req.body;
  if (!Array.isArray(dates) || !dates.length) {
    throw ApiError.badRequest('Send a "dates" array of YYYY-MM-DD strings');
  }

  const ops = dates.map((workDate) => ({
    updateOne: {
      filter: { employee: req.user.id, workDate },
      update: { $set: { isAvailable: true } },
      upsert: true,
    },
  }));

  await Availability.bulkWrite(ops);
  const slots = await Availability.find({ employee: req.user.id, workDate: { $in: dates } });

  res.status(201).json({ success: true, message: `${dates.length} days saved`, data: slots });
});

export const removeAvailability = asyncHandler(async (req, res) => {
  const slot = await Availability.findOneAndDelete({
    employee: req.user.id,
    workDate: req.params.workDate,
  });
  if (!slot) throw ApiError.notFound('Nothing was saved for that day');
  res.json({ success: true, message: 'Availability removed' });
});

/** Manager view: who is free on each day of the current month. */
export const availabilityRoster = asyncHandler(async (req, res) => {
  const { from, to } = rangeFor(req.query.view || 'week', req.query.date || toDateKey());

  const slots = await Availability.find({
    workDate: { $gte: toDateKey(from), $lte: toDateKey(to) },
    isAvailable: true,
  }).populate('employee', 'fullName jobTitle department');

  const roster = {};
  for (const slot of slots) {
    roster[slot.workDate] ??= [];
    roster[slot.workDate].push({
      id: slot.employee?.id,
      fullName: slot.employee?.fullName,
      jobTitle: slot.employee?.jobTitle,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  }

  res.json({ success: true, range: { from: toDateKey(from), to: toDateKey(to) }, data: roster });
});
