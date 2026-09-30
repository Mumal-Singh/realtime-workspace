import request from 'supertest';
import { app, resetDb, signup } from './helpers';
import { prisma } from '../src/lib/prisma';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('auth', () => {
  it('signs up, then logs in', async () => {
    await signup('a@test.com');
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'a@test.com', password: 'Passw0rd!123' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it('stores a hash, never the plaintext password', async () => {
    await signup('a@test.com');
    const user = await prisma.user.findUnique({ where: { email: 'a@test.com' } });
    expect(user!.passwordHash).not.toBe('Passw0rd!123');
    expect(user!.passwordHash.length).toBeGreaterThan(20);
  });

  it('rejects a duplicate email', async () => {
    await signup('a@test.com');
    const res = await request(app)
      .post('/auth/signup')
      .send({ email: 'a@test.com', password: 'Passw0rd!123', name: 'Dup' });
    expect([400, 409]).toContain(res.status);
  });

  it('rejects a wrong password with 401', async () => {
    await signup('a@test.com');
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'a@test.com', password: 'WrongPass123!' });
    expect(res.status).toBe(401);
  });

  it('rejects protected routes without a token or with a garbage token', async () => {
    expect((await request(app).get('/workspaces')).status).toBe(401);
    const bad = await request(app).get('/workspaces').set({ Authorization: 'Bearer garbage' });
    expect(bad.status).toBe(401);
  });
});
