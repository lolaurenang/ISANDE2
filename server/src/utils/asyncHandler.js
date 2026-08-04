/**
 * Wraps an async controller so a rejected promise reaches the error
 * middleware instead of hanging the request. Keeps every controller
 * free of repetitive try/catch blocks.
 */
export default function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
