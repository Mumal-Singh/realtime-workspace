import { Prisma, TaskStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../activity/activity.service';
import { emitToWorkspace } from '../../sockets';
import { redis } from '../../lib/redis';

// confirms the list belongs to a board that belongs to this workspace - two hops, but it's
// the only way to be sure a listId from another tenant can't be used here
async function assertListInWorkspace(workspaceId: string, listId: string) {
  const list = await prisma.list.findFirst({
    where: { id: listId, board: { workspaceId } },
  });
  if (!list) {
    throw new AppError(404, 'list not found');
  }
  return list;
}

async function invalidateSummary(workspaceId: string) {
  await redis.del(`workspace:${workspaceId}:summary`);
}

export async function createTask(
  workspaceId: string,
  listId: string,
  data: { title: string; description?: string; assigneeId?: string },
  actorId: string,
) {
  await assertListInWorkspace(workspaceId, listId);

  const maxPosition = await prisma.task.aggregate({
    where: { listId },
    _max: { position: true },
  });

  const task = await prisma.task.create({
    data: {
      listId, workspaceId,
      title: data.title,
      description: data.description,
      assigneeId: data.assigneeId,
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });

  await logActivity(workspaceId, actorId, 'task.created', 'Task', task.id, { title: data.title });
  await invalidateSummary(workspaceId);
  emitToWorkspace(workspaceId, 'task:created', { task });

  return task;
}

export async function updateTask(
  workspaceId: string,
  taskId: string,
  data: { title?: string; description?: string; status?: TaskStatus; assigneeId?: string | null },
  actorId: string,
) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, list: { board: { workspaceId } } },
  });
  if (!task) {
    throw new AppError(404, 'task not found');
  }

  const updated = await prisma.task.update({ where: { id: taskId }, data });

  await logActivity(workspaceId, actorId, 'task.updated', 'Task', taskId, data);
  emitToWorkspace(workspaceId, 'task:updated', { task: updated });

  return updated;
}

export async function deleteTask(workspaceId: string, taskId: string, actorId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, list: { board: { workspaceId } } },
  });
  if (!task) {
    throw new AppError(404, 'task not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.delete({ where: { id: taskId } });
    // close the gap left behind so positions stay contiguous
    await tx.task.updateMany({
      where: { listId: task.listId, position: { gt: task.position } },
      data: { position: { decrement: 1 } },
    });
  });

  await logActivity(workspaceId, actorId, 'task.deleted', 'Task', taskId, {});
  await invalidateSummary(workspaceId);
  emitToWorkspace(workspaceId, 'task:deleted', { taskId, listId: task.listId });
}

// this is the concurrency-sensitive one: two users dragging tasks around the same board
// at the same time. we use a serializable transaction so postgres itself rejects one of
// two conflicting moves rather than us trying to hand-roll locking - the loser gets retried
// once, since serializable conflicts are expected under real concurrent use, not exceptional.
export async function moveTask(
  workspaceId: string,
  taskId: string,
  targetListId: string,
  targetPosition: number,
  actorId: string,
  attempt = 0,
): Promise<any> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const task = await tx.task.findFirst({
          where: { id: taskId, list: { board: { workspaceId } } },
        });
        if (!task) {
          throw new AppError(404, 'task not found');
        }
        await assertListInWorkspace(workspaceId, targetListId);

        const sourceListId = task.listId;
        const sourcePosition = task.position;

        if (sourceListId === targetListId) {
          // reordering within the same list - shift everything between old and new spot
          if (targetPosition > sourcePosition) {
            await tx.task.updateMany({
              where: { listId: sourceListId, position: { gt: sourcePosition, lte: targetPosition } },
              data: { position: { decrement: 1 } },
            });
          } else if (targetPosition < sourcePosition) {
            await tx.task.updateMany({
              where: { listId: sourceListId, position: { gte: targetPosition, lt: sourcePosition } },
              data: { position: { increment: 1 } },
            });
          }
        } else {
          // moving to a different list - close the gap in the old list, open a gap in the new one
          await tx.task.updateMany({
            where: { listId: sourceListId, position: { gt: sourcePosition } },
            data: { position: { decrement: 1 } },
          });
          await tx.task.updateMany({
            where: { listId: targetListId, position: { gte: targetPosition } },
            data: { position: { increment: 1 } },
          });
        }

        const moved = await tx.task.update({
          where: { id: taskId },
          data: { listId: targetListId, position: targetPosition },
        });

        return moved;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ).then(async (moved) => {
      await logActivity(workspaceId, actorId, 'task.moved', 'Task', taskId, { targetListId, targetPosition });
      emitToWorkspace(workspaceId, 'task:moved', { task: moved });
      return moved;
    });
  } catch (err: any) {
    // P2034 = prisma's code for a serialization failure / deadlock under this isolation level
    if (err.code === 'P2034' && attempt < 2) {
      return moveTask(workspaceId, taskId, targetListId, targetPosition, actorId, attempt + 1);
    }
    throw err;
  }
}

export async function searchTasks(
  workspaceId: string,
  filters: { query?: string; assigneeId?: string; status?: TaskStatus; page: number; pageSize: number },
) {
  const where: Prisma.TaskWhereInput = {
    list: { board: { workspaceId } },
    ...(filters.query
      ? {
          OR: [
            { title: { contains: filters.query, mode: 'insensitive' } },
            { description: { contains: filters.query, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.task.count({ where }),
  ]);

  return { items, total, page: filters.page, pageSize: filters.pageSize };
}
