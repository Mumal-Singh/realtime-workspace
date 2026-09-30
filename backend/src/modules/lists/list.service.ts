import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../activity/activity.service';

// confirms the board actually belongs to this workspace before we let anyone touch its lists -
// without this a user could guess a boardId from another workspace and act on it
async function assertBoardInWorkspace(workspaceId: string, boardId: string) {
  const board = await prisma.board.findFirst({ where: { id: boardId, workspaceId } });
  if (!board) {
    throw new AppError(404, 'board not found');
  }
}

export async function createList(workspaceId: string, boardId: string, name: string, actorId: string) {
  await assertBoardInWorkspace(workspaceId, boardId);

  const maxPosition = await prisma.list.aggregate({
    where: { boardId },
    _max: { position: true },
  });

  const list = await prisma.list.create({
    data: { boardId, workspaceId, name, position: (maxPosition._max.position ?? -1) + 1 },
  });

  await logActivity(workspaceId, actorId, 'list.created', 'List', list.id, { name });
  return list;
}
