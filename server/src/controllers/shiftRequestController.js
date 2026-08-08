/**
 * CONTROLLER: shift requests (leave / shift changes)
 */
import ShiftRequest from '../models/ShiftRequest.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import Availability from "../models/Availability.js";
import ServiceJob from '../models/ServiceJob.js';
import { startOfDay, endOfDay } from '../utils/dates.js';

export const listRequests = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role !== 'manager') filter.requestedBy = req.user.id;
  if (req.query.status) filter.status = req.query.status;

  const requests = await ShiftRequest.find(filter)
    .populate('requestedBy', 'fullName jobTitle')
    .populate('reviewedBy', 'fullName')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: requests.length, data: requests });
});

export const createRequest = asyncHandler(async (req, res) => {
  const request = await ShiftRequest.create({
    ...req.body,
    type: 'leave',
    requestedBy: req.user.id,
  });

  const managers = await User.find({ role: 'manager', isActive: true }).select('_id');
  await Notification.insertMany(
    managers.map((m) => ({
      recipient: m._id,
      title: 'Leave request waiting',
      message: `${req.user.fullName} requested leave on ${request.workDate}`,
      type: 'request',
    }))
  );

  res.status(201).json({ success: true, message: 'Request sent to your manager', data: request });
});

export const reviewRequest = asyncHandler(async (req, res) => {
  const { status, reviewNote } = req.body;
  if (!['approved', 'denied'].includes(status)) {
    throw ApiError.badRequest('Status must be approved or denied');
  }

  const request = await ShiftRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('No request with that id');
  if (request.status !== 'pending') throw ApiError.conflict('That request was already reviewed');

  if (status === 'approved' && request.type === 'leave') {
    const conflictingJobs = await ServiceJob.find({
      assignedTo: request.requestedBy,
      status: { $in: ['scheduled', 'in-progress'] },
      startDate: { $lte: endOfDay(request.workDate) },
      endDate: { $gte: startOfDay(request.workDate) },
    }).select('title');

    if (conflictingJobs.length) {
      throw ApiError.conflict(
        `This employee is booked on "${conflictingJobs[0].title}" that day. Reassign or reschedule the job before approving leave.`,
        conflictingJobs
      );
    }

    await Availability.findOneAndUpdate(
      { employee: request.requestedBy, workDate: request.workDate },
      {
        employee: request.requestedBy,
        workDate: request.workDate,
        isAvailable: false,
        note: 'Approved leave',
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );
  }

  request.status = status;
  request.reviewedBy = req.user.id;
  request.reviewedAt = new Date();
  request.reviewNote = reviewNote || '';
  await request.save();

  await Notification.create({
    recipient: request.requestedBy,
    title: `Request ${status}`,
    message: `Your leave for ${request.workDate} was ${status}`,
    type: 'request',
  });

  res.json({ success: true, message: `Request ${status}`, data: request });
});

export const cancelRequest = asyncHandler(async (req, res) => {
  const request = await ShiftRequest.findOne({ _id: req.params.id, requestedBy: req.user.id });
  if (!request) throw ApiError.notFound('No request with that id');
  if (request.status !== 'pending') throw ApiError.conflict('Only pending requests can be withdrawn');

  await request.deleteOne();
  res.json({ success: true, message: 'Request withdrawn' });
});
