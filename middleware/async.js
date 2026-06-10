// Wraps an async controller so we don't repeat try/catch in every handler.
// Any thrown error / rejected promise is forwarded to the central error handler.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
