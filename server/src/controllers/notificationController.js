/**
 * CONTROLLER: notifications
 */
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const listMyNotifications = asyncHandler(async (req, res) => {
  const filter = { recipient: req.user.id };
  if (req.query.unread === 'true') filter.isRead = false;

  const items = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
  const unreadCount = await Notification.countDocuments({ recipient: req.user.id, isRead: false });

  res.json({ success: true, count: items.length, unreadCount, data: items });
});

export const markRead = asyncHandler(async (req, res) => {
  const item = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  if (!item) throw ApiError.notFound('No notification with that id');
  res.json({ success: true, data: item });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user.id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  res.json({ success: true, message: 'All caught up' });
});

/** Manager broadcast, e.g. "shop closed tomorrow, typhoon signal no. 2". */
export const broadcast = asyncHandler(async (req, res) => {
  const { title, message } = req.body;

  const recipients = await User.find({ isActive: true }).select('_id');
  await Notification.insertMany(
    recipients.map((u) => ({ recipient: u._id, title, message, type: 'system' }))
  );

  res.status(201).json({ success: true, message: `Sent to ${recipients.length} people` });
});
