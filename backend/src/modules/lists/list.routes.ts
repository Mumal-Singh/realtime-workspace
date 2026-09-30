import { Router } from 'express';
import { requireRole } from '../../middleware/requireRole';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { createListSchema } from './list.schema';
import { createListHandler } from './list.controller';
import taskRoutes from '../tasks/task.routes';

const router = Router({ mergeParams: true });

router.post('/', requireRole('MEMBER'), validateBody(createListSchema), asyncHandler(createListHandler));

// tasks live under a list, same nesting pattern as boards -> lists
router.use('/:listId/tasks', taskRoutes);

export default router;
