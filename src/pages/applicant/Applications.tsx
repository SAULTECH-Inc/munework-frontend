import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, X, SortAsc, SortDesc, Briefcase, Building2,
  MapPin, Clock, Zap, Star, ChevronDown, ChevronRight,
  FileText, MessageSquare, Eye, Trash2, Loader2,
  CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react';
import { TopBar } from '@/components/common/TopBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { jobsApi } from '@/lib/api';
import { cn, APPLICATION_STATUS_COLOR, APPLICATION_STATUS_LABEL, timeAgo, formatSalary } from '@/lib/utils';
import type { Application } from '@/types';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/store/auth.store';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { label: 'All',                 value: null              },
  { label: 'Pending',             value: 'pending'         },
  { label: 'Viewed',              value: 'viewed'          },
  { label: 'Under Review',        value: 'under_review'    },
  { label: 'Shortlisted',         value: 'shortlisted'     },
  { label: 'Interview',           value: 'interview_scheduled' },
  { label: 'Offer',               value: 'offer_extended'  },
  { label: 'Hired',               value: 'hired'           },
  { label: 'Rejected',            value: 'rejected'        },
];

const SORT_OPTIONS = [
  { label: 'Date Applied', value: 'createdAt' },
  { label: 'Company',      value: 'company'   },
  { label: 'Job Title',    value: 'title'     },
  { label: 'Status',       value: 'status'    },
];

const KANBAN_COLUMNS = [
  { key: 'pending',              label: 'Pending'      },
  { key: 'viewed',               label: 'Viewed'       },
  { key: 'under_review',         label: 'Under Review' },
  { key: 'shortlisted',          label: 'Shortlisted'  },
  { key: 'interview_scheduled',  label: 'Interview'    },
  { key: 'offer_extended',       label: 'Offer'        },
  { key: 'hired',                label: 'Hired'        },
  { key: 'rejected',             label: 'Rejected'     },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const qc = useQueryClient();
  const [view,         setView]         = useState<'kanban' | 'list'>('list');
  const [jobTitle,     setJobTitle]     = useState('');
  const [companyName,  setCompanyName]  = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortBy,       setSortBy]       = useState('createdAt');
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('desc');
  const [selected,     setSelected]     = useState<Application | null>(null);

  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['my-applications-all'],
    queryFn: () => jobsApi.getMyApplications({ limit: 200 }).then(r => r.data.data ?? r.data),
    enabled: user?.userType === 'applicant',
  });

  const all: Application[] = (data as any)?.data ?? data ?? [];

  // Deep link from an email/notification (/applications/:id) — open that
  // application's detail as soon as the list has loaded. Guarded so it fires
  // once per id: without this, every background refetch (which yields a fresh
  // `all` array) would re-open a detail the user had just closed.
  const { id: deepLinkId } = useParams<{ id?: string }>();
  const openedDeepLink = useRef<string | null>(null);
  useEffect(() => {
    if (!deepLinkId || !all.length || openedDeepLink.current === deepLinkId) return;
    const match = all.find(a => a.id === deepLinkId);
    if (match) { setSelected(match); openedDeepLink.current = deepLinkId; }
  }, [deepLinkId, all]);

  // Client-side filter + sort (server returns up to 200)
  const applications = useMemo(() => {
    const q  = jobTitle.toLowerCase();
    const cq = companyName.toLowerCase();
    return [...all]
      .filter(a => {
        if (q  && !a.job?.title?.toLowerCase().includes(q))                               return false;
        if (cq && !a.job?.employer?.companyName?.toLowerCase().includes(cq))              return false;
        if (statusFilter && a.status !== statusFilter)                                    return false;
        return true;
      })
      .sort((a, b) => {
        let av: any, bv: any;
        if (sortBy === 'createdAt') { av = new Date(a.appliedAt).getTime(); bv = new Date(b.appliedAt).getTime(); }
        if (sortBy === 'company')   { av = a.job?.employer?.companyName ?? ''; bv = b.job?.employer?.companyName ?? ''; }
        if (sortBy === 'title')     { av = a.job?.title ?? ''; bv = b.job?.title ?? ''; }
        if (sortBy === 'status')    { av = a.status ?? ''; bv = b.status ?? ''; }
        if (av === bv) return 0;
        return (av < bv ? -1 : 1) * (sortDir === 'asc' ? 1 : -1);
      });
  }, [all, jobTitle, companyName, statusFilter, sortBy, sortDir]);

  // Stats
  const stats = useMemo(() => ({
    total:       all.length,
    pending:     all.filter(a => a.status === 'pending').length,
    shortlisted: all.filter(a => a.status === 'shortlisted').length,
    interview:   all.filter(a => a.status === 'interview_scheduled').length,
    hired:       all.filter(a => a.status === 'hired').length,
    rejected:    all.filter(a => a.status === 'rejected').length,
  }), [all]);

  const withdraw = useMutation({
    mutationFn: (jobId: string) => jobsApi.withdrawApplication(jobId),
    onSuccess: () => {
      toast.success('Application withdrawn');
      qc.invalidateQueries({ queryKey: ['my-applications-all'] });
      setSelected(null);
    },
    onError: () => toast.error('Failed to withdraw'),
  });

  return (
    <>
      <TopBar title="My Applications" actions={
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['list', 'kanban'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={cn('text-xs px-3 py-1.5 transition-colors capitalize',
                view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {v}
            </button>
          ))}
        </div>
      } />

      <div className="flex flex-col flex-1 overflow-hidden h-[calc(100vh-56px)]">

        {/* ── Toolbar ── */}
        <div className="shrink-0 p-3 border-b border-border bg-surface space-y-3">

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { label: 'Total',       value: stats.total,       icon: FileText,    gradient: 'from-primary to-accent' },
              { label: 'Pending',     value: stats.pending,     icon: Clock,       gradient: 'from-warning to-amber-500' },
              { label: 'Shortlisted', value: stats.shortlisted, icon: Star,        gradient: 'from-blue-500 to-indigo-500' },
              { label: 'Interview',   value: stats.interview,   icon: CheckCircle2,gradient: 'from-violet-500 to-purple-500' },
              { label: 'Hired',       value: stats.hired,       icon: CheckCircle2,gradient: 'from-success to-emerald-500' },
              { label: 'Rejected',    value: stats.rejected,    icon: XCircle,     gradient: 'from-destructive to-red-500' },
            ].map(s => (
              <div key={s.label} className="glass rounded-xl border border-border/50 p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-6 w-6 rounded-lg bg-gradient-to-br ${s.gradient} flex items-center justify-center`}>
                    <s.icon className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                </div>
                <span className="text-sm font-bold font-['Outfit',sans-serif]">{s.value}</span>
              </div>
            ))}
          </div>

          {/* Search row */}
          <div className="flex gap-2 flex-wrap">
            {/* Job title */}
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                placeholder="Job title…"
                className="w-full pl-9 pr-8 py-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground" />
              {jobTitle && (
                <button onClick={() => setJobTitle('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {/* Company */}
            <div className="relative flex-1 min-w-[160px]">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                placeholder="Company name…"
                className="w-full pl-9 pr-8 py-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground" />
              {companyName && (
                <button onClick={() => setCompanyName('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Status filter chips */}
          <div className="flex gap-1.5 flex-wrap items-center">
            {STATUS_FILTERS.map(f => (
              <button key={String(f.value)} onClick={() => setStatusFilter(f.value)}
                className={cn(
                  'text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                  statusFilter === f.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
                )}>
                {f.label}
                {f.value && (
                  <span className="ml-1 text-[10px] opacity-70">
                    ({all.filter(a => a.status === f.value).length})
                  </span>
                )}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-1">
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="h-7 text-[11px] pl-2 pr-6 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none">
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none -ml-5 h-3 w-3 text-muted-foreground" />
              <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                {sortDir === 'asc' ? <SortAsc className="h-3.5 w-3.5" /> : <SortDesc className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">{applications.length} application{applications.length !== 1 ? 's' : ''}</p>
        </div>

        {/* ── Content ── */}
        <div className="flex flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex-1 p-4 space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : applications.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">No applications found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(jobTitle || companyName || statusFilter) ? 'Try adjusting your filters' : "You haven't applied to any jobs yet"}
              </p>
            </div>
          ) : view === 'list' ? (
            <div className={cn('flex flex-1 overflow-hidden')}>
              {/* List */}
              <div className={cn('flex-1 overflow-y-auto', selected ? 'hidden lg:block' : '')}>
                <div className="divide-y divide-border/50">
                  {applications.map(app => (
                    <AppListRow key={app.id} app={app} isSelected={selected?.id === app.id}
                      onClick={() => setSelected(selected?.id === app.id ? null : app)} />
                  ))}
                </div>
              </div>
              {/* Detail panel */}
              {selected && (
                <div className="w-full lg:w-[400px] shrink-0 border-l border-border bg-surface flex flex-col overflow-hidden">
                  <AppDetailPanel
                    app={selected} onClose={() => setSelected(null)}
                    onWithdraw={() => withdraw.mutate(selected.job.id)}
                    withdrawPending={withdraw.isPending}
                  />
                </div>
              )}
            </div>
          ) : (
            <KanbanBoard applications={applications} onSelect={setSelected} />
          )}
        </div>
      </div>

      {/* Detail modal for kanban */}
      {view === 'kanban' && selected && (
        <Dialog open onOpenChange={open => !open && setSelected(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{selected.job?.title}</DialogTitle></DialogHeader>
            <DialogBody>
              <AppDetailPanel
                app={selected} onClose={() => setSelected(null)} inline
                onWithdraw={() => withdraw.mutate(selected.job.id)}
                withdrawPending={withdraw.isPending}
              />
            </DialogBody>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ─── List Row ─────────────────────────────────────────────────────────────────

function AppListRow({ app, isSelected, onClick }: { app: Application; isSelected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={cn('w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors',
        isSelected ? 'bg-primary/5' : 'hover:bg-surface-raised')}>
      <Avatar className="h-10 w-10 rounded-xl shrink-0">
        <AvatarImage src={app.job?.employer?.companyLogo} />
        <AvatarFallback className="rounded-xl text-xs">{app.job?.employer?.companyName?.[0] ?? '?'}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{app.job?.title}</p>
            <p className="text-[11px] text-muted-foreground truncate">{app.job?.employer?.companyName}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge className={cn('text-[10px] border', APPLICATION_STATUS_COLOR[app.status])}>
              {APPLICATION_STATUS_LABEL[app.status] ?? app.status}
            </Badge>
            {app.isAutoApplied && (
              <span className="text-[10px] text-primary flex items-center gap-0.5">
                <Zap className="h-2.5 w-2.5" /> Auto
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {app.job?.location && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <MapPin className="h-2.5 w-2.5" />{app.job.location}
            </span>
          )}
          {app.job?.jobType && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Briefcase className="h-2.5 w-2.5" />{app.job.jobType.replace('_', ' ')}
            </span>
          )}
          {app.job?.salaryRange && (
            <span className="text-[10px] text-muted-foreground">{formatSalary(app.job.salaryRange)}</span>
          )}
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-auto">
            <Clock className="h-2.5 w-2.5" />{timeAgo(app.appliedAt)}
          </span>
          {(app as any).matchScore != null && (
            <span className="text-[10px] text-success flex items-center gap-0.5">
              <Star className="h-2.5 w-2.5" />{Math.round((app as any).matchScore * 100)}% match
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────

function KanbanBoard({ applications, onSelect }: { applications: Application[]; onSelect: (a: Application) => void }) {
  const byStatus = (key: string) => applications.filter(a => a.status === key);
  return (
    <div className="flex gap-3 p-4 overflow-x-auto flex-1">
      {KANBAN_COLUMNS.map(col => {
        const items = byStatus(col.key);
        return (
          <div key={col.key} className="shrink-0 w-60 flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 rounded-lg mb-2 bg-surface-raised border border-border">
              <span className="text-xs font-semibold text-foreground">{col.label}</span>
              <span className="text-[11px] text-muted-foreground">{items.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
              {items.map(app => (
                <button key={app.id} onClick={() => onSelect(app)}
                  className="w-full text-left p-3 rounded-xl bg-surface border border-border hover:border-primary/30 transition-colors">
                  <div className="flex items-start gap-2 mb-2">
                    <Avatar className="h-7 w-7 rounded-lg shrink-0">
                      <AvatarImage src={app.job?.employer?.companyLogo} />
                      <AvatarFallback className="rounded-lg text-[9px]">{app.job?.employer?.companyName?.[0] ?? '?'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{app.job?.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{app.job?.employer?.companyName}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{timeAgo(app.appliedAt)}</span>
                    {app.isAutoApplied && <span className="text-[10px] text-primary flex items-center gap-0.5"><Zap className="h-2.5 w-2.5" /> Auto</span>}
                  </div>
                </button>
              ))}
              {items.length === 0 && (
                <div className="h-16 border-2 border-dashed border-border/50 rounded-xl flex items-center justify-center">
                  <p className="text-[11px] text-muted-foreground">Empty</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Application Detail Panel ─────────────────────────────────────────────────

function AppDetailPanel({ app, onClose, onWithdraw, withdrawPending, inline = false }: {
  app: Application;
  onClose: () => void;
  onWithdraw: () => void;
  withdrawPending: boolean;
  inline?: boolean;
}) {
  const [tab, setTab] = useState<'overview' | 'cover' | 'screening'>('overview');
  const a = app as any;
  const canWithdraw = ['pending', 'viewed', 'under_review'].includes(app.status);

  return (
    <>
      {!inline && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-8 w-8 rounded-xl shrink-0">
              <AvatarImage src={app.job?.employer?.companyLogo} />
              <AvatarFallback className="rounded-xl text-xs">{app.job?.employer?.companyName?.[0] ?? '?'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{app.job?.title}</p>
              <p className="text-[11px] text-muted-foreground truncate">{app.job?.employer?.companyName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0 px-2">
        {([
          { id: 'overview',  label: 'Overview',  icon: Eye           },
          { id: 'cover',     label: 'Cover',     icon: FileText      },
          { id: 'screening', label: 'Screening', icon: MessageSquare },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors',
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            <t.icon className="h-3.5 w-3.5" />{t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {tab === 'overview' && (
          <>
            {/* Status badges */}
            <div className="flex gap-2 flex-wrap">
              <Badge className={cn('text-[11px] border', APPLICATION_STATUS_COLOR[app.status])}>
                {APPLICATION_STATUS_LABEL[app.status] ?? app.status}
              </Badge>
              {app.isAutoApplied && (
                <Badge variant="outline" className="text-[11px] text-primary border-primary/30 gap-1">
                  <Zap className="h-3 w-3" /> Auto-applied
                </Badge>
              )}
              {a.matchScore != null && (
                <Badge variant="outline" className="text-[11px] text-success border-success/30 gap-1">
                  <Star className="h-3 w-3" /> {Math.round(a.matchScore * 100)}% match
                </Badge>
              )}
            </div>

            {/* Job details */}
            <div className="rounded-xl bg-surface-raised border border-border p-3 space-y-2">
              {app.job?.location && (
                <InfoRow icon={MapPin} label="Location" value={app.job.location} />
              )}
              {app.job?.jobType && (
                <InfoRow icon={Briefcase} label="Type" value={app.job.jobType.replace('_', ' ')} />
              )}
              {app.job?.salaryRange && (
                <InfoRow icon={AlertCircle} label="Salary" value={formatSalary(app.job.salaryRange)} />
              )}
              <InfoRow icon={Clock} label="Applied" value={timeAgo(app.appliedAt)} />
            </div>

            {/* Employer response */}
            {a.employerResponse && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Employer Feedback</p>
                <p className="text-xs text-foreground bg-surface-raised border border-border rounded-xl p-3 leading-relaxed">{a.employerResponse}</p>
              </div>
            )}

            {/* Notes */}
            {a.notes && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Your Notes</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{a.notes}</p>
              </div>
            )}

            {/* Application method */}
            {a.applicationMethod && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Application Method</p>
                <p className="text-xs text-foreground capitalize">{a.applicationMethod.method ?? JSON.stringify(a.applicationMethod)}</p>
              </div>
            )}
          </>
        )}

        {tab === 'cover' && (
          <>
            {a.coverLetter ? (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cover Letter</p>
                <div className="text-xs text-foreground bg-surface-raised border border-border rounded-xl p-4 leading-relaxed whitespace-pre-wrap">
                  {a.coverLetter}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">No cover letter submitted</p>
              </div>
            )}
          </>
        )}

        {tab === 'screening' && (
          <>
            {a.screeningAnswers && a.screeningAnswers.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Screening Questions & Answers</p>
                {a.screeningAnswers.map((ans: any, i: number) => (
                  <div key={ans.id ?? i} className="rounded-xl bg-surface-raised border border-border p-3 space-y-1">
                    <p className="text-xs font-medium text-foreground">{ans.question ?? ans.screeningQuestion?.question ?? `Q${i + 1}`}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{ans.answer ?? '—'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">No screening answers</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      {canWithdraw && !inline && (
        <div className="border-t border-border p-4 shrink-0">
          <Button variant="outline" size="sm"
            className="w-full gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={onWithdraw} disabled={withdrawPending}>
            {withdrawPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Withdraw Application
          </Button>
        </div>
      )}
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground w-16 shrink-0">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
