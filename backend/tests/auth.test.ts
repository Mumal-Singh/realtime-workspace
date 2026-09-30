import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './setup';

const app = createApp();

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('auth', () => {
  it('signs up a new user and returns tokens', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({ email: 'test@example.com', password: 'password123', name: 'Test User' });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('rejects signup with an already-used email', async () => {
    await request(app).post('/auth/signup').send({ email: 'dup@example.com', password: 'password123', name: 'A' });
    const res = await request(app).post('/auth/signup').send({ email: 'dup@example.com', password: 'password123', name: 'B' });
    expect(res.status).toBe(409);
  });

  it('rejects login with wrong password', async () => {
    await request(app).post('/auth/signup').send({ email: 'user@example.com', password: 'password123', name: 'A' });
    const res = await request(app).post('/auth/login').send({ email: 'user@example.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('rotates refresh tokens and rejects reuse of an old one', async () => {
    const signup = await request(app)
      .post('/auth/signup')
      .send({ email: 'rotate@example.com', password: 'password123', name: 'A' });

    const firstRefreshToken = signup.body.refreshToken;

    const refreshRes = await request(app).post('/auth/refresh').send({ refreshToken: firstRefreshToken });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.refreshToken).not.toBe(firstRefreshToken);

    // reusing the now-rotated-out token should fail
    const reuseRes = await request(app).post('/auth/refresh').send({ refreshToken: firstRefreshToken });
    expect(reuseRes.status).toBe(401);
  });

  it('rejects protected routes without an access token', async () => {
    const res = await request(app).get('/workspaces');
    expect(res.status).toBe(401);
  });
});
