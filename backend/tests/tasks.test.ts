import request from 'supertest';
import { app, resetDb, createTenant, signup, addMember } from './helpers';
import { prisma } from '../src/lib/prisma';
import { emitToWorkspace } from '../src/sockets';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

type Tenant = Awaited<ReturnType<typeof createTenant>>;

const listsUrl = (t: Tenant) => `/workspaces/${t.wsId}/boards/${t.boardId}/lists`;

async function createTask(t: Tenant, listId: string, title: string) {
  const res = await request(app)
    .post(`${listsUrl(t)}/${listId}/tasks`)
    .set(t.owner.auth)
    .send({ title });
  expect(res.status).toBe(201);
  return res.body;
}

describe('tasks', () => {
  it('creates a task and emits the event to its own workspace only', async () => {
    const a = await createTenant('a@test.com');
    const b = await createTenant('b@test.com');
    const task = await createTask(a, a.listId, 'Write tests');

    expect(task.workspaceId).toBe(a.wsId);
    expect(emitToWorkspace).toHaveBeenCalledWith(a.wsId, 'task:created', expect.anything());
    expect(emitToWorkspace).not.toHaveBeenCalledWith(b.wsId, expect.anything(), expect.anything());
  });

  it('does not let a VIEWER create tasks', async () => {
    const a = await createTenant('a@test.com');
    const viewer = await signup('viewer@test.com');
    await addMember(a.wsId, a.owner.auth, 'viewer@test.com', 'VIEWER');
    const res = await request(app)
      .post(`${listsUrl(a)}/${a.listId}/tasks`)
      .set(viewer.auth)
      .send({ title: 'Nope' });
    expect(res.status).toBe(403);
  });

  it('moves a task to another list and closes the gap in the old one', async () => {
    const a = await createTenant('a@test.com');
    const list2 = await request(app).post(listsUrl(a)).set(a.owner.auth).send({ name: 'Done' });
    const first = await createTask(a, a.listId, 'first');
    const second = await createTask(a, a.listId, 'second');

    const res = await request(app)
      .post(`${listsUrl(a)}/${a.listId}/tasks/${first.id}/move`)
      .set(a.owner.auth)
      .send({ listId: list2.body.id, position: 0 });
    expect(res.status).toBe(200);
    expect(res.body.listId).toBe(list2.body.id);

    const remaining = await prisma.task.findUnique({ where: { id: second.id } });
    expect(remaining!.position).toBe(0);
  });

  it('records created and moved tasks in the activity log', async () => {
    const a = await createTenant('a@test.com');
    const list2 = await request(app).post(listsUrl(a)).set(a.owner.auth).send({ name: 'Done' });
    const task = await createTask(a, a.listId, 'audit me');
    await request(app)
      .post(`${listsUrl(a)}/${a.listId}/tasks/${task.id}/move`)
      .set(a.owner.auth)
      .send({ listId: list2.body.id, position: 0 });

    const res = await request(app).get(`/workspaces/${a.wsId}/activity`).set(a.owner.auth);
    expect(res.status).toBe(200);
    const items = Array.isArray(res.body) ? res.body : res.body.items;
    const actions = items.map((i: any) => i.action);
    expect(actions).toEqual(expect.arrayContaining(['task.created', 'task.moved']));
  });

  it('searches with pagination and never returns another workspace\'s tasks', async () => {
    const a = await createTenant('a@test.com');
    const b = await createTenant('b@test.com');
    await createTask(a, a.listId, 'Alpha one');
    await createTask(a, a.listId, 'Alpha two');
    await createTask(a, a.listId, 'Alpha three');

    const page = await request(app)
      .get(`/workspaces/${a.wsId}/tasks/search?q=Alpha&page=1&pageSize=2`)
      .set(a.owner.auth);
    expect(page.status).toBe(200);
    expect(page.body.items).toHaveLength(2);
    expect(page.body.total).toBe(3);

    const other = await request(app)
      .get(`/workspaces/${b.wsId}/tasks/search?q=Alpha`)
      .set(b.owner.auth);
    expect(other.body.total).toBe(0);
  });
});
