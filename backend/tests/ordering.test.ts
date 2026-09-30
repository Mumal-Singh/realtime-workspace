import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './setup';

const app = createApp();

async function setupBoardWithList() {
  const signup = await request(app)
    .post('/auth/signup')
    .send({ email: 'owner@example.com', password: 'password123', name: 'Owner' });
  const token = signup.body.accessToken;

  const ws = await request(app).post('/workspaces').set('Authorization', `Bearer ${token}`).send({ name: 'WS' });
  const board = await request(app)
    .post(`/workspaces/${ws.body.id}/boards`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Board' });
  const list = await request(app)
    .post(`/workspaces/${ws.body.id}/boards/${board.body.id}/lists`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Todo' });

  return { token, workspaceId: ws.body.id, boardId: board.body.id, listId: list.body.id };
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('task ordering', () => {
  it('assigns increasing positions to new tasks in a list', async () => {
    const { token, workspaceId, boardId, listId } = await setupBoardWithList();

    const t1 = await request(app)
      .post(`/workspaces/${workspaceId}/boards/${boardId}/lists/${listId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'first' });
    const t2 = await request(app)
      .post(`/workspaces/${workspaceId}/boards/${boardId}/lists/${listId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'second' });

    expect(t1.body.position).toBe(0);
    expect(t2.body.position).toBe(1);
  });

  it('reorders correctly when a task moves to an earlier position in the same list', async () => {
    const { token, workspaceId, boardId, listId } = await setupBoardWithList();

    const titles = ['a', 'b', 'c'];
    const created = [];
    for (const title of titles) {
      const res = await request(app)
        .post(`/workspaces/${workspaceId}/boards/${boardId}/lists/${listId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title });
      created.push(res.body);
    }

    // move 'c' (position 2) to position 0
    const moveRes = await request(app)
      .post(`/workspaces/${workspaceId}/boards/${boardId}/lists/${listId}/tasks/${created[2].id}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ listId, position: 0 });

    expect(moveRes.status).toBe(200);
    expect(moveRes.body.position).toBe(0);

    const board = await request(app)
      .get(`/workspaces/${workspaceId}/boards/${boardId}`)
      .set('Authorization', `Bearer ${token}`);

    const list = board.body.lists.find((l: any) => l.id === listId);
    const orderedTitles = list.tasks.sort((a: any, b: any) => a.position - b.position).map((t: any) => t.title);
    expect(orderedTitles).toEqual(['c', 'a', 'b']);
  });

  it('moves a task to a different list and closes the gap in the source list', async () => {
    const { token, workspaceId, boardId, listId } = await setupBoardWithList();

    const otherList = await request(app)
      .post(`/workspaces/${workspaceId}/boards/${boardId}/lists`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Doing' });

    const t1 = await request(app)
      .post(`/workspaces/${workspaceId}/boards/${boardId}/lists/${listId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'move-me' });
    const t2 = await request(app)
      .post(`/workspaces/${workspaceId}/boards/${boardId}/lists/${listId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'stays-behind' });

    await request(app)
      .post(`/workspaces/${workspaceId}/boards/${boardId}/lists/${listId}/tasks/${t1.body.id}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ listId: otherList.body.id, position: 0 });

    const board = await request(app)
      .get(`/workspaces/${workspaceId}/boards/${boardId}`)
      .set('Authorization', `Bearer ${token}`);

    const sourceList = board.body.lists.find((l: any) => l.id === listId);
    // 'stays-behind' should have shifted down to position 0 to close the gap
    expect(sourceList.tasks.map((t: any) => t.title)).toEqual(['stays-behind']);
    expect(sourceList.tasks[0].position).toBe(0);
  });
});

