import ApiError from '../utils/ApiError.js';

export function notFound(req, _res, next) {
  next(ApiError.notFound(`No route matches ${req.method} ${req.originalUrl}`));
}

/**
 * The single place where an error becomes an HTTP response.
 * Mongoose errors are translated here so the client always receives
 * the same shape: { success: false, message, details }.
 */
export function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong on the server';
  let details = err.details || null;

  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Some fields need fixing';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }

  if (err.name === 'CastError') {
    status = 400;
    message = `'${err.value}' is not a valid ${err.path}`;
  }

  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {}).join(', ');
    message = `A record with that ${field || 'value'} already exists`;
  }

  if (status >= 500) console.error('[error]', err);

  res.status(status).json({ success: false, message, details });
}
