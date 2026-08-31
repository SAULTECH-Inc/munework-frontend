import { io, Socket } from 'socket.io-client';

let chatSocket: Socket | null = null;
let notifSocket: Socket | null = null;

export function connectSockets(token: string) {
  if (chatSocket?.connected && notifSocket?.connected) return;

  const wsBase = import.meta.env.VITE_WS_BASE_URL || import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/v1\/?$/, '') || 'http://localhost:3000';

  // If backend is running on Vercel serverless and no dedicated WebSocket URL is provided, skip socket polling
  if (wsBase.includes('vercel.app') && !import.meta.env.VITE_WS_BASE_URL) {
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
