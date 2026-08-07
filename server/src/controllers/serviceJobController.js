/**
 * CONTROLLER: service jobs (scheduling)
 * Creating, assigning, rescheduling and completing work.
 * Assignment runs a conflict check first, which is the whole point of
 * the system: no more double-booked mechanics or idle mechanics.
 */
import ServiceJob from '../models/ServiceJob.js';
import Availability from '../models/Availability.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import ActivityLog from '../models/ActivityLog.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { toDateKey, rangeFor, eachDateKey } from '../utils/dates.js';

const fmt = (d) => new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });

/** Jobs that overlap the given window for the given employee. */
async function findConflicts({ employee, startDate, endDate, excludeId }) {
  const query = {
    assignedTo: employee,
    status: { $in: ['scheduled', 'in-progress'] },
    startDate: { $lte: new Date(endDate) },
    endDate: { $gte: new Date(startDate) },
  };
  if (excludeId) query._id = { $ne: excludeId };
  return ServiceJob.find(query).select('title startDate endDate');
}

export const listJobs = asyncHandler(async (req, res) => {
  const { view, date, employee, status, unassigned } = req.query;
  const filter = {};

  if (view || date) {
    const { from, to } = rangeFor(view || 'month', date || toDateKey());
    filter.startDate = { $lte: to };
    filter.endDate = { $gte: from };
  }

  if (status) filter.status = status.includes(',') ? { $in: status.split(',') } : status;
  // Hide finished jobs from the calendar/schedule by default.
  if (!status) {
  filter.status = { $ne: 'completed' };
}
  if (unassigned === 'true') filter.assignedTo = null;

  // Managers see the whole shop; everyone else sees their own jobs
  // plus anything still unassigned that they could pick up.
  if (req.user.role === 'manager') {
    if (employee) filter.assignedTo = employee;
  } else {
    filter.$or = [{ assignedTo: req.user.id }, { assignedTo: null }];
  }

  const jobs = await ServiceJob.find(filter)
    .populate('assignedTo', 'fullName jobTitle avatarUrl')
    .populate('createdBy', 'fullName')
    .sort({ startDate: 1 });

  res.json({ success: true, count: jobs.length, data: jobs });
});

export const getJob = asyncHandler(async (req, res) => {
  const job = await ServiceJob.findById(req.params.id)
    .populate('assignedTo', 'fullName jobTitle')
    .populate('createdBy', 'fullName')
    .populate('submittedBy', 'fullName');
  if (!job) throw ApiError.notFound('That job does not exist');
  res.json({ success: true, data: job });
});

/** Job completion summary: work logs grouped by employee plus submission notes. */
export const getJobDetails = asyncHandler(async (req, res) => {
  const job = await ServiceJob.findById(req.params.id)
    .populate('assignedTo', 'fullName jobTitle')
    .populate('submittedBy', 'fullName');
  if (!job) throw ApiError.notFound('That job does not exist');

  const workLogs = await ActivityLog.find({ relatedJob: job._id, type: 'work' })
    .populate('employee', 'fullName')
    .sort({ loggedAt: 1 });

  const workByEmployee = [];
  const grouped = new Map();

  for (const log of workLogs) {
    const name = log.employee?.fullName || 'Unknown';
    if (!grouped.has(name)) grouped.set(name, new Set());
    const items = grouped.get(name);
    log.work
      .split(', ')
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => items.add(item));
  }

  for (const [employeeName, items] of grouped) {
    workByEmployee.push({ employeeName, work: [...items] });
  }

  res.json({
    success: true,
    data: {
      job,
      workByEmployee,
      additionalNotes: job.additionalNotes || '',
    },
  });
});

export const createJob = asyncHandler(async (req, res) => {
const { assignedTo = [], startDate, endDate } = req.body;

for (const employee of assignedTo) {
  const conflicts = await findConflicts({
    employee,
    startDate,
    endDate,
  });

  if (conflicts.length) {
    throw ApiError.conflict(
      `That mechanic already has "${conflicts[0].title}" booked for those dates`,
      conflicts
    );
  }
}

  const job = await ServiceJob.create({ ...req.body, createdBy: req.user.id });

  if (job.assignedTo?.length) {
    await Promise.all(
      job.assignedTo.map((id) =>
        Notification.create({
          recipient: id,
          title: 'New job assigned',
          message: `${job.title} - ${fmt(job.startDate)}`,
          type: 'assignment',
          relatedJob: job._id,
        })
      )
    );
  }

  await job.populate('assignedTo', 'fullName jobTitle');
  res.status(201).json({ success: true, message: 'Job scheduled', data: job });
});

export const updateJob = asyncHandler(async (req, res) => {
  const job = await ServiceJob.findById(req.params.id);
  if (!job) throw ApiError.notFound('That job does not exist');

  const isManager = req.user.role === 'manager';
  const isOwner = Boolean(job.assignedTo) && String(job.assignedTo) === req.user.id;
  // An open job may be claimed, but only by the person doing the claiming.
  const isClaim = !job.assignedTo && req.body.assignedTo === req.user.id;

  if (!isManager && !isOwner && !isClaim) {
    throw ApiError.forbidden('That job is not assigned to you');
  }

  // Managers may change anything. An employee may move their own job along,
  // or claim an open one - never reschedule or hand it to someone else.
  let fields;
  if (isManager) {
    fields = ['title', 'description', 'serviceType', 'clientName', 'startDate', 'endDate', 'assignedTo', 'status', 'priority'];
  } else if (isClaim) {
    fields = ['assignedTo', 'status'];
  } else {
    fields = ['status', 'description', 'additionalNotes'];
  }

  const previousStatus = job.status;
  const requestedStatus = req.body.status;

  if (requestedStatus !== undefined && requestedStatus !== job.status) {
    if (!isManager) {
      if (['ready-for-pickup', 'completed'].includes(requestedStatus)) {
        throw ApiError.forbidden('Only a manager can move a job past approval');
      }
      if (requestedStatus === 'for-approval') {
        if (!['scheduled', 'in-progress'].includes(job.status)) {
          throw ApiError.badRequest('This job cannot be submitted for approval');
        }
      } else if (requestedStatus !== 'in-progress') {
        throw ApiError.forbidden('You cannot set that status');
      }
    } else {
      if (requestedStatus === 'ready-for-pickup' && job.status !== 'for-approval') {
        throw ApiError.badRequest('Only a job awaiting approval can be marked ready for pickup');
      }
      if (requestedStatus === 'completed' && job.status !== 'ready-for-pickup') {
        throw ApiError.badRequest('Only a job ready for pickup can be marked done');
      }
    }
  }

  const previousAssignees = job.assignedTo.map(String);

  for (const key of fields) {
    if (req.body[key] !== undefined) job[key] = req.body[key];
  }

if (
  job.assignedTo?.length &&
  (req.body.startDate || req.body.endDate || req.body.assignedTo)
) {
  for (const employee of job.assignedTo) {
    const conflicts = await findConflicts({
      employee,
      startDate: job.startDate,
      endDate: job.endDate,
      excludeId: job._id,
    });

    if (conflicts.length) {
      throw ApiError.conflict(
        `That change clashes with "${conflicts[0].title}"`,
        conflicts
      );
    }
  }
}

  if (job.status === 'for-approval' && previousStatus !== 'for-approval') {
    job.submittedAt = new Date();
    job.submittedBy = req.user.id;
  }

  if (job.status === 'completed' && !job.completedAt) job.completedAt = new Date();
  await job.save();

  if (job.status === 'for-approval' && previousStatus !== 'for-approval') {
    const managers = await User.find({ role: 'manager', isActive: true }).select('_id');
    const submitter = await User.findById(req.user.id).select('fullName');
    await Promise.all(
      managers.map((mgr) =>
        Notification.create({
          recipient: mgr._id,
          title: 'Job ready for approval',
          message: `"${job.title}" was submitted by ${submitter?.fullName || 'an employee'}`,
          type: 'schedule-change',
          relatedJob: job._id,
        })
      )
    );
  }

  if (
  job.status === 'ready-for-pickup' &&
  previousStatus === 'for-approval' &&
  job.assignedTo.length
) {
  await Promise.all(
    job.assignedTo.map((id) =>
      Notification.create({
        recipient: id,
        title: 'Job approved',
        message: `"${job.title}" has been approved and is ready for pickup`,
        type: 'schedule-change',
        relatedJob: job._id,
      })
    )
  );
}

if (job.assignedTo.length) {
  await Promise.all(
    job.assignedTo.map((id) =>
      Notification.create({
        recipient: id,
        title: 'Job updated',
        message: `${job.title} is now ${job.status}`,
        type: 'schedule-change',
        relatedJob: job._id,
      })
    )
  );
}
  await job.populate('assignedTo', 'fullName jobTitle');
  res.json({ success: true, message: 'Job updated', data: job });
});

export const deleteJob = asyncHandler(async (req, res) => {
  const job = await ServiceJob.findByIdAndDelete(req.params.id);
  if (!job) throw ApiError.notFound('That job does not exist');

  if (job.assignedTo.length) {
  await Promise.all(
    job.assignedTo.map((id) =>
      Notification.create({
        recipient: id,
        title: 'Job cancelled',
        message: `${job.title} on ${fmt(job.startDate)} was removed from your schedule`,
        type: 'schedule-change',
      })
    )
  );
}

  res.json({ success: true, message: 'Job removed' });
});

/** Log finished work against a job - feeds the "WORK: ... CLIENT: ..." log line. */
export const logWork = asyncHandler(async (req, res) => {
  const job = await ServiceJob.findById(req.params.id);
  if (!job) throw ApiError.notFound('That job does not exist');

  const { work, clientName } = req.body;
  const isManager = req.user.role === 'manager';
  const logEmployee = isManager && job.assignedTo ? job.assignedTo : req.user.id;

  const log = await ActivityLog.findOneAndUpdate(
    { relatedJob: job._id, type: 'work', employee: logEmployee },
    {
      employee: logEmployee,
      type: 'work',
      message: work,
      work,
      clientName: clientName || job.clientName || '',
      relatedJob: job._id,
      loggedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ success: true, message: 'Work logged', data: log });
});

/**
 * Who can take a job on these dates?
 * Returns mechanics who declared themselves available for every day in
 * the range and have nothing else booked.
 */
export const suggestAssignees = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) throw ApiError.badRequest('startDate and endDate are required');

  const keys = eachDateKey(new Date(startDate), new Date(endDate));

  const available = await Availability.aggregate([
    { $match: { workDate: { $in: keys }, isAvailable: true } },
    { $group: { _id: '$employee', days: { $sum: 1 } } },
    { $match: { days: keys.length } },
  ]);

  const candidates = [];
  for (const row of available) {
    const conflicts = await findConflicts({ employee: row._id, startDate, endDate });
    if (!conflicts.length) candidates.push(row._id);
  }

  const users = await User.find({ _id: { $in: candidates }, isActive: true }).select(
    'fullName jobTitle department'
  );

  res.json({ success: true, count: users.length, data: users });
});
