import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

export const app = createApp();

function ok(res: { status: number; body: any }, what: string) {
  if (res.status >= 300) {
    throw new Error(`${what} failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res;
}

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "ActivityLog","Task","List","Board","WorkspaceMember","RefreshToken","Workspace","User" RESTART IDENTITY CASCADE',
  );
}

export async function signup(email: string, name = 'Test User') {
  const res = ok(
    await request(app).post('/auth/signup').send({ email, password: 'Passw0rd!123', name }),
    'signup',
  );
  return { auth: { Authorization: `Bearer ${res.body.accessToken}` } };
}

// a user + their own workspace + one board + one list
export async function createTenant(ownerEmail: string) {
  const owner = await signup(ownerEmail, 'Owner');
  const ws = ok(
    await request(app).post('/workspaces').set(owner.auth).send({ name: `WS ${ownerEmail}` }),
    'create workspace',
  );
  const wsId = ws.body.id as string;
  const board = ok(
    await request(app).post(`/workspaces/${wsId}/boards`).set(owner.auth).send({ name: 'Board' }),
    'create board',
  );
  const boardId = board.body.id as string;
  const list = ok(
    await request(app)
      .post(`/workspaces/${wsId}/boards/${boardId}/lists`)
      .set(owner.auth)
      .send({ name: 'To Do' }),
    'create list',
  );
  return { owner, wsId, boardId, listId: list.body.id as string };
}

export async function addMember(
  wsId: string,
  ownerAuth: { Authorization: string },
  email: string,
  role: string,
) {
  ok(await request(app).post(`/workspaces/${wsId}/members`).set(ownerAuth).send({ email, role }), 'add member');
}
