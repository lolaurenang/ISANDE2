import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

/** Turns express-validator output into one consistent 400 response. */
export default function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((e) => ({ field: e.path, message: e.msg }));
  return next(ApiError.badRequest('Some fields need fixing', details));
}
