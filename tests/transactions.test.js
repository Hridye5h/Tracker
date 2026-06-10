const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'testsecret';
process.env.JWT_EXPIRE = '1h';
process.env.NODE_ENV = 'test';

const app = require('../app');
const Account = require('../models/Account');

// Transactions API now applies balance effects inside MongoDB transactions,
// which need a replica set — so this suite runs on a 1-node replSet.
let mongo;
let token;

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());

  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Tester', email: 'tester@example.com', password: 'secret123' });
  token = res.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

const auth = (req) => req.set('Authorization', `Bearer ${token}`);

describe('Transactions API (auth + full CRUD + account-linked balances)', () => {
  let id;
  let cashId;

  it('blocks unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/transactions');
    expect(res.statusCode).toBe(401);
  });

  it('income with NO account auto-creates "Cash" and credits it', async () => {
    const res = await auth(request(app).post('/api/v1/transactions'))
      .send({ description: 'Salary', amount: 10000, type: 'income', category: 'Salary' });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.account).toBeDefined();

    const accounts = await Account.find({});
    expect(accounts).toHaveLength(1);
    expect(accounts[0].name).toBe('Cash');
    expect(accounts[0].balance).toBe(10000);
    cashId = accounts[0]._id.toString();
  });

  it('an expense debits the account (C)', async () => {
    const res = await auth(request(app).post('/api/v1/transactions'))
      .send({ description: 'Coffee', amount: 120, type: 'expense', category: 'Food' });
    expect(res.statusCode).toBe(201);
    id = res.body.data._id;

    const cash = await Account.findById(cashId);
    expect(cash.balance).toBe(9880); // 10000 - 120
  });

  it('reads transactions (R)', async () => {
    const res = await auth(request(app).get('/api/v1/transactions'));
    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(2);
  });

  it('updating an amount adjusts the balance by the difference (U)', async () => {
    const res = await auth(request(app).put(`/api/v1/transactions/${id}`)).send({ amount: 150 });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.amount).toBe(150);

    const cash = await Account.findById(cashId);
    expect(cash.balance).toBe(9850); // 10000 - 150
  });

  it('rejects an invalid type via schema validation', async () => {
    const res = await auth(request(app).post('/api/v1/transactions'))
      .send({ description: 'Bad', amount: 10, type: 'not_a_type' });
    expect(res.statusCode).toBe(400);
  });

  it('returns an aggregated summary', async () => {
    const res = await auth(request(app).get('/api/v1/transactions/summary'));
    expect(res.statusCode).toBe(200);
    expect(res.body.data.income).toBe(10000);
    expect(res.body.data.expense).toBe(150);
    expect(res.body.data.balance).toBe(9850);
  });

  it('deleting a transaction refunds its effect (D)', async () => {
    const res = await auth(request(app).delete(`/api/v1/transactions/${id}`));
    expect(res.statusCode).toBe(200);

    const cash = await Account.findById(cashId);
    expect(cash.balance).toBe(10000); // expense reversed
  });

  it('moving a transaction between accounts moves its effect too', async () => {
    const bankRes = await auth(request(app).post('/api/v1/accounts'))
      .send({ name: 'Bank', balance: 500 });
    const bankId = bankRes.body.data._id;

    const txRes = await auth(request(app).post('/api/v1/transactions'))
      .send({ description: 'Groceries', amount: 200, type: 'expense', account: bankId });
    expect((await Account.findById(bankId)).balance).toBe(300); // 500 - 200

    // Reassign the expense from Bank to Cash.
    await auth(request(app).put(`/api/v1/transactions/${txRes.body.data._id}`))
      .send({ account: cashId });
    expect((await Account.findById(bankId)).balance).toBe(500);   // refunded
    expect((await Account.findById(cashId)).balance).toBe(9800);  // 10000 - 200
  });

  it('deleting an account cascades to its transactions', async () => {
    const before = await auth(request(app).get('/api/v1/transactions'));
    const cashRows = before.body.data.filter((t) => t.account === cashId).length;
    expect(cashRows).toBeGreaterThan(0);

    const del = await auth(request(app).delete(`/api/v1/accounts/${cashId}`));
    expect(del.statusCode).toBe(200);

    const after = await auth(request(app).get('/api/v1/transactions'));
    expect(after.body.data.filter((t) => t.account === cashId)).toHaveLength(0);
  });
});
