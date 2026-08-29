import { Link, useLocation } from 'react-router-dom';
import {
  Briefcase, Home, FileText, MessageSquare, Bell, Settings,
  Users, BarChart2, ChevronLeft, ChevronRight, LogOut, Sparkles,
  Calendar, Bookmark, Network as NetworkIcon, Zap, ClipboardList,
  HelpCircle, CreditCard, Building2, User, Target, Wand2, PenLine,
  Compass, Shield, Command,
  Code2,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface NavGroup {
  title: string;
  items: Array<{
    href: string;
    icon: React.ElementType;
    label: string;
    badge?: string;
  }>;
}

export const APPLICANT_GROUPS: NavGroup[] = [
  {
    title: 'OVERVIEW',
    items: [
      { href: '/dashboard', icon: Home, label: 'Dashboard' },
      { href: '/profile',   icon: User, label: 'My Profile' },
    ],
  },
  {
    title: 'JOBS & DISCOVERY',
    items: [
      { href: '/jobs',         icon: Briefcase,   label: 'Find Jobs' },
      { href: '/applications', icon: FileText,    label: 'Applications' },
      { href: '/saved-jobs',   icon: Bookmark,    label: 'Saved Jobs' },
      { href: '/companies',    icon: Building2,   label: 'Companies' },
      { href: '/network',      icon: NetworkIcon, label: 'Network' },
    ],
  },
  {
    title: 'AI & TOOLS',
    items: [
      { href: '/auto-apply',     icon: Zap,           label: 'Auto Apply', badge: 'AI' },
      { href: '/schedules',      icon: Calendar,      label: 'Schedules' },
      { href: '/assessments',    icon: ClipboardList, label: 'Assessments' },
      { href: '/resume',         icon: Sparkles,      label: 'Resume & AI' },
      { href: '/resume-builder', icon: Wand2,         label: 'CV Builder' },
      { href: '/sign-documents', icon: PenLine,       label: 'Sign Docs' },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { href: '/notifications', icon: Bell,          label: 'Notifications' },
      { href: '/chat',          icon: MessageSquare, label: 'Messages' },
      { href: '/plans',         icon: CreditCard,    label: 'Plans & Pricing' },
      { href: '/help',          icon: HelpCircle,    label: 'Help & Support' },
      { href: '/settings',      icon: Settings,      label: 'Settings' },
    ],
  },
];

export const EMPLOYER_GROUPS: NavGroup[] = [
  {
    title: 'OVERVIEW',
    items: [
      { href: '/dashboard',        icon: Home, label: 'Dashboard' },
      { href: '/employer/profile', icon: User, label: 'Company Profile' },
    ],
  },
  {
    title: 'RECRUITMENT',
    items: [
      { href: '/employer/jobs',       icon: Briefcase, label: 'My Jobs' },
      { href: '/employer/candidates', icon: Users,     label: 'Candidates' },
      { href: '/employer/scout',      icon: Target,    label: 'Talent Scout', badge: 'AI' },
      { href: '/employer/analytics',  icon: BarChart2, label: 'Analytics' },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { href: '/schedules',   icon: Calendar,      label: 'Schedules' },
      { href: '/assessments', icon: ClipboardList, label: 'Assessments' },
      { href: '/employer/developer', icon: Code2,   label: 'Developer', badge: 'API' },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { href: '/notifications', icon: Bell,          label: 'Notifications' },
      { href: '/chat',          icon: MessageSquare, label: 'Messages' },
      { href: '/plans',         icon: CreditCard,    label: 'Subscription' },
      { href: '/help',          icon: HelpCircle,    label: 'Help & Support' },
      { href: '/settings',      icon: Settings,      label: 'Settings' },
    ],
  },
];

export function Sidebar() {
  const { user, clearAuth } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const location = useLocation();

  const groups = user?.userType === 'employer' ? EMPLOYER_GROUPS : APPLICANT_GROUPS;
  const displayName = user?.userType === 'employer'
    ? user.companyName!
    : `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();

  async function handleLogout() {
    try { await authApi.logout(); } catch { /* best effort */ }
    clearAuth();
    toast.success('Logged out');
  }

  return (
    <aside
      className={cn(
        'hidden md:flex relative flex-col h-screen border-r border-border/50 transition-all duration-300 ease-in-out shrink-0 select-none z-30',
        'bg-surface/90 backdrop-blur-2xl shadow-[4px_0_24px_rgba(0,0,0,0.15)]',
        sidebarCollapsed ? 'w-[68px]' : 'w-[240px]',
      )}
    >
      {/* Brand Logo Header */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-border/40 shrink-0 justify-between',
        sidebarCollapsed && 'justify-center px-0',
      )}>
        {sidebarCollapsed ? (
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_2px_12px_hsl(262_83%_58%/0.35)]">
            <span className="text-white font-bold text-sm font-['Outfit',sans-serif]">M</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_2px_12px_hsl(262_83%_58%/0.35)]">
              <span className="text-white font-bold text-sm font-['Outfit',sans-serif]">M</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight font-['Outfit',sans-serif] leading-none">
                Mune <span className="text-gradient">Work</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase mt-0.5">
                {user?.userType === 'employer' ? 'Employer Hub' : 'Talent Suite'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Grouped Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-5 overflow-y-auto overflow-x-hidden scrollbar-none">
        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!sidebarCollapsed && (
              <p className="px-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest font-['Outfit',sans-serif] mb-1.5">
                {group.title}
              </p>
            )}
            {group.items.map(({ href, icon: Icon, label, badge }) => {
              const active = location.pathname === href || (href !== '/dashboard' && location.pathname.startsWith(href + '/'));
              return (
                <Link
                  key={href}
                  to={href}
                  title={sidebarCollapsed ? label : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200',
                    active
                      ? 'bg-gradient-to-r from-primary/15 via-primary/10 to-transparent text-primary shadow-[0_2px_10px_hsl(262_83%_58%/0.12)]'
                      : 'text-muted-foreground hover:bg-surface-raised/70 hover:text-foreground',
                    sidebarCollapsed && 'justify-center px-0 w-10 h-10 mx-auto',
                  )}
                >
                  {/* Left glowing bar for active link */}
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-primary to-accent shadow-[0_0_8px_hsl(262_83%_58%/0.6)]" />
                  )}

                  <Icon className={cn(
                    'h-4 w-4 shrink-0 transition-transform duration-200',
                    active ? 'text-primary scale-110' : 'group-hover:scale-110 group-hover:text-foreground',
                  )} />

                  {!sidebarCollapsed && (
                    <span className="truncate flex-1 font-medium">{label}</span>
                  )}

                  {!sidebarCollapsed && badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 uppercase tracking-wider">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Info & Footer Section */}
      <div className={cn(
        'border-t border-border/40 p-3 space-y-2 bg-surface/40',
        sidebarCollapsed && 'flex flex-col items-center p-2',
      )}>
        <div className={cn(
          'flex items-center gap-3 rounded-xl p-2 bg-surface-raised/40 border border-border/30 hover:border-primary/30 transition-colors',
          sidebarCollapsed && 'justify-center p-1.5 border-none bg-transparent',
        )}>
          <Avatar className="h-8 w-8 shrink-0 ring-2 ring-primary/20 shadow-sm">
            <AvatarImage src={user?.profilePicture ?? user?.companyLogo} />
            <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
              {getInitials(displayName || 'U')}
            </AvatarFallback>
          </Avatar>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate text-foreground font-['Outfit',sans-serif]">{displayName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          title="Logout"
          className={cn(
            'text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs font-medium transition-colors w-full',
            sidebarCollapsed ? 'px-0 h-8 justify-center' : 'justify-start gap-2 px-3 rounded-xl h-8',
          )}
        >
          <LogOut className="h-3.5 w-3.5" />
          {!sidebarCollapsed && <span>Sign out</span>}
        </Button>
      </div>

      {/* Collapse Toggle Handle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-surface border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 hover:shadow-[0_0_10px_hsl(262_83%_58%/0.3)] transition-all duration-200 z-40 shadow-md"
      >
        {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
