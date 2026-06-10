const express = require('express');
const router = express.Router();
const {
  getAccounts,
  createAccount,
  deleteAccount,
  transfer
} = require('../controllers/accounts');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/transfer', transfer); // the atomic transaction endpoint
router.route('/').get(getAccounts).post(createAccount);
router.route('/:id').delete(deleteAccount);

module.exports = router;
