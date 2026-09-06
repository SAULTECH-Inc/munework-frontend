import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  MessageSquare, Send, Loader2, Search, Smile, Paperclip,
  X, Phone, Video, MoreVertical, Info, Trash2, Check, CheckCheck, Headphones,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { TopBar } from '@/components/common/TopBar';
import { chatApi } from '@/lib/api';
import { getChatSocket } from '@/lib/socket';
import { cn, getInitials, timeAgo } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import type { Conversation, Message } from '@/types';
import toast from 'react-hot-toast';

// ─── Common emojis ────────────────────────────────────────────────────────────

const EMOJIS = [
  '😊','😂','❤️','👍','🙏','😍','🎉','✅','🔥','💯',
  '😅','🤔','👏','😭','🚀','💪','🤝','😎','🥳','💡',
  '😢','😡','🤗','😴','👀','💬','📎','🎯','✨','💼',
  '🏆','⭐','📧','📱','💻','🔑','📌','⏰','📅','🌟',
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const urlConvId = searchParams.get('conv');

  const [activeConvId,   setActiveConvId]   = useState<string | null>(urlConvId);
  const [draft,          setDraft]          = useState('');
  const [search,         setSearch]         = useState('');
  const [showEmoji,      setShowEmoji]      = useState(false);
  const [showInfo,       setShowInfo]       = useState(false);
  const [moreMenuOpen,   setMoreMenuOpen]   = useState(false);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: rawConversations, isLoading: convLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatApi.getConversations().then(r => r.data.data ?? r.data),
    refetchInterval: 15_000,
  });

  const conversations: Conversation[] = Array.isArray(rawConversations)
    ? rawConversations
    : Array.isArray((rawConversations as any)?.data)
    ? (rawConversations as any).data
    : Array.isArray((rawConversations as any)?.items)
    ? (rawConversations as any).items
    : [];

  const { data: rawMessages, isLoading: msgLoading } = useQuery({
    queryKey: ['messages', activeConvId],
    queryFn: () => chatApi.getMessages(activeConvId!).then(r => r.data.data ?? r.data),
    enabled: !!activeConvId,
    // Real-time sockets don't run on Vercel serverless, so poll the open
    // conversation for incoming messages instead.
    refetchInterval: 4_000,
    refetchOnWindowFocus: true,
  });

  const messages: Message[] = Array.isArray(rawMessages)
    ? rawMessages
    : Array.isArray((rawMessages as any)?.data)
    ? (rawMessages as any).data
    : Array.isArray((rawMessages as any)?.items)
    ? (rawMessages as any).items
    : [];

  const sendMsg = useMutation({
    mutationFn: (content: string) => chatApi.sendMessage(activeConvId!, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', activeConvId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setDraft('');
    },
  });

  const deleteConv = useMutation({
    mutationFn: (id: string) => chatApi.deleteConversation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setActiveConvId(null);
      toast.success('Conversation deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  // Auto-select conversation from URL param once conversations load
  useEffect(() => {
    if (urlConvId && conversations.length > 0) {
      const found = conversations.find(c => c.id === urlConvId);
      if (found) setActiveConvId(urlConvId);
    }
  }, [urlConvId, conversations]);

  // Real-time socket
  useEffect(() => {
    if (!activeConvId) return;
    const sock = getChatSocket();
    if (!sock) return;
    sock.emit('join-conversation', { conversationId: activeConvId });
    const handler = (msg: Message) => {
      qc.setQueryData(['messages', activeConvId], (prev: Message[] = []) => [...prev, msg]);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    };
    sock.on('new-message', handler);
    return () => { sock.off('new-message', handler); };
  }, [activeConvId, qc]);

  // Mark as read + clear unread badge when opening conversation
  useEffect(() => {
    if (!activeConvId) return;
    chatApi.markRead(activeConvId).catch(() => {/* best-effort */});
    qc.setQueryData(['conversations'], (prev: Conversation[] = []) =>
      prev.map(c => c.id === activeConvId ? { ...c, unreadCount: 0 } : c)
    );
  }, [activeConvId, qc]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when conversation opens
  useEffect(() => {
    if (activeConvId) inputRef.current?.focus();
  }, [activeConvId]);

  // Close emoji on click-outside
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element)?.closest('[data-emoji-picker]')) setShowEmoji(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmoji]);

  function handleSend() {
    const text = draft.trim();
    if (!text || !activeConvId || sendMsg.isPending) return;
    sendMsg.mutate(text);
    setShowEmoji(false);
  }

  function insertEmoji(emoji: string) {
    setDraft(d => d + emoji);
    inputRef.current?.focus();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10 MB'); return; }
    setDraft(d => d + (d ? ' ' : '') + `[File: ${file.name}]`);
    e.target.value = '';
    inputRef.current?.focus();
  }

  const activeConv = conversations.find(c => c.id === activeConvId);
  const totalUnread = conversations.reduce((n, c) => n + ((c as any).unreadCount ?? 0), 0);

  const isSupportConv = (c: Conversation) =>
    c.type === 'support' || (c as any).otherParticipant?.userType === 'admin';

  const filteredConversations = conversations
    .filter(c => !search || c.otherParticipant?.name?.toLowerCase().includes(search.toLowerCase()))
    // Real employer/candidate chats first; the Mune Work Support line sinks to
    // the bottom so it's never mistaken for a conversation with an employer.
    .sort((a, b) => {
      const sa = isSupportConv(a) ? 1 : 0;
      const sb = isSupportConv(b) ? 1 : 0;
      if (sa !== sb) return sa - sb;
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tb - ta;
    });

  const selectConv = useCallback((id: string) => {
    setActiveConvId(id);
    setShowInfo(false);
    setMoreMenuOpen(false);
  }, []);

  return (
    <>
      <TopBar title={`Messages${totalUnread > 0 ? ` (${totalUnread})` : ''}`} />

      <div className="flex flex-1 overflow-hidden h-[calc(100vh-56px)]">

        {/* ── Conversation list ── */}
        <aside className={cn(
          'shrink-0 border-r border-border flex flex-col bg-surface transition-[width]',
          activeConvId ? 'hidden lg:flex w-72' : 'flex w-full lg:w-72',
        )}>
          {/* Search & Quick Actions */}
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
              />
            </div>
            <button
              onClick={() => {
                chatApi.startSupport().then(r => {
                  const conv = r.data?.data ?? r.data;
                  if (conv?.id) {
                    qc.invalidateQueries({ queryKey: ['conversations'] });
                    setActiveConvId(conv.id);
                  }
                });
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-primary/20 bg-primary/5 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors"
            >
              🎧 Chat with Human Support
            </button>
          </div>


          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {convLoading ? (
              <div className="p-3 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-3 items-center p-2">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
                <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {search ? 'No results' : 'Messages from employers and candidates will appear here'}
                </p>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isActive = conv.id === activeConvId;
                const unread = (conv as any).unreadCount ?? 0;
                const isSupport = isSupportConv(conv);
                return (
                  <button key={conv.id} onClick={() => selectConv(conv.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-b border-border/40 last:border-0',
                      isActive ? 'bg-primary/10' : 'hover:bg-surface-raised',
                    )}>
                    <div className="relative shrink-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conv.otherParticipant?.avatar} />
                        <AvatarFallback className={cn('text-xs', isSupport && 'bg-primary/15 text-primary')}>
                          {isSupport ? <Headphones className="h-4 w-4" /> : getInitials(conv.otherParticipant?.name ?? '?')}
                        </AvatarFallback>
                      </Avatar>
                      {!isSupport && (conv as any).otherParticipant?.isOnline && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success border-2 border-surface" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={cn('text-xs font-medium truncate flex items-center gap-1.5', isActive ? 'text-primary' : 'text-foreground',
                          unread > 0 && !isActive && 'font-semibold')}>
                          <span className="truncate">{conv.otherParticipant?.name ?? 'Unknown'}</span>
                          {isSupport && (
                            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-primary bg-primary/10 rounded px-1 py-px">Support</span>
                          )}
                        </p>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {timeAgo(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className={cn('text-[11px] truncate mt-0.5', unread > 0 && !isActive ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                        {conv.lastMessage?.content ?? 'No messages yet'}
                      </p>
                    </div>
                    {unread > 0 && (
                      <span className="shrink-0 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Message thread ── */}
        <main className={cn('flex-col overflow-hidden', activeConvId ? 'flex flex-1' : 'hidden lg:flex flex-1')}>
          {activeConvId && activeConv ? (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface shrink-0">
                {/* Back button (mobile) */}
                <button onClick={() => setActiveConvId(null)} className="lg:hidden p-1 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>

                <div className="relative shrink-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={activeConv.otherParticipant?.avatar} />
                    <AvatarFallback className="text-xs">
                      {getInitials(activeConv.otherParticipant?.name ?? '?')}
                    </AvatarFallback>
                  </Avatar>
                  {(activeConv as any).otherParticipant?.isOnline && (
                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-success border-2 border-surface" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {activeConv.otherParticipant?.name ?? 'Unknown'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {(activeConv as any).otherParticipant?.isOnline ? (
                      <span className="text-success">Online</span>
                    ) : (
                      (activeConv as any).otherParticipant?.lastSeen
                        ? `Last seen ${timeAgo((activeConv as any).otherParticipant.lastSeen)}`
                        : 'Offline'
                    )}
                  </p>
                </div>

                {/* Header actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button title="Voice call" className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface-raised transition-colors">
                    <Phone className="h-4 w-4" />
                  </button>
                  <button title="Video call" className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface-raised transition-colors">
                    <Video className="h-4 w-4" />
                  </button>
                  <button title="Info" onClick={() => setShowInfo(v => !v)}
                    className={cn('p-1.5 rounded-lg transition-colors', showInfo ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-surface-raised')}>
                    <Info className="h-4 w-4" />
                  </button>
                  {/* More menu */}
                  <div className="relative">
                    <button onClick={() => setMoreMenuOpen(v => !v)}
                      className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface-raised transition-colors">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {moreMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMoreMenuOpen(false)} />
                        <div className="absolute right-0 top-8 z-20 w-44 bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
                          <button
                            onClick={() => { deleteConv.mutate(activeConvId); setMoreMenuOpen(false); }}
                            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-destructive hover:bg-destructive/5 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" /> Delete Conversation
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                  {msgLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={cn('flex', i % 2 ? 'justify-end' : '')}>
                          <Skeleton className={cn('h-9 rounded-2xl', i % 2 ? 'w-40' : 'w-56')} />
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No messages yet — say hello!</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, idx) => {
                        const isMe = msg.senderId === user?.id;
                        const prevMsg = idx > 0 ? messages[idx - 1] : null;
                        const showAvatar = !isMe && prevMsg?.senderId !== msg.senderId;
                        const isRead = isMe && (msg as any).readAt;
                        return (
                          <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start', 'items-end gap-2')}>
                            {!isMe && (
                              <div className="w-6 shrink-0">
                                {showAvatar && (
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={activeConv.otherParticipant?.avatar} />
                                    <AvatarFallback className="text-[9px]">
                                      {getInitials(activeConv.otherParticipant?.name ?? '?')}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            )}
                            <div className={cn('flex flex-col', isMe ? 'items-end' : 'items-start', 'max-w-[65%]')}>
                              <div className={cn(
                                'rounded-2xl px-3.5 py-2 text-sm',
                                isMe
                                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                                  : 'bg-surface-raised text-foreground rounded-bl-sm',
                              )}>
                                <p className="leading-snug whitespace-pre-wrap break-words">{msg.content}</p>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 px-1">
                                <span className="text-[10px] text-muted-foreground">{timeAgo(msg.createdAt)}</span>
                                {isMe && (
                                  isRead
                                    ? <CheckCheck className="h-3 w-3 text-primary" />
                                    : <Check className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={bottomRef} />
                    </>
                  )}
                </div>

                {/* Info panel */}
                {showInfo && (
                  <aside className="w-64 shrink-0 border-l border-border bg-surface flex flex-col overflow-y-auto p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground">Conversation Info</p>
                      <button onClick={() => setShowInfo(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-col items-center text-center gap-2">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={activeConv.otherParticipant?.avatar} />
                        <AvatarFallback className="text-xl">{getInitials(activeConv.otherParticipant?.name ?? '?')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{activeConv.otherParticipant?.name}</p>
                        <p className="text-[11px] text-muted-foreground">{(activeConv.otherParticipant as any)?.professionalTitle ?? ''}</p>
                      </div>
                    </div>
                    <div className="border-t border-border pt-3 space-y-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</p>
                      <button onClick={() => { deleteConv.mutate(activeConvId); setShowInfo(false); }}
                        className="flex items-center gap-2 text-xs text-destructive hover:text-destructive/80 w-full">
                        <Trash2 className="h-3.5 w-3.5" /> Delete conversation
                      </button>
                    </div>
                  </aside>
                )}
              </div>

              {/* Compose */}
              <div className="border-t border-border p-3 bg-surface shrink-0">
                {/* Emoji picker */}
                {showEmoji && (
                  <div data-emoji-picker className="mb-2 p-2 bg-surface-raised border border-border rounded-xl grid grid-cols-10 gap-0.5">
                    {EMOJIS.map(e => (
                      <button key={e} onClick={() => insertEmoji(e)}
                        className="text-base h-7 w-7 flex items-center justify-center rounded hover:bg-surface transition-colors">
                        {e}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  {/* Emoji toggle */}
                  <button
                    data-emoji-picker
                    onClick={() => setShowEmoji(v => !v)}
                    className={cn('shrink-0 p-2 rounded-lg transition-colors', showEmoji ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-surface-raised')}>
                    <Smile className="h-4 w-4" />
                  </button>
                  {/* File attach */}
                  <button onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors">
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                  {/* Text input */}
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    placeholder="Type a message…"
                    className="flex-1 bg-surface-raised rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
                  />
                  <Button size="icon" onClick={handleSend}
                    disabled={!draft.trim() || sendMsg.isPending}
                    className="h-10 w-10 shrink-0">
                    {sendMsg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="h-16 w-16 rounded-2xl bg-surface-raised border border-border flex items-center justify-center mb-4">
                <MessageSquare className="h-7 w-7 text-muted-foreground" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Your messages</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Select a conversation from the list to start messaging
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
