import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { createBoardSchema } from './board.schema';
import { createBoardHandler, listBoardsHandler, getBoardHandler } from './board.controller';
import listRoutes from '../lists/list.routes';

const router = Router({ mergeParams: true });

router.use(requireAuth, requireRole('VIEWER'));

router.get('/', asyncHandler(listBoardsHandler));
router.post('/', requireRole('MEMBER'), validateBody(createBoardSchema), asyncHandler(createBoardHandler));
router.get('/:boardId', asyncHandler(getBoardHandler));

// lists live under a board, nested so the boardId is always known and checked
router.use('/:boardId/lists', listRoutes);

export default router;
