const mongoose = require('mongoose');
const asyncHandler = require('../middleware/async');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

// @desc    Get the user's accounts
// @route   GET /api/v1/accounts
// @access  Private
exports.getAccounts = asyncHandler(async (req, res) => {
  const accounts = await Account.find({ user: req.user.id });
  res.status(200).json({ success: true, count: accounts.length, data: accounts });
});

// @desc    Create an account
// @route   POST /api/v1/accounts
// @access  Private
exports.createAccount = asyncHandler(async (req, res) => {
  req.body.user = req.user.id;
  const account = await Account.create(req.body);
  res.status(201).json({ success: true, data: account });
});

// @desc    Delete an account
// @route   DELETE /api/v1/accounts/:id
// @access  Private
exports.deleteAccount = asyncHandler(async (req, res) => {
  const account = await Account.findById(req.params.id);
  if (!account || account.user.toString() !== req.user.id) {
    return res.status(404).json({ success: false, error: 'Account not found' });
  }
  await account.deleteOne();
  res.status(200).json({ success: true, data: {} });
});

// @desc    Transfer money between two accounts — ATOMICALLY
// @route   POST /api/v1/accounts/transfer
// @access  Private
//
// This is a genuine MongoDB multi-document ACID transaction. The debit, the
// credit, and the two ledger entries all commit together or not at all — a
// crash mid-transfer can never leave money debited without being credited.
// NOTE: transactions require a replica set (MongoDB Atlas provides one;
// a bare local `mongod` does not).
exports.transfer = asyncHandler(async (req, res) => {
  const { fromAccountId, toAccountId, amount } = req.body;

  if (!fromAccountId || !toAccountId || !amount || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Provide fromAccountId, toAccountId and a positive amount' });
  }
  if (fromAccountId === toAccountId) {
    return res.status(400).json({ success: false, error: 'Cannot transfer to the same account' });
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const from = await Account.findOne({ _id: fromAccountId, user: req.user.id }).session(session);
    const to = await Account.findOne({ _id: toAccountId, user: req.user.id }).session(session);

    if (!from || !to) throw new Error('Account not found');
    if (from.balance < amount) throw new Error('Insufficient funds');

    from.balance -= amount;
    to.balance += amount;
    await from.save({ session });
    await to.save({ session });

    // Record both ledger entries inside the same transaction.
    await Transaction.create(
      [
        { user: req.user.id, account: from._id, description: `Transfer to ${to.name}`, amount, type: 'expense', category: 'Transfer' },
        { user: req.user.id, account: to._id, description: `Transfer from ${from.name}`, amount, type: 'income', category: 'Transfer' }
      ],
      { session }
    );

    await session.commitTransaction();
    res.status(200).json({ success: true, data: { from, to } });
  } catch (err) {
    await session.abortTransaction(); // roll everything back on any failure
    return res.status(400).json({ success: false, error: err.message });
  } finally {
    session.endSession();
  }
});
