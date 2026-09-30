import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './setup';

const app = createApp();

async function signupAndLogin(email: string) {
  const res = await request(app)
    .post('/auth/signup')
    .send({ email, password: 'password123', name: email.split('@')[0] });
  return res.body.accessToken as string;
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('multi-tenancy + RBAC', () => {
  it('blocks a user from workspace A reading workspace B data', async () => {
    const tokenA = await signupAndLogin('ownerA@example.com');
    const tokenB = await signupAndLogin('ownerB@example.com');

    const wsA = await request(app)
      .post('/workspaces')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Workspace A' });

    // owner B (not a member of workspace A) tries to read A's summary
    const res = await request(app)
      .get(`/workspaces/${wsA.body.id}/summary`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(403);
  });

  it('prevents a VIEWER from creating a board', async () => {
    const ownerToken = await signupAndLogin('owner@example.com');
    const viewerToken = await signupAndLogin('viewer@example.com');

    const ws = await request(app)
      .post('/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Workspace' });

    await request(app)
      .post(`/workspaces/${ws.body.id}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'viewer@example.com', role: 'VIEWER' });

    const res = await request(app)
      .post(`/workspaces/${ws.body.id}/boards`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'Sprint board' });

    expect(res.status).toBe(403);
  });

  it('prevents a MEMBER from inviting new members (requires ADMIN+)', async () => {
    const ownerToken = await signupAndLogin('owner2@example.com');
    const memberToken = await signupAndLogin('member2@example.com');
    const thirdUserEmail = 'third@example.com';
    await signupAndLogin(thirdUserEmail);

    const ws = await request(app)
      .post('/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Workspace' });

    await request(app)
      .post(`/workspaces/${ws.body.id}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'member2@example.com', role: 'MEMBER' });

    const res = await request(app)
      .post(`/workspaces/${ws.body.id}/members`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ email: thirdUserEmail, role: 'MEMBER' });

    expect(res.status).toBe(403);
  });

  it('allows OWNER to create a board and ADMIN to invite members', async () => {
    const ownerToken = await signupAndLogin('owner3@example.com');

    const ws = await request(app)
      .post('/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Workspace' });

    const boardRes = await request(app)
      .post(`/workspaces/${ws.body.id}/boards`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Sprint 1' });

    expect(boardRes.status).toBe(201);
  });
});
