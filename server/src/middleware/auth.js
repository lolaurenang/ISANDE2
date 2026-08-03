/**
 * Authentication + authorization middleware.
 * `protect` proves who the caller is; `authorize` decides what that
 * person is allowed to reach. Both sit between the route and the
 * controller so no controller ever has to check permissions itself.
 */
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { verifyToken } from '../utils/token.js';

export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) throw ApiError.unauthorized('Log in to continue');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Your session expired. Log in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('This account is no longer active');
  }

  req.user = user;
  next();
});

/** Usage: router.post('/', protect, authorize('manager'), controller) */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Only ${roles.join(' or ')} accounts can do that`));
    }
    next();
  };

/** Managers may act on anybody; everyone else only on themselves. */
export const selfOrManager = (paramName = 'id') => (req, _res, next) => {
  if (req.user.role === 'manager' || req.user.id === req.params[paramName]) return next();
  return next(ApiError.forbidden('You can only view or change your own records'));
};
