const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Test env must be set before app/models load.
process.env.JWT_SECRET = 'testsecret';
process.env.JWT_EXPIRE = '1h';
process.env.NODE_ENV = 'test';

const app = require('../app');

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('Auth API', () => {
  it('registers a user and returns a JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Hridyesh', email: 'h@example.com', password: 'secret123' });
    expect(res.statusCode).toBe(201);
    expect(res.body.token).toBeDefined();
  });

  it('rejects a duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Dup', email: 'h@example.com', password: 'secret123' });
    expect(res.statusCode).toBe(400);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'h@example.com', password: 'secret123' });
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects a wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'h@example.com', password: 'wrongpass' });
    expect(res.statusCode).toBe(401);
  });
});
