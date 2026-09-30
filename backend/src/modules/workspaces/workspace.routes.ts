import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { createWorkspaceSchema, addMemberSchema, changeRoleSchema } from './workspace.schema';
import {
  createWorkspaceHandler,
  listMyWorkspacesHandler,
  addMemberHandler,
  removeMemberHandler,
  changeRoleHandler,
  getSummaryHandler,
  enqueueDigestHandler,
} from './workspace.controller';
import { searchTasksHandler } from '../tasks/task.controller';
import boardRoutes from '../boards/board.routes';
import activityRoutes from '../activity/activity.routes';

const router = Router();

router.use(requireAuth);

router.post('/', validateBody(createWorkspaceSchema), asyncHandler(createWorkspaceHandler));
router.get('/', asyncHandler(listMyWorkspacesHandler));

// everything below this line is scoped to one workspace, requireRole handles both
// "are you a member" and "do you have enough permission" in one place
router.get('/:workspaceId/summary', requireRole('VIEWER'), asyncHandler(getSummaryHandler));
router.post('/:workspaceId/members', requireRole('ADMIN'), validateBody(addMemberSchema), asyncHandler(addMemberHandler));
router.delete('/:workspaceId/members/:memberId', requireRole('ADMIN'), asyncHandler(removeMemberHandler));
router.patch('/:workspaceId/members/:memberId', requireRole('ADMIN'), validateBody(changeRoleSchema), asyncHandler(changeRoleHandler));

// search is workspace-wide (not nested under a specific board), still needs at least viewer access
router.get('/:workspaceId/tasks/search', requireRole('VIEWER'), asyncHandler(searchTasksHandler));
router.post('/:workspaceId/digest', requireRole('ADMIN'), asyncHandler(enqueueDigestHandler));

router.use('/:workspaceId/boards', boardRoutes);
router.use('/:workspaceId/activity', activityRoutes);

export default router;
