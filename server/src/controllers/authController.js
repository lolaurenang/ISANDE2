/**
 * CONTROLLER: auth
 * Signup, login, and "who am I". Controllers read the request, ask the
 * models to do the work, and shape the response. No business rule that
 * belongs to the data itself (password hashing, email uniqueness) lives here.
 */
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { signToken } from '../utils/token.js';

export const signup = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone, jobTitle, department, managerCode } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw ApiError.conflict('That email is already registered');

  // A manager account can only be created with the shop's invite code.
  const inviteCode = process.env.MANAGER_INVITE_CODE;
  const isManager = Boolean(inviteCode) && managerCode === inviteCode;

  const user = await User.create({
    fullName,
    email,
    password,
    phone: phone || '',
    role: isManager ? 'manager' : 'mechanic',
    jobTitle: jobTitle || (isManager ? 'Manager' : 'Mechanic'),
    department: department || (isManager ? 'Management' : 'Mechanic'),
  });

  await ActivityLog.create({
    employee: user._id,
    type: 'account',
    message: `${user.fullName} joined as ${user.jobTitle}`,
  });

  res.status(201).json({
    success: true,
    message: 'Account created',
    data: { user, token: signToken(user) },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Email or password is incorrect');
  }
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    message: 'Logged in',
    data: { user: user.toJSON(), token: signToken(user) },
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Your current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password updated' });
});
