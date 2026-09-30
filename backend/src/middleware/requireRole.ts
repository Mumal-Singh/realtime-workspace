import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuthedRequest } from './auth';

export interface WorkspaceScopedRequest extends AuthedRequest {
  membership?: { role: Role; workspaceId: string };
}

// order matters: OWNER > ADMIN > MEMBER > VIEWER. used to check "at least this role"
const ROLE_RANK: Record<Role, number> = {
  OWNER: 3,
  ADMIN: 2,
  MEMBER: 1,
  VIEWER: 0,
};

// looks up workspaceId from the route params (every workspace-scoped route has :workspaceId)
// confirms the user is actually a member, and that their role meets the minimum required.
// this is the ONE place tenant + role checks happen - individual routes just declare the
// minimum role they need.
export function requireRole(minRole: Role) {
  return async (req: WorkspaceScopedRequest, res: Response, next: NextFunction) => {
    const workspaceId = req.params.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId missing from route' });
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.userId!,
          workspaceId,
        },
      },
    });

    if (!membership) {
      // not a member of this workspace at all - do not leak whether the workspace exists
      return res.status(403).json({ error: 'not a member of this workspace' });
    }

    if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
      return res.status(403).json({ error: `requires ${minRole} role or higher` });
    }

    req.membership = { role: membership.role, workspaceId };
    next();
  };
}
