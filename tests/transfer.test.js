const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

// Transactions need a replica set, so this suite spins up a 1-node replica set
// (a standalone mongod can't run transactions).
process.env.JWT_SECRET = 'testsecret';
process.env.JWT_EXPIRE = '1h';
process.env.NODE_ENV = 'test';

const app = require('../app');
const Account = require('../models/Account');

let replset;
let token;
let userId;
let fromId;
let toId;

beforeAll(async () => {
  replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replset.getUri());

  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Payer', email: 'payer@example.com', password: 'secret123' });
  token = res.body.token;
  userId = res.body.user.id;

  const from = await Account.create({ user: userId, name: 'Bank', balance: 1000 });
  const to = await Account.create({ user: userId, name: 'Cash', balance: 0 });
  fromId = from._id.toString();
  toId = to._id.toString();
});

afterAll(async () => {
  await mongoose.disconnect();
  await replset.stop();
});

describe('Atomic transfer (MongoDB ACID transaction)', () => {
  it('moves money atomically: debits one account and credits the other', async () => {
    const res = await request(app)
      .post('/api/v1/accounts/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send({ fromAccountId: fromId, toAccountId: toId, amount: 300 });

    expect(res.statusCode).toBe(200);
    const from = await Account.findById(fromId);
    const to = await Account.findById(toId);
    expect(from.balance).toBe(700);
    expect(to.balance).toBe(300);
  });

  it('rolls back completely on insufficient funds (no partial debit)', async () => {
    const res = await request(app)
      .post('/api/v1/accounts/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send({ fromAccountId: fromId, toAccountId: toId, amount: 999999 });

    expect(res.statusCode).toBe(400);
    // balances must be exactly what they were after the first transfer
    const from = await Account.findById(fromId);
    const to = await Account.findById(toId);
    expect(from.balance).toBe(700);
    expect(to.balance).toBe(300);
  });
});
