// Central error handler — turns thrown/forwarded errors into consistent JSON
// instead of leaking stack traces. Registered last in app.js.
const errorHandler = (err, req, res, next) => {
  // Mongoose: malformed ObjectId in the URL
  if (err.name === 'CastError') {
    return res.status(404).json({ success: false, error: 'Resource not found' });
  }

  // Mongoose: duplicate unique key (e.g. email already registered)
  if (err.code === 11000) {
    return res.status(400).json({ success: false, error: 'Duplicate field value entered' });
  }

  // Mongoose: schema validation failed
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((v) => v.message);
    return res.status(400).json({ success: false, error: messages });
  }

  // Fallback
  console.error(err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Server Error'
  });
};

module.exports = errorHandler;
