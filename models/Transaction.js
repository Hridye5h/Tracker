const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  // Every transaction belongs to a user -> data is isolated per account.
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  // Optional link to a money bucket (see Account model).
  account: {
    type: mongoose.Schema.ObjectId,
    ref: 'Account',
    default: null
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    trim: true,
    maxlength: [100, 'Description cannot exceed 100 characters']
  },
  // Stored as a positive number; direction is carried by `type` (cleaner than
  // the signed-amount trick the original tutorial used).
  amount: {
    type: Number,
    required: [true, 'Please add an amount'],
    min: [0, 'Amount must be positive']
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: [true, 'Please specify income or expense']
  },
  category: { type: String, default: 'General', trim: true },
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Compound index: the hot query is "this user's transactions, newest first".
TransactionSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
