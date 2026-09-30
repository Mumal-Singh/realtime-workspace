import { Response } from 'express';
import { WorkspaceScopedRequest } from '../../middleware/requireRole';
import { listActivity } from './activity.service';

export async function listActivityHandler(req: WorkspaceScopedRequest, res: Response) {
  const page = Number(req.query.page) || 1;
  const pageSize = Math.min(Number(req.query.pageSize) || 20, 100);
  const result = await listActivity(req.params.workspaceId, page, pageSize);
  res.json(result);
}
