const express = require('express');
const router = express.Router();
const {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getSummary
} = require('../controllers/transactions');
const { protect } = require('../middleware/auth');

// Every transaction route is private — apply the gatekeeper once for all of them.
router.use(protect);

router.get('/summary', getSummary); // must come before '/:id'
router.route('/').get(getTransactions).post(addTransaction);
router.route('/:id').put(updateTransaction).delete(deleteTransaction);

module.exports = router;
