import { Response } from 'express';
import { WorkspaceScopedRequest } from '../../middleware/requireRole';
import * as listService from './list.service';

export async function createListHandler(req: WorkspaceScopedRequest, res: Response) {
  const list = await listService.createList(
    req.params.workspaceId,
    req.params.boardId,
    req.body.name,
    req.userId!,
  );
  res.status(201).json(list);
}
