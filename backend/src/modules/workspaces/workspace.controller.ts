import { Response } from 'express';
import { WorkspaceScopedRequest } from '../../middleware/requireRole';
import { AuthedRequest } from '../../middleware/auth';
import * as workspaceService from './workspace.service';
import { digestQueue } from '../../lib/queue';

export async function createWorkspaceHandler(req: AuthedRequest, res: Response) {
  const workspace = await workspaceService.createWorkspace(req.userId!, req.body.name);
  res.status(201).json(workspace);
}

export async function listMyWorkspacesHandler(req: AuthedRequest, res: Response) {
  const workspaces = await workspaceService.listMyWorkspaces(req.userId!);
  res.json(workspaces);
}

export async function addMemberHandler(req: WorkspaceScopedRequest, res: Response) {
  const { email, role } = req.body;
  const member = await workspaceService.addMember(req.params.workspaceId, email, role, req.userId!);
  res.status(201).json(member);
}

export async function removeMemberHandler(req: WorkspaceScopedRequest, res: Response) {
  await workspaceService.removeMember(req.params.workspaceId, req.params.memberId, req.userId!);
  res.status(204).send();
}

export async function changeRoleHandler(req: WorkspaceScopedRequest, res: Response) {
  const member = await workspaceService.changeRole(
    req.params.workspaceId,
    req.params.memberId,
    req.body.role,
    req.userId!,
  );
  res.json(member);
}

export async function getSummaryHandler(req: WorkspaceScopedRequest, res: Response) {
  const summary = await workspaceService.getWorkspaceSummary(req.params.workspaceId);
  res.json(summary);
}

export async function enqueueDigestHandler(req: WorkspaceScopedRequest, res: Response) {
  await digestQueue.add('generate', { workspaceId: req.params.workspaceId });
  // 202 because the work hasn't happened yet - the caller shouldn't wait for it
  res.status(202).json({ message: 'digest job queued' });
}
