import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { asyncHandler } from '../../utils/asyncHandler';
import { listActivityHandler } from './activity.controller';

const router = Router({ mergeParams: true });

router.use(requireAuth, requireRole('VIEWER'));
router.get('/', asyncHandler(listActivityHandler));

export default router;
