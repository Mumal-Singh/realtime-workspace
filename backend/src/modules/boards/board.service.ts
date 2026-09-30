import { prisma } from '../../lib/prisma';
import { logActivity } from '../activity/activity.service';

export async function createBoard(workspaceId: string, name: string, actorId: string) {
  const maxPosition = await prisma.board.aggregate({
    where: { workspaceId },
    _max: { position: true },
  });

  const board = await prisma.board.create({
    data: { workspaceId, name, position: (maxPosition._max.position ?? -1) + 1 },
  });

  await logActivity(workspaceId, actorId, 'board.created', 'Board', board.id, { name });
  return board;
}

export async function listBoards(workspaceId: string) {
  return prisma.board.findMany({
    where: { workspaceId },
    orderBy: { position: 'asc' },
  });
}

export async function getBoardWithLists(workspaceId: string, boardId: string) {
  return prisma.board.findFirst({
    where: { id: boardId, workspaceId }, // scoped by workspaceId - this is the tenant check
    include: {
      lists: {
        orderBy: { position: 'asc' },
        include: { tasks: { orderBy: { position: 'asc' } } },
      },
    },
  });
}
