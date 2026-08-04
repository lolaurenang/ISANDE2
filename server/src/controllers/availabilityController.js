/**
 * CONTROLLER: availability
 * ---------------------------------------------------------------
 * Mechanics declare which days they can work; the manager reads the
 * roster before assigning jobs.
 *
 * Scoping rule: a request is about YOUR OWN availability unless you are
 * a manager AND you explicitly ask for someone else's (?employee=<id>)
 * or for everyone (?all=true). Without that rule a manager opening the
 * Schedule page saw every mechanic's days merged into their own
 * calendar, and tapping a day tried to delete a record they did not own.
 */
import Availability from '../models/Availability.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { toDateKey, rangeFor, eachDateKey } from '../utils/dates.js';

/** Works out whose records this request is allowed to touch. */
function resolveScope(req) {
  const { employee, all } = req.query;
  const isManager = req.user.role === 'manager';

  if (!isManager) return { employee: req.user.id };
  if (all === 'true') return {}; // every employee
  if (employee && employee !== 'me') return { employee };
  return { employee: req.user.id };
}

export const listAvailability = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const filter = resolveScope(req);

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

  if (startTime && endTime && startTime >= endTime) {
    throw ApiError.badRequest('The end time has to be after the start time');
  }

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

/**
 * Save a whole stretch of days in one request.
 * Accepts either an explicit list of dates or a from/to range, so the
 * client can offer both "tap each day" and "mark this whole week".
 */
export const setAvailabilityBulk = asyncHandler(async (req, res) => {
  const { dates, from, to, startTime, endTime, skipSundays = true } = req.body;

  let keys = Array.isArray(dates) ? dates : [];

  if (!keys.length && from && to) {
    keys = eachDateKey(new Date(from), new Date(to));
    if (skipSundays) keys = keys.filter((k) => new Date(`${k}T00:00:00`).getDay() !== 0);
  }

  if (!keys.length) {
    throw ApiError.badRequest('Send a "dates" array, or a "from" and "to" range');
  }
  if (keys.some((k) => !/^\d{4}-\d{2}-\d{2}$/.test(k))) {
    throw ApiError.badRequest('Every date must be in YYYY-MM-DD form');
  }
  if (keys.length > 120) {
    throw ApiError.badRequest('That is more than 120 days at once - pick a shorter range');
  }

  const ops = keys.map((workDate) => ({
    updateOne: {
      filter: { employee: req.user.id, workDate },
      update: {
        $set: {
          isAvailable: true,
          ...(startTime && { startTime }),
          ...(endTime && { endTime }),
        },
      },
      upsert: true,
    },
  }));

  await Availability.bulkWrite(ops);
  const slots = await Availability.find({ employee: req.user.id, workDate: { $in: keys } }).sort({
    workDate: 1,
  });

  res.status(201).json({
    success: true,
    message: keys.length === 1 ? '1 day saved' : `${keys.length} days saved`,
    data: slots,
  });
});

/** Clear a stretch of days in one request. */
export const removeAvailabilityBulk = asyncHandler(async (req, res) => {
  const { dates } = req.body;
  if (!Array.isArray(dates) || !dates.length) {
    throw ApiError.badRequest('Send a "dates" array of YYYY-MM-DD strings');
  }

  const result = await Availability.deleteMany({
    employee: req.user.id,
    workDate: { $in: dates },
  });

  res.json({ success: true, message: `${result.deletedCount} days cleared` });
});

export const removeAvailability = asyncHandler(async (req, res) => {
  const slot = await Availability.findOneAndDelete({
    employee: req.user.id,
    workDate: req.params.workDate,
  });
  if (!slot) throw ApiError.notFound('You had not marked yourself available that day');
  res.json({ success: true, message: 'Availability removed' });
});

/**
 * Manager view: who is free on each day of the range, and who has not
 * filled in their availability at all. The second list matters - an
 * empty calendar is the reason a mechanic ends up unbooked.
 */
export const availabilityRoster = asyncHandler(async (req, res) => {
  const { from, to } = rangeFor(req.query.view || 'week', req.query.date || toDateKey());
  const fromKey = toDateKey(from);
  const toKey = toDateKey(to);

  const [slots, employees] = await Promise.all([
    Availability.find({ workDate: { $gte: fromKey, $lte: toKey }, isAvailable: true }).populate(
      'employee',
      'fullName jobTitle department'
    ),
    User.find({ isActive: true, role: { $ne: 'manager' } }).select('fullName jobTitle department'),
  ]);

  const roster = {};
  for (const key of eachDateKey(from, to)) roster[key] = [];

  const declared = new Set();
  for (const slot of slots) {
    if (!slot.employee) continue;
    declared.add(slot.employee.id);
    roster[slot.workDate]?.push({
      id: slot.employee.id,
      fullName: slot.employee.fullName,
      jobTitle: slot.employee.jobTitle,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  }

  const noAvailability = employees
    .filter((e) => !declared.has(e.id))
    .map((e) => ({ id: e.id, fullName: e.fullName, jobTitle: e.jobTitle }));

  res.json({
    success: true,
    range: { from: fromKey, to: toKey },
    data: roster,
    noAvailability,
  });
});
