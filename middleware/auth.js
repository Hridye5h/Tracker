const jwt = require('jsonwebtoken');
const asyncHandler = require('./async');
const User = require('../models/User');

// Gatekeeper for private routes: requires a valid `Authorization: Bearer <token>`.
// On success it attaches the authenticated user to req.user for downstream handlers.
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized — no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authorized — user no longer exists' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Not authorized — invalid token' });
  }
});
