import { io, Socket } from 'socket.io-client';

let chatSocket: Socket | null = null;
let notifSocket: Socket | null = null;

export function connectSockets(token: string) {
  // Existing sockets are reused rather than recreated: components attach their
  // listeners to these instances once, so swapping them out would silently
  // detach every listener. Refresh the token (used on the next handshake) and
  // revive any socket that a connect_error or pagehide left disconnected.
  if (chatSocket || notifSocket) {
    for (const sock of [chatSocket, notifSocket]) {
      if (!sock) continue;
      sock.auth = { token };
      if (!sock.connected) sock.connect();
    }
    return;
  }

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

// Pause sockets while the page is hidden in the BFCache or frozen, and resume
// them when it comes back. Unlike disconnectSockets() (logout), this keeps the
// instances so listeners registered by mounted components survive the round trip.
function pauseSockets() {
  chatSocket?.disconnect();
  notifSocket?.disconnect();
}

function resumeSockets() {
  const token = localStorage.getItem('accessToken');
  if (token) connectSockets(token);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', pauseSockets);
  document.addEventListener('freeze', pauseSockets);
  window.addEventListener('pageshow', (e) => { if (e.persisted) resumeSockets(); });
  document.addEventListener('resume', resumeSockets);
  // A connect_error during an outage stops reconnection; retry when the
  // browser reports the network is back.
  window.addEventListener('online', resumeSockets);
}
