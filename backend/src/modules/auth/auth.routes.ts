import { Router } from 'express';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { signupSchema, loginSchema, refreshSchema } from './auth.schema';
import {
  signupHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
} from './auth.controller';

const router = Router();

router.post('/signup', validateBody(signupSchema), asyncHandler(signupHandler));
router.post('/login', validateBody(loginSchema), asyncHandler(loginHandler));
router.post('/refresh', validateBody(refreshSchema), asyncHandler(refreshHandler));
router.post('/logout', validateBody(refreshSchema), asyncHandler(logoutHandler));

export default router;
