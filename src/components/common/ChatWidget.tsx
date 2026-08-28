import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, X, Send, ChevronDown, Loader2, Bot, Headphones,
  Briefcase, User, Sparkles, ExternalLink, FileText, ArrowRight,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { cn, getInitials, timeAgo } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { chatApi, aiApi, cvsApi } from '@/lib/api';
import { useUiStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { getChatSocket } from '@/lib/socket';
import type { Conversation, Message, CV } from '@/types';
import toast from 'react-hot-toast';

type ChatTab = 'AI' | 'MESSAGES' | 'SUPPORT';

interface AiChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  jobs?: any[];
  candidates?: any[];
  time: string;
}

export function ChatWidget() {
  const navigate = useNavigate();
  const { chatOpen, openChat, closeChat } = useUiStore();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<ChatTab>('AI');
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [selectedCvId, setSelectedCvId] = useState<string>('');
  
  // AI Chat state
  const [aiMessages, setAiMessages] = useState<AiChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: user?.userType === 'employer'
        ? "Hello! 👋 I'm your Mune Work AI Hiring Assistant. Ask me to search for candidates matching your job requirements or analyze top skills!"
        : "Hello! 👋 I'm your Mune Work AI Career Assistant. Ask me to find matching jobs, evaluate your match scores, or optimize your application strategy!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);

  // User CVs for AI matching
  const { data: userCvs = [] } = useQuery<CV[]>({
    queryKey: ['cvs'],
    queryFn: () => cvsApi.list().then(r => r.data.data ?? r.data),
    enabled: chatOpen && user?.userType === 'applicant',
  });


  // Peer conversations
  const { data: rawConversations = [], isLoading: convLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatApi.getConversations().then(r => r.data.data ?? r.data),
    enabled: chatOpen && activeTab === 'MESSAGES',
  });

  const conversations: Conversation[] = Array.isArray(rawConversations)
    ? rawConversations
    : Array.isArray((rawConversations as any)?.data)
    ? (rawConversations as any).data
    : Array.isArray((rawConversations as any)?.items)
    ? (rawConversations as any).items
    : [];

  // Conversation thread messages
  const { data: rawMessages = [], isLoading: msgLoading } = useQuery({
    queryKey: ['messages', activeConvId],
    queryFn: () => chatApi.getMessages(activeConvId!).then(r => r.data.data ?? r.data),
    enabled: !!activeConvId,
  });

  const messages: Message[] = Array.isArray(rawMessages)
    ? rawMessages
    : Array.isArray((rawMessages as any)?.data)
    ? (rawMessages as any).data
    : Array.isArray((rawMessages as any)?.items)
    ? (rawMessages as any).items
    : [];

  // Send Direct Message
  const sendMsg = useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      chatApi.sendMessage(conversationId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', activeConvId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setDraft('');
    },
  });

  // AI Chat Agent Mutation
  const sendAiChat = useMutation({
    mutationFn: (prompt: string) => aiApi.agentChat(prompt, selectedCvId || undefined),
    onSuccess: (res) => {
      const data = res.data?.data ?? res.data ?? {};
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setAiMessages(prev => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'ai',
          text: data.text || "Here is what I found for you:",
          jobs: data.jobs || [],
          candidates: data.candidates || [],
          time: now,
        },
      ]);
      setDraft('');
    },
    onError: () => {
      toast.error('AI response failed. Please try again.');
    },
  });

  // Start Human Support Chat
  const startSupport = useMutation({
    mutationFn: () => chatApi.startSupport(),
    onSuccess: (res) => {
      const conv = res.data?.data ?? res.data;
      if (conv?.id) {
        setActiveConvId(conv.id);
        setActiveTab('MESSAGES');
        qc.invalidateQueries({ queryKey: ['conversations'] });
      }
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiMessages, activeTab]);

  // Real-time socket for direct messages
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

  function handleSend() {
    const text = draft.trim();
    if (!text) return;

    if (activeTab === 'AI') {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setAiMessages(prev => [...prev, { id: String(Date.now()), sender: 'user', text, time: now }]);
      sendAiChat.mutate(text);
    } else if (activeConvId) {
      sendMsg.mutate({ conversationId: activeConvId, content: text });
    }
  }

  const activeConv: Conversation | undefined = conversations.find((c: Conversation) => c.id === activeConvId);

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => (chatOpen ? closeChat() : openChat())}
        className={cn(
          'fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center transition-all hover:scale-105',
          chatOpen && 'rotate-90 bg-destructive',
        )}
      >
        {chatOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </button>

      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-36 right-3 left-3 sm:left-auto sm:right-6 sm:w-96 z-50 h-[480px] sm:h-[540px] glass bg-surface/95 backdrop-blur-2xl border border-border/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Widget Top Bar & Mode Switcher */}
            <div className="bg-surface-raised border-b border-border p-3 space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                {activeConvId && activeTab === 'MESSAGES' ? (
                  <button
                    onClick={() => setActiveConvId(null)}
                    className="flex items-center gap-1.5 text-xs font-semibold hover:text-primary transition-colors"
                  >
                    <ChevronDown className="h-3.5 w-3.5 rotate-90" />
                    {activeConv?.otherParticipant?.name ?? 'Back to list'}
                  </button>
                ) : (
                  <p className="text-xs font-bold text-foreground">Mune Work Chat & Assistant</p>
                )}
                <button onClick={closeChat} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Mode Tabs */}
              {!activeConvId && (
                <div className="grid grid-cols-3 gap-1 bg-surface border border-border rounded-xl p-1 text-[11px] font-medium">
                  <button
                    onClick={() => { setActiveTab('AI'); setActiveConvId(null); }}
                    className={cn(
                      'flex items-center justify-center gap-1 py-1.5 rounded-lg transition-colors',
                      activeTab === 'AI' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Bot className="h-3.5 w-3.5" /> AI Agent
                  </button>
                  <button
                    onClick={() => { setActiveTab('MESSAGES'); setActiveConvId(null); }}
                    className={cn(
                      'flex items-center justify-center gap-1 py-1.5 rounded-lg transition-colors',
                      activeTab === 'MESSAGES' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Direct
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('SUPPORT');
                      startSupport.mutate();
                    }}
                    className={cn(
                      'flex items-center justify-center gap-1 py-1.5 rounded-lg transition-colors',
                      activeTab === 'SUPPORT' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Headphones className="h-3.5 w-3.5" /> Support
                  </button>
                </div>
              )}
            </div>

            {/* ── Mode 1: AI Agent ── */}
            {activeTab === 'AI' && (
              <div className="flex-1 flex flex-col overflow-hidden bg-background/50">
                {/* Applicant CV Selector Bar */}
                {user?.userType === 'applicant' && userCvs.length > 0 && (
                  <div className="px-3 py-2 bg-surface border-b border-border flex items-center justify-between gap-2 shrink-0">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3 text-primary" /> Active CV:
                    </span>
                    <select
                      value={selectedCvId}
                      onChange={e => setSelectedCvId(e.target.value)}
                      className="text-[11px] bg-surface-raised border border-border rounded-md px-2 py-1 outline-none text-foreground"
                    >
                      <option value="">Default CV Profile</option>
                      {userCvs.map(cv => (
                        <option key={cv.id} value={cv.id}>{cv.title || cv.label || 'Saved CV'}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* AI Chat Feed */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {aiMessages.map(msg => (
                    <div key={msg.id} className={cn('flex flex-col', msg.sender === 'user' ? 'items-end' : 'items-start')}>
                      <div className={cn(
                        'max-w-[85%] rounded-2xl px-3 py-2 text-xs space-y-2',
                        msg.sender === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-none'
                          : 'bg-surface border border-border text-foreground rounded-bl-none shadow-sm',
                      )}>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                        {/* Render Matched Job Cards */}
                        {msg.jobs && msg.jobs.length > 0 && (
                          <div className="space-y-2 pt-1 border-t border-border/50">
                            {msg.jobs.map((job: any) => (
                              <div key={job.id} className="bg-surface-raised border border-border rounded-xl p-2.5 space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-xs font-semibold text-foreground truncate">{job.title}</p>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-success/10 text-success border border-success/20 shrink-0">
                                    {job.matchScore}% Match
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">{job.company} · {job.location}</p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-[11px] h-7 gap-1 mt-1"
                                  onClick={() => { closeChat(); navigate(job.url); }}
                                >
                                  View Job <ExternalLink className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Render Matched Candidate Cards */}
                        {msg.candidates && msg.candidates.length > 0 && (
                          <div className="space-y-2 pt-1 border-t border-border/50">
                            {msg.candidates.map((cand: any) => (
                              <div key={cand.id} className="bg-surface-raised border border-border rounded-xl p-2.5 space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-xs font-semibold text-foreground truncate">{cand.name}</p>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                                    {cand.matchScore}% Match
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">{cand.title}</p>
                                {cand.skills && cand.skills.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {cand.skills.map((s: string) => (
                                      <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-surface border border-border text-muted-foreground">{s}</span>
                                    ))}
                                  </div>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-[11px] h-7 gap-1 mt-1"
                                  onClick={() => { closeChat(); navigate(cand.url); }}
                                >
                                  View Candidate <User className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <span className="text-[9px] opacity-60 block text-right">{msg.time}</span>
                      </div>
                    </div>
                  ))}

                  {sendAiChat.isPending && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-surface border border-border px-3 py-2 rounded-2xl w-fit">
                      <Sparkles className="h-3.5 w-3.5 text-primary animate-spin" />
                      Mune Work AI is thinking & searching…
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* AI Input */}
                <div className="border-t border-border p-2.5 bg-surface flex gap-2 shrink-0">
                  <input
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder={user?.userType === 'employer' ? "Ask AI to find candidates..." : "Ask AI to find matching jobs..."}
                    className="flex-1 bg-surface-raised rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
                  />
                  <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSend} disabled={!draft.trim() || sendAiChat.isPending}>
                    {sendAiChat.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            )}

            {/* ── Mode 2 & 3: Direct Messages & Human Support ── */}
            {activeTab !== 'AI' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {!activeConvId ? (
                  /* Conversation List */
                  <div className="flex-1 overflow-y-auto">
                    {convLoading ? (
                      <div className="p-3 space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex gap-3 items-center">
                            <Skeleton className="h-9 w-9 rounded-full" />
                            <div className="flex-1 space-y-1.5">
                              <Skeleton className="h-3 w-2/3" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center px-6 space-y-3">
                        <MessageSquare className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-semibold text-foreground">No conversations yet</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Messages from employers, applicants, or support will appear here.
                          </p>
                        </div>
                        <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => startSupport.mutate()}>
                          <Headphones className="h-3.5 w-3.5 text-primary" /> Start Support Chat
                        </Button>
                      </div>
                    ) : (
                      conversations.map((conv: Conversation) => (
                        <button
                          key={conv.id}
                          onClick={() => setActiveConvId(conv.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-raised transition-colors text-left border-b border-border/50 last:border-0"
                        >
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={conv.otherParticipant?.avatar} />
                            <AvatarFallback className="text-xs">
                              {getInitials(conv.otherParticipant?.name ?? '?')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate text-foreground">{conv.otherParticipant?.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{conv.lastMessage?.content ?? 'No messages yet'}</p>
                          </div>
                          {conv.lastMessage && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {timeAgo(conv.lastMessage.createdAt)}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  /* Active Message Thread */
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                      {msgLoading ? (
                        <div className="space-y-3">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className={cn('flex', i % 2 === 0 ? '' : 'justify-end')}>
                              <Skeleton className="h-8 w-32 rounded-2xl" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        (messages ?? []).map((msg) => {
                          const isMe = msg.senderId === user?.id;
                          return (
                            <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                              <div className={cn(
                                'max-w-[80%] rounded-2xl px-3 py-1.5 text-xs',
                                isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-surface-raised text-foreground rounded-bl-sm border border-border',
                              )}>
                                {msg.content}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={bottomRef} />
                    </div>

                    {/* Compose Input */}
                    <div className="border-t border-border p-2.5 bg-surface flex gap-2 shrink-0">
                      <input
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="Type a message…"
                        className="flex-1 bg-surface-raised rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
                      />
                      <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSend} disabled={!draft.trim() || sendMsg.isPending}>
                        {sendMsg.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
