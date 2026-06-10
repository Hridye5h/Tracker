const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'testsecret';
process.env.JWT_EXPIRE = '1h';
process.env.NODE_ENV = 'test';

const app = require('../app');

let mongo;
let token;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  // Register a user and keep the token for authenticated requests.
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Tester', email: 'tester@example.com', password: 'secret123' });
  token = res.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('Transactions API (auth + full CRUD + summary)', () => {
  let id;

  it('blocks unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/transactions');
    expect(res.statusCode).toBe(401);
  });

  it('creates a transaction (C)', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Coffee', amount: 120, type: 'expense', category: 'Food' });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.description).toBe('Coffee');
    id = res.body.data._id;
  });

  it('reads transactions (R)', async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(1);
  });

  it('updates a transaction (U) — completes full CRUD', async () => {
    const res = await request(app)
      .put(`/api/v1/transactions/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 150 });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.amount).toBe(150);
  });

  it('rejects an invalid type via schema validation', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Bad', amount: 10, type: 'not_a_type' });
    expect(res.statusCode).toBe(400);
  });

  it('returns an aggregated summary', async () => {
    const res = await request(app)
      .get('/api/v1/transactions/summary')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.expense).toBe(150);
    expect(res.body.data.balance).toBe(-150);
  });

  it('deletes a transaction (D)', async () => {
    const res = await request(app)
      .delete(`/api/v1/transactions/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });
});
