import { io, Socket } from 'socket.io-client';

let chatSocket: Socket | null = null;
let notifSocket: Socket | null = null;

export function connectSockets(token: string) {
  if (chatSocket?.connected && notifSocket?.connected) return;

  const wsBase = import.meta.env.VITE_WS_BASE_URL || import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/v1\/?$/, '') || 'http://localhost:3000';

  // Vercel serverless can't hold WebSocket connections, so a socket to a
  // *.vercel.app host always fails with a console error and never delivers.
  // Skip it entirely (even if VITE_WS_BASE_URL points there) — chat and
  // notifications fall back to REST polling. Point VITE_WS_BASE_URL at a
  // non-serverless realtime host to re-enable live sockets.
  if (wsBase.includes('vercel.app')) {
    return;
  }

  const opts = {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 2,
    reconnectionDelay: 5000,
  };

  if (!chatSocket) {
    chatSocket = io(`${wsBase}/chat`, opts);
    chatSocket.on('connect_error', () => {
      // Disconnect cleanly if serverless environment doesn't support persistent sockets
      if (chatSocket && !chatSocket.connected) {
        chatSocket.disconnect();
      }
    });
  }

  if (!notifSocket) {
    notifSocket = io(`${wsBase}/notifications`, opts);
    notifSocket.on('connect_error', () => {
      // Disconnect cleanly if serverless environment doesn't support persistent sockets
      if (notifSocket && !notifSocket.connected) {
        notifSocket.disconnect();
      }
    });
  }
}

export function disconnectSockets() {
  chatSocket?.disconnect();
  notifSocket?.disconnect();
  chatSocket = null;
  notifSocket = null;
}

export function getChatSocket() { return chatSocket; }
export function getNotifSocket() { return notifSocket; }

// Cleanly disconnect when browser tab enters BFCache or page unloads
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => disconnectSockets());
  window.addEventListener('freeze', () => disconnectSockets());
}
