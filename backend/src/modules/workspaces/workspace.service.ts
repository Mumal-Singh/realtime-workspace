import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../activity/activity.service';
import { redis } from '../../lib/redis';

export async function createWorkspace(userId: string, name: string) {
  // creating a workspace makes you its OWNER, done in a transaction so we never end up
  // with a workspace that has no owner
  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({ data: { name } });
    await tx.workspaceMember.create({
      data: { userId, workspaceId: workspace.id, role: 'OWNER' },
    });
    return workspace;
  });
}

export async function listMyWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
  });
  return memberships.map((m) => ({ ...m.workspace, myRole: m.role }));
}

export async function addMember(workspaceId: string, email: string, role: 'ADMIN' | 'MEMBER' | 'VIEWER', actorId: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(404, 'no user with that email exists yet - they need to sign up first');
  }

  const existing = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId } },
  });
  if (existing) {
    throw new AppError(409, 'user is already a member of this workspace');
  }

  const member = await prisma.workspaceMember.create({
    data: { userId: user.id, workspaceId, role },
  });

  await logActivity(workspaceId, actorId, 'member.added', 'WorkspaceMember', member.id, { email, role });
  await redis.del(`workspace:${workspaceId}:summary`);

  return member;
}

export async function removeMember(workspaceId: string, memberId: string, actorId: string) {
  const member = await prisma.workspaceMember.findUnique({ where: { id: memberId } });
  if (!member || member.workspaceId !== workspaceId) {
    throw new AppError(404, 'membership not found');
  }
  if (member.role === 'OWNER') {
    throw new AppError(400, 'cannot remove the workspace owner');
  }

  await prisma.workspaceMember.delete({ where: { id: memberId } });
  await logActivity(workspaceId, actorId, 'member.removed', 'WorkspaceMember', memberId, {});
  await redis.del(`workspace:${workspaceId}:summary`);
}

export async function changeRole(workspaceId: string, memberId: string, role: 'ADMIN' | 'MEMBER' | 'VIEWER', actorId: string) {
  const member = await prisma.workspaceMember.findUnique({ where: { id: memberId } });
  if (!member || member.workspaceId !== workspaceId) {
    throw new AppError(404, 'membership not found');
  }
  if (member.role === 'OWNER') {
    throw new AppError(400, "cannot change the owner's role");
  }

  const updated = await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role },
  });

  await logActivity(workspaceId, actorId, 'member.role_changed', 'WorkspaceMember', memberId, { role });
  return updated;
}

// this is the "genuinely expensive read" the assignment wants backed by redis - it touches
// boards, lists, tasks and members all at once. changes less often than individual tasks,
// so a short TTL plus explicit invalidation on member/task mutations keeps it fresh enough.
export async function getWorkspaceSummary(workspaceId: string) {
  const cacheKey = `workspace:${workspaceId}:summary`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return { ...JSON.parse(cached), fromCache: true };
  }

  const [workspace, memberCount, boardCount, taskCount] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId } }),
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.board.count({ where: { workspaceId } }),
    prisma.task.count({ where: { list: { board: { workspaceId } } } }),
  ]);

  const summary = { workspace, memberCount, boardCount, taskCount };
  await redis.set(cacheKey, JSON.stringify(summary), 'EX', 60); // 60s TTL as a backstop
  return { ...summary, fromCache: false };
}
