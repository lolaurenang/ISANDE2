/**
 * CONTROLLER: shift requests (leave / shift changes)
 */
import ShiftRequest from '../models/ShiftRequest.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

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
  const request = await ShiftRequest.create({ ...req.body, requestedBy: req.user.id });

  const managers = await User.find({ role: 'manager', isActive: true }).select('_id');
  await Notification.insertMany(
    managers.map((m) => ({
      recipient: m._id,
      title: 'Shift request waiting',
      message: `${req.user.fullName} requested ${request.type} on ${request.workDate}`,
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

  request.status = status;
  request.reviewedBy = req.user.id;
  request.reviewedAt = new Date();
  request.reviewNote = reviewNote || '';
  await request.save();

  await Notification.create({
    recipient: request.requestedBy,
    title: `Request ${status}`,
    message: `Your ${request.type} for ${request.workDate} was ${status}`,
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
