import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let socket: Socket | null = null;

// one socket connection reused across the app, not per-component - avoids piling up
// duplicate connections as the user navigates between boards
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      auth: { token: localStorage.getItem('accessToken') },
      autoConnect: false,
    });
  }
  return socket;
}
