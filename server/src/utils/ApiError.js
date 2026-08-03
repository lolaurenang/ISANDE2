/** A thrown error that already knows which HTTP status it deserves. */
export default class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg, details) { return new ApiError(400, msg, details); }
  static unauthorized(msg = 'You need to log in to do that') { return new ApiError(401, msg); }
  static forbidden(msg = 'Your role does not allow that action') { return new ApiError(403, msg); }
  static notFound(msg = 'Not found') { return new ApiError(404, msg); }
  static conflict(msg) { return new ApiError(409, msg); }
}
