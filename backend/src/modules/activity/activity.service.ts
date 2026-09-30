import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';

// called from other services after a mutation - kept dead simple on purpose,
// this is not a generic event bus, just an insert
export async function logActivity(
  workspaceId: string,
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown>,
) {
  await prisma.activityLog.create({
    data: { workspaceId, actorId, action, targetType, targetId, metadata: metadata as Prisma.InputJsonValue },
  });
}

export async function listActivity(workspaceId: string, page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where: { workspaceId },
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.activityLog.count({ where: { workspaceId } }),
  ]);

  return { items, total, page, pageSize };
}
