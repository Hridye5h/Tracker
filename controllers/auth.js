const asyncHandler = require('../middleware/async');
const User = require('../models/User');

// Build a uniform auth response: a signed JWT plus a safe user object.
const sendToken = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  res.status(statusCode).json({
    success: true,
    token,
    user: { id: user._id, name: user.name, email: user.email }
  });
};

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Please provide name, email and password' });
  }
  // The pre-save hook hashes the password; we never store plaintext.
  const user = await User.create({ name, email, password });
  sendToken(user, 201, res);
});

// @desc    Log in and receive a JWT
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Please provide an email and password' });
  }
  // password is select:false, so pull it explicitly for the comparison.
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    // Same message for "no user" and "wrong password" -> no account enumeration.
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
  sendToken(user, 200, res);
});

// @desc    Get the currently logged-in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: req.user });
});
