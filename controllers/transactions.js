const mongoose = require('mongoose');
const asyncHandler = require('../middleware/async');
const Transaction = require('../models/Transaction');

// @desc    Get the logged-in user's transactions (with optional filters)
// @route   GET /api/v1/transactions
// @access  Private
// Filters: ?type=expense&category=Food&search=coffee&from=2024-01-01&to=2024-12-31
exports.getTransactions = asyncHandler(async (req, res) => {
  const query = { user: req.user.id }; // <- isolation: only ever this user's rows

  if (req.query.type) query.type = req.query.type;
  if (req.query.category) query.category = req.query.category;
  if (req.query.search) query.description = { $regex: req.query.search, $options: 'i' };
  if (req.query.from || req.query.to) {
    query.date = {};
    if (req.query.from) query.date.$gte = new Date(req.query.from);
    if (req.query.to) query.date.$lte = new Date(req.query.to);
  }

  const transactions = await Transaction.find(query).sort({ date: -1 });
  res.status(200).json({ success: true, count: transactions.length, data: transactions });
});

// @desc    Add a transaction
// @route   POST /api/v1/transactions
// @access  Private
exports.addTransaction = asyncHandler(async (req, res) => {
  req.body.user = req.user.id; // force ownership to the logged-in user
  const transaction = await Transaction.create(req.body);
  res.status(201).json({ success: true, data: transaction });
});

// @desc    Update a transaction  (this is the "U" that completes full CRUD)
// @route   PUT /api/v1/transactions/:id
// @access  Private
exports.updateTransaction = asyncHandler(async (req, res) => {
  let transaction = await Transaction.findById(req.params.id);
  if (!transaction) {
    return res.status(404).json({ success: false, error: 'No transaction found' });
  }
  // Ownership check — you can only edit your own data.
  if (transaction.user.toString() !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }
  delete req.body.user; // never let the client reassign ownership
  transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  res.status(200).json({ success: true, data: transaction });
});

// @desc    Delete a transaction
// @route   DELETE /api/v1/transactions/:id
// @access  Private
exports.deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);
  if (!transaction) {
    return res.status(404).json({ success: false, error: 'No transaction found' });
  }
  if (transaction.user.toString() !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }
  await transaction.deleteOne(); // .remove() is deprecated in Mongoose 7
  res.status(200).json({ success: true, data: {} });
});

// @desc    Spending summary for charts (income/expense totals + per-category)
// @route   GET /api/v1/transactions/summary
// @access  Private
exports.getSummary = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);

  // Aggregation pipeline: group this user's rows by category + type.
  const byCategory = await Transaction.aggregate([
    { $match: { user: userId } },
    { $group: { _id: { category: '$category', type: '$type' }, total: { $sum: '$amount' } } },
    { $sort: { total: -1 } }
  ]);

  // And overall income vs expense.
  const totals = await Transaction.aggregate([
    { $match: { user: userId } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } }
  ]);

  const income = totals.find((t) => t._id === 'income')?.total || 0;
  const expense = totals.find((t) => t._id === 'expense')?.total || 0;

  res.status(200).json({
    success: true,
    data: { income, expense, balance: income - expense, byCategory }
  });
});
