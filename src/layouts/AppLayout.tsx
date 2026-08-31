import { Outlet, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Sidebar } from '@/components/common/Sidebar';
import { MobileBottomNav } from '@/components/common/MobileBottomNav';
import { ChatWidget } from '@/components/common/ChatWidget';
import { useAuthStore } from '@/store/auth.store';
import { useQueryClient } from '@tanstack/react-query';
import { getNotifSocket, getChatSocket } from '@/lib/socket';
import { useUiStore } from '@/store/ui.store';
import toast from 'react-hot-toast';
import { initFirebaseMessaging } from '@/lib/firebase';

const NOTIFICATION_ICONS: Record<string, string> = {
  job_match:             '✨',
  application_update:    '📋',
  interview_scheduled:   '📅',
  new_message:           '💬',
  connection_request:    '🤝',
};

export function AppLayout() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const { chatOpen } = useUiStore();
  const qc = useQueryClient();

  useEffect(() => {
    if (isAuthenticated) {
      initFirebaseMessaging();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const notifSock = getNotifSocket();
    const chatSock  = getChatSocket();
    if (!notifSock && !chatSock) return;

    // ── Real-time notification toasts ────────────────────────────────────────
    const onNotification = (payload: { type: string; title: string; message: string; data?: any }) => {
      const icon = NOTIFICATION_ICONS[payload.type] || '🔔';
      toast(`${icon} ${payload.title}\n${payload.message}`, {
        duration: 5000,
        style: {
          background: 'var(--surface-raised, #1e1e2e)',
          color: 'var(--foreground, #e2e8f0)',
          border: '1px solid var(--border, #2d2d3f)',
          borderRadius: '12px',
          fontSize: '13px',
          maxWidth: '360px',
        },
      });
      // Refresh notification badge count
      qc.invalidateQueries({ queryKey: ['notifications'] });
    };

    // ── New-message toast when widget is closed ───────────────────────────────
    const onNewMessage = (msg: { content: string; sender?: { name?: string } }) => {
      if (!chatOpen) {
        toast(`💬 New message from ${msg.sender?.name ?? 'someone'}: ${msg.content?.slice(0, 60)}…`, {
          duration: 4000,
          style: {
            background: 'var(--surface-raised, #1e1e2e)',
            color: 'var(--foreground, #e2e8f0)',
            border: '1px solid var(--border, #2d2d3f)',
            borderRadius: '12px',
            fontSize: '13px',
          },
        });
        qc.invalidateQueries({ queryKey: ['conversations'] });
      }
    };

    notifSock?.on('notification', onNotification);
    chatSock?.on('new-message', onNewMessage);

    return () => {
      notifSock?.off('notification', onNotification);
      chatSock?.off('new-message', onNewMessage);
    };
  }, [chatOpen, qc]);

  if (!_hasHydrated) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen w-screen max-w-full overflow-hidden bg-background">
      <div className="relative flex shrink-0">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 min-w-0 max-w-full overflow-hidden">
        <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-20 md:pb-0 w-full max-w-full">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
      <ChatWidget />
    </div>
  );
}

