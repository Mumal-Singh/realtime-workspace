import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import workspaceRoutes from './modules/workspaces/workspace.routes';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/auth', authRoutes);
  app.use('/workspaces', workspaceRoutes);

  // must be last - catches anything thrown/rejected in the routes above
  app.use(errorHandler);

  return app;
}
