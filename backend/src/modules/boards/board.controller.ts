import { Response } from 'express';
import { WorkspaceScopedRequest } from '../../middleware/requireRole';
import { AppError } from '../../middleware/errorHandler';
import * as boardService from './board.service';

export async function createBoardHandler(req: WorkspaceScopedRequest, res: Response) {
  const board = await boardService.createBoard(req.params.workspaceId, req.body.name, req.userId!);
  res.status(201).json(board);
}

export async function listBoardsHandler(req: WorkspaceScopedRequest, res: Response) {
  const boards = await boardService.listBoards(req.params.workspaceId);
  res.json(boards);
}

export async function getBoardHandler(req: WorkspaceScopedRequest, res: Response) {
  const board = await boardService.getBoardWithLists(req.params.workspaceId, req.params.boardId);
  if (!board) {
    throw new AppError(404, 'board not found');
  }
  res.json(board);
}
