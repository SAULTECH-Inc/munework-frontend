import { useState } from 'react';
import { Zap, Bug, Star, ArrowUp, Shield, Sparkles, CheckCircle2 } from 'lucide-react';
import { TopBar } from '@/components/common/TopBar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSeo } from '@/lib/seo';

type TagType = 'feature' | 'improvement' | 'fix' | 'security' | 'performance';

interface Release {
  version: string;
  date: string;
  label?: string;
  items: { type: TagType; text: string }[];
}

const TAG_META: Record<TagType, { label: string; icon: React.ElementType; color: string }> = {
  feature:     { label: 'New',         icon: Sparkles,     color: 'bg-primary/10 text-primary border-primary/20' },
  improvement: { label: 'Improved',    icon: ArrowUp,      color: 'bg-success/10 text-success border-success/20' },
  fix:         { label: 'Fix',         icon: Bug,          color: 'bg-warning/10 text-warning border-warning/20' },
  security:    { label: 'Security',    icon: Shield,       color: 'bg-destructive/10 text-destructive border-destructive/20' },
  performance: { label: 'Perf',        icon: Zap,          color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
};

const ALL_TAGS: TagType[] = ['feature', 'improvement', 'fix', 'security', 'performance'];

const RELEASES: Release[] = [
  {
    version: '3.0.0',
    date: 'June 18, 2025',
    label: 'Latest',
    items: [
      { type: 'feature', text: 'Auto-Apply 2.0 — AI-powered timing engine applies when employers are most active' },
      { type: 'feature', text: 'Smart Assessments — screening questions with AI answer scoring for employers' },
      { type: 'feature', text: 'Network — discover and connect with professionals across industries' },
      { type: 'feature', text: 'Company Discovery — browse, filter, and follow companies' },
      { type: 'feature', text: 'Interview scheduling with priority levels and type classification' },
      { type: 'feature', text: 'Public profiles for applicants and employers' },
      { type: 'improvement', text: 'Subscription plans page with quarterly and annual billing cycles' },
      { type: 'improvement', text: 'Redesigned notifications center with grouped date view and type filters' },
      { type: 'improvement', text: 'Settings now includes Privacy tab with granular visibility control' },
      { type: 'security', text: 'Enhanced session management with automatic token refresh' },
      { type: 'performance', text: 'Reduced initial page load by 40% with route-based code splitting' },
    ],
  },
  {
    version: '2.5.0',
    date: 'April 30, 2025',
    items: [
      { type: 'feature', text: 'Help Center with live chat, demo scheduling, and community forum' },
      { type: 'feature', text: 'Resume AI — AI-generated summaries and bullet point suggestions' },
      { type: 'feature', text: 'Saved Jobs list with one-click bookmark and remove' },
      { type: 'improvement', text: 'Job search filters now support salary range and work mode' },
      { type: 'improvement', text: 'Employer analytics dashboard with funnel and source breakdown' },
      { type: 'fix', text: 'Fixed duplicate notifications being shown after refresh' },
      { type: 'fix', text: 'Fixed sorting direction being ignored on Applications page' },
    ],
  },
  {
    version: '2.4.0',
    date: 'March 14, 2025',
    items: [
      { type: 'feature', text: 'OAuth login via Google and LinkedIn' },
      { type: 'feature', text: 'Employer candidate scouting tools with profile review' },
      { type: 'improvement', text: 'Chat now supports file attachments and read receipts' },
      { type: 'improvement', text: 'Sidebar collapses to icon-only mode to save screen space' },
      { type: 'fix', text: 'Fixed password reset email not being sent in some regions' },
      { type: 'security', text: 'Rate limiting applied to login and OTP endpoints' },
    ],
  },
  {
    version: '2.3.0',
    date: 'February 1, 2025',
    items: [
      { type: 'feature', text: 'Real-time messaging between applicants and employers' },
      { type: 'feature', text: 'Application status timeline with recruiter comments' },
      { type: 'improvement', text: 'Onboarding flow redesigned — 50% faster profile completion' },
      { type: 'improvement', text: 'Job cards now show match percentage based on profile' },
      { type: 'fix', text: 'Fixed profile picture upload failing for files > 2 MB' },
      { type: 'performance', text: 'Image assets served via CDN — 60% faster load times' },
    ],
  },
  {
    version: '2.0.0',
    date: 'December 10, 2024',
    items: [
      { type: 'feature', text: 'Complete platform relaunch with new dark-first design system' },
      { type: 'feature', text: 'Employer dashboard with job posting and pipeline management' },
      { type: 'feature', text: 'AI job recommendations powered by skill and behavior matching' },
      { type: 'feature', text: 'Auto-Apply v1 — automated application based on match score' },
      { type: 'security', text: 'End-to-end encryption for all user messages' },
    ],
  },
];

export default function ChangelogPage() {
  useSeo({
    title: "What's New | Mune Work",
    description: 'Recent releases, improvements and fixes on Mune Work.',
  });

  const [activeTag, setActiveTag] = useState<TagType | null>(null);

  const filtered = RELEASES.map(r => ({
    ...r,
    items: activeTag ? r.items.filter(i => i.type === activeTag) : r.items,
  })).filter(r => r.items.length > 0);

  return (
    <>
      <TopBar title="Changelog" />
      <div className="p-6 max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            What's New
          </h1>
          <p className="text-sm text-muted-foreground">
            A running log of everything we've shipped. We release updates regularly — check back often.
          </p>
        </div>

        {/* Tag filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTag(null)}
            className={cn(
              'px-3 py-1 text-xs rounded-full border transition-colors',
              !activeTag ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            All
          </button>
          {ALL_TAGS.map(tag => {
            const meta = TAG_META[tag];
            const Icon = meta.icon;
            return (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={cn(
                  'px-3 py-1 text-xs rounded-full border transition-colors flex items-center gap-1.5',
                  activeTag === tag ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-3 w-3" />
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* Releases */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-2 bottom-0 w-px bg-border" />

          <div className="space-y-10 pl-8">
            {filtered.map((release) => (
              <div key={release.version} className="relative">
                {/* Dot */}
                <div className="absolute -left-8 top-1 h-[22px] w-[22px] rounded-full border-2 border-primary bg-surface flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-sm font-bold text-foreground">v{release.version}</h2>
                    {release.label && (
                      <Badge className="text-[10px] h-4">{release.label}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{release.date}</span>
                  </div>

                  <div className="bg-surface border border-border rounded-xl divide-y divide-border">
                    {release.items.map((item, i) => {
                      const meta = TAG_META[item.type];
                      const Icon = meta.icon;
                      return (
                        <div key={i} className="flex items-start gap-3 px-4 py-3">
                          <div className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 mt-0.5', meta.color)}>
                            <Icon className="h-2.5 w-2.5" />
                            {meta.label}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                No entries match the selected filter.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
