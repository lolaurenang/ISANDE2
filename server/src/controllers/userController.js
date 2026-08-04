/**
 * CONTROLLER: users (staff directory + account management)
 * Managers can list, create, edit and deactivate accounts.
 * Everyone can read and edit their own profile.
 */
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.department) filter.department = req.query.department;
  if (req.query.active !== 'all') filter.isActive = true;

  const users = await User.find(filter).sort({ role: 1, fullName: 1 });
  res.json({ success: true, count: users.length, data: users });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('That employee does not exist');
  res.json({ success: true, data: user });
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await User.create(req.body);
  await ActivityLog.create({
    employee: user._id,
    type: 'account',
    message: `${user.fullName} was added to the staff list`,
  });
  res.status(201).json({ success: true, message: 'Employee added', data: user });
});

export const updateUser = asyncHandler(async (req, res) => {
  const isManager = req.user.role === 'manager';

  // Fields an employee may change about themselves.
  const allowed = ['fullName', 'phone', 'avatarUrl', 'status'];
  // Extra fields only a manager may change.
  if (isManager) allowed.push('role', 'jobTitle', 'department', 'weeklyHourTarget', 'isActive', 'email');

  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!user) throw ApiError.notFound('That employee does not exist');

  res.json({ success: true, message: 'Profile updated', data: user });
});

export const deactivateUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    throw ApiError.badRequest('You cannot deactivate your own account');
  }

  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!user) throw ApiError.notFound('That employee does not exist');

  res.json({ success: true, message: `${user.fullName} was deactivated`, data: user });
});
