import { Router } from 'express';
import { requireRole } from '../../middleware/requireRole';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { createTaskSchema, updateTaskSchema, moveTaskSchema } from './task.schema';
import {
  createTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
  moveTaskHandler,
} from './task.controller';

// note: mergeParams so this router (nested under boards/:boardId/lists/:listId/tasks)
// still sees workspaceId from further up the chain
const router = Router({ mergeParams: true });

router.post('/', requireRole('MEMBER'), validateBody(createTaskSchema), asyncHandler(createTaskHandler));
router.patch('/:taskId', requireRole('MEMBER'), validateBody(updateTaskSchema), asyncHandler(updateTaskHandler));
router.delete('/:taskId', requireRole('MEMBER'), asyncHandler(deleteTaskHandler));
router.post('/:taskId/move', requireRole('MEMBER'), validateBody(moveTaskSchema), asyncHandler(moveTaskHandler));

export default router;
