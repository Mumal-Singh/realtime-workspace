import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../lib/prisma';

let io: Server | null = null;

export function initSockets(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000' },
  });

  // auth happens once at connect time using the same access token as the REST api -
  // no separate socket-only auth scheme to maintain
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('missing access token'));
    try {
      const payload = verifyAccessToken(token);
      (socket as any).userId = payload.userId;
      next();
    } catch {
      next(new Error('invalid access token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;

    // client asks to join a specific workspace room after connecting - we check membership
    // here too, socket auth alone doesn't imply access to every workspace
    socket.on('join_workspace', async (workspaceId: string) => {
      const membership = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId, workspaceId } },
      });
      if (!membership) return; // silently ignore, don't confirm workspace existence
      socket.join(`workspace:${workspaceId}`);
    });

    socket.on('leave_workspace', (workspaceId: string) => {
      socket.leave(`workspace:${workspaceId}`);
    });
  });

  return io;
}

// used by services to broadcast after a mutation - e.g. emitToWorkspace(wsId, 'task:moved', payload)
export function emitToWorkspace(workspaceId: string, event: string, payload: unknown) {
  if (!io) return; // sockets not initialized (e.g. during tests) - fail quietly
  io.to(`workspace:${workspaceId}`).emit(event, payload);
}
