import { Bell, Sun, Moon, Search, Command, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { notificationsApi } from '@/lib/api';
import { toList } from '@/lib/utils';
import type { Notification } from '@/types';
import { NotificationPanel } from './NotificationPanel';

interface TopBarProps {
  title?: string;
  actions?: React.ReactNode;
}

const PAGE_NAMES: Record<string, string> = {
  '/dashboard':           'Dashboard',
  '/profile':             'My Profile',
  '/jobs':                'Find Jobs',
  '/applications':        'Applications',
  '/saved-jobs':          'Saved Jobs',
  '/schedules':           'Schedules & Calendar',
  '/network':             'My Network',
  '/auto-apply':          'Auto Apply AI',
  '/companies':           'Companies Directory',
  '/assessments':         'Skill Assessments',
  '/resume':              'Resume & AI Insights',
  '/resume-builder':      'CV Builder',
  '/sign-documents':      'Document Signing',
  '/notifications':       'Notifications',
  '/chat':                'Messages',
  '/plans':               'Plans & Billing',
  '/help':                'Help & Support',
  '/settings':            'Account Settings',
  '/employer/profile':    'Company Profile',
  '/employer/jobs':       'Manage Jobs',
  '/employer/candidates': 'Candidate Applications',
  '/employer/scout':      'Talent Scout AI',
  '/employer/analytics':  'Analytics & Metrics',
};

export function TopBar({ title, actions }: TopBarProps) {
  const { theme, toggleTheme } = useUiStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list({ limit: 30 }).then(r => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const unreadCount = toList<Notification>(notifData).filter(n => !n.isRead).length;

  const displayTitle = title || PAGE_NAMES[location.pathname] || 'Dashboard';

  return (
    <header className="h-16 border-b border-border/50 bg-surface/80 backdrop-blur-xl flex items-center justify-between px-3.5 sm:px-6 shrink-0 sticky top-0 z-20 select-none w-full max-w-full overflow-hidden">
      
      {/* Left: Breadcrumbs / Title + Mobile Brand logo */}
      <div className="flex items-center gap-3">
        {/* Mobile Brand Logo Mark */}
        <div className="md:hidden flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-xs font-['Outfit',sans-serif]">G</span>
          </div>
        </div>

        <div className="flex flex-col min-w-0">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium truncate">
            <span>Mune Work</span>
            <span>/</span>
            <span className="capitalize">{user?.userType === 'employer' ? 'Employer' : 'Talent'}</span>
            <span>/</span>
            <span className="text-foreground font-semibold truncate">{displayTitle}</span>
          </div>
          <h1 className="text-sm sm:text-base font-bold text-foreground tracking-tight font-['Outfit',sans-serif] truncate max-w-[150px] sm:max-w-xs md:max-w-none">
            {displayTitle}
          </h1>
        </div>
      </div>

      {/* Middle: Search bar trigger */}
      <div className="hidden md:flex items-center flex-1 max-w-sm mx-8">
        <div className="w-full relative flex items-center">
          <Search className="absolute left-3.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            readOnly
            onClick={() => (window.location.href = '/jobs')}
            placeholder="Search jobs, skills, candidates... (⌘K)"
            className="w-full pl-9 pr-12 py-2 rounded-xl border border-border/50 bg-background/50 text-xs text-foreground placeholder:text-muted-foreground/70 cursor-pointer hover:border-primary/40 focus:outline-none transition-all shadow-inner"
          />
          <kbd className="absolute right-3 text-[10px] font-mono text-muted-foreground bg-surface-raised px-1.5 py-0.5 rounded border border-border/60">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Actions, Notifications, Theme */}
      <div className="flex items-center gap-2">
        {actions}

        {/* AI Tag */}
        <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
          <Sparkles className="h-3 w-3" /> AI Active
        </div>

        {/* Notifications Trigger */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setNotifOpen(true)}
          className="relative text-muted-foreground hover:text-foreground rounded-xl"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(262_83%_58%/0.8)]" />
          )}
        </Button>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground rounded-xl"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </header>
  );
}
