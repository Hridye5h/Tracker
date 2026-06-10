const mongoose = require('mongoose');
const asyncHandler = require('../middleware/async');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

// Direction of a transaction's effect on its account's balance.
const effect = (type, amount) => (type === 'income' ? amount : -amount);

// Resolve which account a transaction belongs to. If the client named one,
// verify ownership; otherwise fall back to the user's first account, creating
// a default "Cash" account when they have none — so money always lands
// somewhere real.
async function resolveAccount(userId, accountId, session) {
  if (accountId) {
    const account = await Account.findOne({ _id: accountId, user: userId }).session(session);
    if (!account) throw new Error('Account not found');
    return account;
  }
  let account = await Account.findOne({ user: userId }).sort({ createdAt: 1 }).session(session);
  if (!account) {
    [account] = await Account.create([{ user: userId, name: 'Cash', balance: 0 }], { session });
  }
  return account;
}

// Map errors thrown inside a manual try/catch to the same shape the central
// handler produces (it can't catch here because we must abort the session).
const errorBody = (err) => {
  if (err.name === 'ValidationError') {
    return Object.values(err.errors).map((v) => v.message);
  }
  return err.message;
};

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

// @desc    Add a transaction — atomically writes the ledger row AND applies
//          its effect to the owning account's balance (income credits,
//          expense debits) inside one MongoDB transaction.
// @route   POST /api/v1/transactions
// @access  Private
exports.addTransaction = asyncHandler(async (req, res) => {
  req.body.user = req.user.id;

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const account = await resolveAccount(req.user.id, req.body.account, session);
    req.body.account = account._id;

    const [transaction] = await Transaction.create([req.body], { session });

    // Expenses may drive a balance negative on purpose: the money is already
    // spent in the real world — the ledger records reality, it doesn't gate it.
    // (Transfers DO gate on funds, because there the app itself moves money.)
    account.balance += effect(transaction.type, transaction.amount);
    await account.save({ session });

    await session.commitTransaction();
    res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ success: false, error: errorBody(err) });
  } finally {
    session.endSession();
  }
});

// @desc    Update a transaction — reverses the old balance effect and applies
//          the new one (handles amount/type/account changes), atomically.
// @route   PUT /api/v1/transactions/:id
// @access  Private
exports.updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);
  if (!transaction) {
    return res.status(404).json({ success: false, error: 'No transaction found' });
  }
  if (transaction.user.toString() !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }

  // Snapshot the old effect before mutating anything.
  const oldAccountId = transaction.account;
  const oldDelta = effect(transaction.type, transaction.amount);

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    delete req.body.user; // never let the client reassign ownership
    ['description', 'amount', 'type', 'category', 'date'].forEach((k) => {
      if (req.body[k] !== undefined) transaction[k] = req.body[k];
    });

    // Re-resolve the account: an explicit new id is verified, a legacy row
    // with no account gets the default one.
    const account = await resolveAccount(
      req.user.id,
      req.body.account || transaction.account,
      session
    );
    transaction.account = account._id;

    await transaction.save({ session }); // runs schema validators

    // $inc avoids stale-document races and composes correctly even when the
    // old and new account are the same.
    if (oldAccountId) {
      await Account.updateOne({ _id: oldAccountId }, { $inc: { balance: -oldDelta } }, { session });
    }
    await Account.updateOne(
      { _id: transaction.account },
      { $inc: { balance: effect(transaction.type, transaction.amount) } },
      { session }
    );

    await session.commitTransaction();
    res.status(200).json({ success: true, data: transaction });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ success: false, error: errorBody(err) });
  } finally {
    session.endSession();
  }
});

// @desc    Delete a transaction — refunds its balance effect to the account.
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

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    if (transaction.account) {
      await Account.updateOne(
        { _id: transaction.account },
        { $inc: { balance: -effect(transaction.type, transaction.amount) } },
        { session }
      );
    }
    await transaction.deleteOne({ session });

    await session.commitTransaction();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ success: false, error: errorBody(err) });
  } finally {
    session.endSession();
  }
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
