import request from 'supertest';
import { app, resetDb, createTenant, signup, addMember } from './helpers';
import { prisma } from '../src/lib/prisma';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('role-based access', () => {
  it('blocks a non-member from reading a workspace', async () => {
    const a = await createTenant('a@test.com');
    const outsider = await signup('outsider@test.com');
    const res = await request(app).get(`/workspaces/${a.wsId}/boards`).set(outsider.auth);
    expect(res.status).toBe(403);
  });

  it('lets a VIEWER read but not write', async () => {
    const a = await createTenant('a@test.com');
    const viewer = await signup('viewer@test.com');
    await addMember(a.wsId, a.owner.auth, 'viewer@test.com', 'VIEWER');

    const read = await request(app).get(`/workspaces/${a.wsId}/boards`).set(viewer.auth);
    expect(read.status).toBe(200);

    const write = await request(app)
      .post(`/workspaces/${a.wsId}/boards/${a.boardId}/lists`)
      .set(viewer.auth)
      .send({ name: 'Nope' });
    expect(write.status).toBe(403);
  });

  it('lets a MEMBER write but not manage members', async () => {
    const a = await createTenant('a@test.com');
    const member = await signup('member@test.com');
    await addMember(a.wsId, a.owner.auth, 'member@test.com', 'MEMBER');

    const write = await request(app)
      .post(`/workspaces/${a.wsId}/boards/${a.boardId}/lists`)
      .set(member.auth)
      .send({ name: 'Doing' });
    expect(write.status).toBe(201);

    const invite = await request(app)
      .post(`/workspaces/${a.wsId}/members`)
      .set(member.auth)
      .send({ email: 'x@test.com', role: 'VIEWER' });
    expect(invite.status).toBe(403);
  });
});

describe('tenant isolation', () => {
  it('404s when a foreign boardId is used inside your own workspace', async () => {
    const a = await createTenant('a@test.com');
    const b = await createTenant('b@test.com');
    const res = await request(app)
      .post(`/workspaces/${b.wsId}/boards/${a.boardId}/lists`)
      .set(b.owner.auth)
      .send({ name: 'Sneaky' });
    expect(res.status).toBe(404);
  });

  it('404s when a foreign listId is used inside your own workspace', async () => {
    const a = await createTenant('a@test.com');
    const b = await createTenant('b@test.com');
    const res = await request(app)
      .post(`/workspaces/${b.wsId}/boards/${b.boardId}/lists/${a.listId}/tasks`)
      .set(b.owner.auth)
      .send({ title: 'Sneaky task' });
    expect(res.status).toBe(404);
  });

  it('makes Postgres itself reject a task whose workspaceId differs from its list', async () => {
    const a = await createTenant('a@test.com');
    const b = await createTenant('b@test.com');
    await expect(
      prisma.task.create({
        data: { listId: a.listId, workspaceId: b.wsId, title: 'x', position: 0 },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });
});
