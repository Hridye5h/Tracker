const mongoose = require('mongoose');

// An "account" is a money bucket (Cash, Bank, UPI wallet, Credit Card...).
// Transfers between accounts are what justify the atomic MongoDB transaction.
const AccountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please name the account'],
    trim: true
  },
  balance: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Account', AccountSchema);
