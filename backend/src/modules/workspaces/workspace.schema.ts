import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(1),
});

export const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']), // can't invite someone as OWNER
});

export const changeRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});
