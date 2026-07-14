const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const Url = require('../src/models/Url');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  await Url.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});

// --- POST /shorten ---
describe('POST /shorten', () => {
  test('returns 201 and short code for a valid URL', async () => {
    const res = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/some/long/path' });

    expect(res.status).toBe(201);
    expect(res.body.shortCode).toBeDefined();
    expect(res.body.shortUrl).toContain(res.body.shortCode);
    expect(res.body.originalUrl).toBe('https://example.com/some/long/path');
  });

  test('returns 422 for an invalid URL', async () => {
    const res = await request(app)
      .post('/shorten')
      .send({ url: 'not-a-url' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBeDefined();
  });

  test('returns 422 for a localhost URL (SSRF protection)', async () => {
    const res = await request(app)
      .post('/shorten')
      .send({ url: 'http://localhost/admin' });

    expect(res.status).toBe(422);
  });

  test('same URL shortened twice returns the same code (idempotent)', async () => {
    const url = 'https://example.com/duplicate';

    const first = await request(app).post('/shorten').send({ url });
    const second = await request(app).post('/shorten').send({ url });

    expect(second.status).toBe(200);
    expect(first.body.shortCode).toBe(second.body.shortCode);
    expect(second.body.new).toBe(false);
  });

  test('custom alias is used as the short code', async () => {
    const res = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/alias-test', alias: 'my-link' });

    expect(res.status).toBe(201);
    expect(res.body.shortCode).toBe('my-link');
  });

  test('duplicate alias returns 409 Conflict', async () => {
    await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/first', alias: 'taken' });

    const res = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/second', alias: 'taken' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/alias already taken/i);
  });
});

// --- GET /:code ---
describe('GET /:code', () => {
  test('redirects to original URL with 301', async () => {
    const shorten = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/redirect-test' });

    const { shortCode } = shorten.body;
    const res = await request(app).get(`/${shortCode}`);

    expect(res.status).toBe(301);
    expect(res.headers.location).toBe('https://example.com/redirect-test');
  });

  test('returns 404 for an unknown code', async () => {
    const res = await request(app).get('/doesnotexist');

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
