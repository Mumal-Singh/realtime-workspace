import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

// moving a task: which list it ends up in, and what position within that list
export const moveTaskSchema = z.object({
  listId: z.string().uuid(),
  position: z.number().int().min(0),
});
