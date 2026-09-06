import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pagination } from '@/components/common/Pagination';
import { Sparkles, SlidersHorizontal, MessageSquare, Calendar, X, Send, Video, Phone, Users, Loader2, Search, ArrowUpDown, Lock, Unlock, FileText, Briefcase, GraduationCap, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import DatePicker from '@/components/ui/date-picker';
import TimePicker from '@/components/ui/time-picker';
import { TopBar } from '@/components/common/TopBar';
import { MatchDetailsModal } from '@/components/features/MatchDetailsModal';
import { jobsApi, chatApi } from '@/lib/api';
import { cn, APPLICATION_STATUS_COLOR, APPLICATION_STATUS_LABEL, timeAgo, getInitials, getMatchScoreBadge } from '@/lib/utils';
import type { Application } from '@/types';
import toast from 'react-hot-toast';

// Statuses an employer can move a candidate to. `viewed` is omitted because it
// is set automatically the first time the employer opens the application;
// `interview_scheduled` stays in the list but selecting it opens the scheduling
// modal rather than flipping the status directly (the backend rejects a bare
// set of that status).
const SETTABLE_STATUSES = [
  'pending', 'under_review', 'shortlisted', 'interview_scheduled',
  'offer_extended', 'offer_accepted', 'offer_declined', 'hired', 'rejected',
];

// Always render the application's current status as an option even if it isn't
// employer-settable (e.g. `viewed`, `withdrawn`) — otherwise the <select> shows
// a blank value for those states.
function statusOptions(current?: string): string[] {
  return current && !SETTABLE_STATUSES.includes(current)
    ? [current, ...SETTABLE_STATUSES]
    : SETTABLE_STATUSES;
}

// Statuses the employer can't set by hand — shown (as the current value) but
// disabled in the dropdown.
const NON_SETTABLE = new Set(['viewed', 'withdrawn']);

// Every status a candidate can be in, for the filter dropdown (includes the
// auto/terminal ones an employer can't set but can filter by).
const FILTER_STATUSES = [
  'pending', 'viewed', 'under_review', 'shortlisted', 'interview_scheduled',
  'offer_extended', 'offer_accepted', 'offer_declined', 'hired', 'rejected', 'withdrawn',
];

const INTERVIEW_TYPES = [
  { value: 'video', label: 'Video call', icon: Video },
  { value: 'phone', label: 'Phone call', icon: Phone },
  { value: 'in_person', label: 'In person', icon: Users },
];

type SortKey = 'date' | 'score' | 'name';

export default function CandidatesPage() {
  const { jobId: paramJobId } = useParams();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(paramJobId ?? null);
  const [pickerPage, setPickerPage] = useState(1);
  const PICKER_PER_PAGE = 12;
  const jobId = selectedJobId;

  const [filterStatus, setFilterStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [scheduleApp, setScheduleApp] = useState<Application | null>(null);
  const qc = useQueryClient();

  // When no jobId in URL, fetch job list so user can pick one
  const { data: allJobsRaw, isLoading: allJobsLoading } = useQuery({
    queryKey: ['employer-jobs-candidates-picker'],
    queryFn: () => jobsApi.getEmployerJobs({ limit: 100 }).then(r => r.data.data ?? r.data),
    enabled: !paramJobId,
  });
  const allJobs: any[] = (allJobsRaw as any)?.data ?? allJobsRaw ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['job-applications', jobId, filterStatus],
    queryFn: () => jobsApi.getApplicationsForJob(jobId!, {
      status: filterStatus || undefined,
      limit: 200,
    }).then(r => r.data.data ?? r.data),
    enabled: !!jobId,
  });

  // Also fetch job details to show title + allow status toggle
  const { data: jobData, refetch: refetchJob } = useQuery({
    queryKey: ['employer-job', jobId],
    queryFn: () => jobsApi.get(jobId!).then(r => r.data.data ?? r.data),
    enabled: !!jobId,
  });
  const job = (jobData as any)?.data ?? jobData;

  const { mutate: runScreen, isPending: screening } = useMutation({
    mutationFn: () => jobsApi.screenApplicants(jobId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job-applications', jobId] });
      toast.success('AI screening complete!');
    },
    onError: () => toast.error('Screening failed'),
  });

  const toggleJobStatus = useMutation({
    mutationFn: () => jobsApi.updateJob(jobId!, { status: job?.status === 'active' ? 'closed' : 'active' }),
    onSuccess: () => { refetchJob(); toast.success(job?.status === 'active' ? 'Job closed' : 'Job reopened'); },
    onError: () => toast.error('Failed to update job status'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: string }) =>
      jobsApi.updateApplicationStatus(appId, status as any),
    onSuccess: (_, vars) => {
      const labels: Record<string, string> = {
        shortlisted: 'Moved to Shortlisted',
        interview: 'Interview stage set',
        offered: 'Offer sent',
        hired: 'Marked as Hired 🎉',
        rejected: 'Application rejected',
        under_review: 'Under review',
      };
      toast.success(labels[vars.status] ?? 'Status updated');
      qc.invalidateQueries({ queryKey: ['job-applications', jobId] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  // Selecting "Interview Scheduled" must go through the scheduling modal — the
  // backend refuses a bare status change to it, since the applicant needs the
  // actual date/time/link. Everything else is a direct status update.
  const handleStatusChange = (app: Application, status: string) => {
    if (status === 'interview_scheduled') { setScheduleApp(app); return; }
    updateStatus.mutate({ appId: app.id, status });
  };

  const rawApps: Application[] = (data as any)?.data ?? data ?? [];

  const applications = useMemo(() => {
    let list = rawApps;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a => {
        const name = `${a.applicant?.firstName ?? ''} ${a.applicant?.lastName ?? ''}`.toLowerCase();
        return name.includes(q) || (a.applicant?.email ?? '').toLowerCase().includes(q);
      });
    }
    list = [...list].sort((a, b) => {
      if (sortKey === 'score') return (b.aiMatchScore ?? 0) - (a.aiMatchScore ?? 0);
      if (sortKey === 'name') {
        const na = `${a.applicant?.firstName ?? ''} ${a.applicant?.lastName ?? ''}`;
        const nb = `${b.applicant?.firstName ?? ''} ${b.applicant?.lastName ?? ''}`;
        return na.localeCompare(nb);
      }
      return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
    });
    return list;
  }, [rawApps, search, sortKey]);

  // No jobId in URL and no job selected: show job picker
  if (!paramJobId && !selectedJobId) {
    return (
      <>
        <TopBar title="Candidates" />
        <div className="p-6 max-w-6xl mx-auto w-full">
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-sm text-muted-foreground">Select a job to view its candidates.</p>
            {!allJobsLoading && allJobs.length > 0 && (
              <span className="text-xs text-muted-foreground">{allJobs.length} {allJobs.length === 1 ? 'job' : 'jobs'}</span>
            )}
          </div>
          {allJobsLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-surface border border-border rounded-xl animate-pulse" />)}
            </div>
          ) : allJobs.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-border rounded-2xl">
              <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No jobs posted yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">Post a job to start receiving candidates.</p>
              <Link to="/employer/jobs">
                <button className="text-xs text-primary hover:underline">Go to My Jobs →</button>
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allJobs.slice((pickerPage - 1) * PICKER_PER_PAGE, pickerPage * PICKER_PER_PAGE).map((j: any) => {
                const count = j._count?.applications ?? j.applicationsCount ?? 0;
                return (
                  <button
                    key={j.id}
                    onClick={() => setSelectedJobId(j.id)}
                    className="flex flex-col justify-between bg-surface border border-border rounded-xl p-4 h-28 hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm transition-all text-left group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{j.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className={cn('font-medium', count > 0 && 'text-primary')}>
                          {count} {count === 1 ? 'applicant' : 'applicants'}
                        </span>
                        {j.status && <> · <span className="capitalize">{j.status}</span></>}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <Pagination
            page={pickerPage}
            totalPages={Math.ceil(allJobs.length / PICKER_PER_PAGE)}
            onChange={setPickerPage}
            className="mt-5"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title={job ? job.title : 'Candidates'}
        actions={
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {!paramJobId && selectedJobId && (
              <button
                onClick={() => { setSelectedJobId(null); setSelectedApp(null); }}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0 px-1.5 py-1 rounded-md bg-surface-raised/80"
              >
                ← All Jobs
              </button>
            )}
            {job && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleJobStatus.mutate()}
                disabled={toggleJobStatus.isPending}
                className="text-xs gap-1 px-2 sm:px-3 h-8"
              >
                {(job.jobStatus ?? job.status) === 'posted' || (job.jobStatus ?? job.status) === 'active'
                  ? <><Lock className="h-3.5 w-3.5 text-destructive" /> <span className="hidden sm:inline">Close Job</span></>
                  : <><Unlock className="h-3.5 w-3.5 text-success" /> <span className="hidden sm:inline">Reopen Job</span></>
                }
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => runScreen()}
              disabled={screening}
              className="text-xs gap-1 px-2 sm:px-3 h-8"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="hidden sm:inline">{screening ? 'Screening…' : 'AI Screen All'}</span>
              <span className="sm:hidden">{screening ? '…' : 'AI Screen'}</span>
            </Button>
          </div>
        }
      />

      <div className="flex h-[calc(100vh-112px)] overflow-hidden">
        {/* Candidate list */}
        <div className={cn('flex flex-col border-r border-border', selectedApp ? 'w-80 shrink-0' : 'flex-1')}>
          {/* Filter bar */}
          <div className="px-3 py-2 border-b border-border shrink-0 space-y-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search candidates…"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="flex-1 text-xs bg-transparent outline-none text-muted-foreground border border-border rounded-lg px-2 py-1"
              >
                <option value="">All statuses</option>
                {FILTER_STATUSES.map(s => (
                  <option key={s} value={s}>{APPLICATION_STATUS_LABEL[s]}</option>
                ))}
              </select>
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <select
                value={sortKey}
                onChange={e => setSortKey(e.target.value as SortKey)}
                className="text-xs bg-transparent outline-none text-muted-foreground border border-border rounded-lg px-2 py-1"
              >
                <option value="date">Date</option>
                <option value="score">Match %</option>
                <option value="name">Name</option>
              </select>
            </div>
            {rawApps.length > 0 && (
              <p className="text-[10px] text-muted-foreground">
                {applications.length} of {rawApps.length} candidate{rawApps.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : applications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-sm text-muted-foreground">No candidates yet</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {applications.map(app => (
                  <CandidateRow
                    key={app.id}
                    app={app}
                    selected={selectedApp?.id === app.id}
                    compact={!!selectedApp}
                    onSelect={() => setSelectedApp(selectedApp?.id === app.id ? null : app)}
                    onStatusChange={(status) => handleStatusChange(app, status)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Candidate detail */}
        {selectedApp && (
          <div className="flex-1 overflow-y-auto p-5">
            <CandidateDetail
              app={selectedApp}
              onStatusChange={(status) => {
                if (status === 'interview_scheduled') { setScheduleApp(selectedApp); return; }
                updateStatus.mutate({ appId: selectedApp.id, status });
                setSelectedApp({ ...selectedApp, status: status as import('@/types').ApplicationStatus });
              }}
              onSchedule={() => setScheduleApp(selectedApp)}
              onClose={() => setSelectedApp(null)}
            />
          </div>
        )}
      </div>

      {/* Interview scheduling — reached from either status dropdown or the
          detail panel's Schedule button. scheduleInterview() sets the status
          to interview_scheduled itself, so we only refetch on success. */}
      {scheduleApp && (
        <ScheduleInterviewModal
          open
          onClose={() => setScheduleApp(null)}
          app={scheduleApp}
          applicantName={
            scheduleApp.applicant
              ? `${scheduleApp.applicant.firstName ?? ''} ${scheduleApp.applicant.lastName ?? ''}`.trim() || 'Applicant'
              : 'Applicant'
          }
          onScheduled={() => {
            qc.invalidateQueries({ queryKey: ['job-applications', jobId] });
            if (selectedApp?.id === scheduleApp.id) {
              setSelectedApp({ ...selectedApp, status: 'interview_scheduled' as import('@/types').ApplicationStatus });
            }
            setScheduleApp(null);
          }}
        />
      )}
    </>
  );
}

// ─── Candidate row ────────────────────────────────────────────────────────────

interface CandidateRowProps {
  app: Application;
  selected: boolean;
  compact: boolean;
  onSelect: () => void;
  onStatusChange: (status: string) => void;
}

function CandidateRow({ app, selected, compact, onSelect, onStatusChange }: CandidateRowProps) {
  const applicantName = app.applicant
    ? `${app.applicant.firstName ?? ''} ${app.applicant.lastName ?? ''}`.trim()
    : 'Applicant';

  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-xl border p-3 cursor-pointer transition-colors',
        selected ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-primary/30',
      )}
    >
      <div className="flex items-center gap-2.5">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={app.applicant?.profilePicture} />
          <AvatarFallback className="text-xs">{getInitials(applicantName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{applicantName}</p>
          {!compact && <p className="text-[11px] text-muted-foreground truncate">{app.applicant?.email}</p>}
        </div>
        {(() => {
          const badge = getMatchScoreBadge(app.aiMatchScore);
          if (!badge) return null;
          return (
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm shrink-0', badge.style)}>
              {badge.score}% Match
            </span>
          );
        })()}
      </div>
      {!compact && (
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-muted-foreground">{timeAgo(app.appliedAt)}</span>
          <select
            value={app.status}
            onClick={e => e.stopPropagation()}
            onChange={e => { e.stopPropagation(); onStatusChange(e.target.value); }}
            className="text-[10px] bg-transparent border border-border rounded-lg px-1.5 py-0.5 outline-none cursor-pointer"
          >
            {statusOptions(app.status).map(s => (
              <option key={s} value={s} disabled={NON_SETTABLE.has(s)}>{APPLICATION_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

// ─── Candidate detail ─────────────────────────────────────────────────────────

type DetailTab = 'overview' | 'cover' | 'experience' | 'screening';

function CandidateDetail({ app, onStatusChange, onSchedule, onClose }: {
  app: Application;
  onStatusChange: (s: string) => void;
  onSchedule: () => void;
  onClose: () => void;
}) {
  const [showMessage, setShowMessage] = useState(false);
  const [showMatchDetails, setShowMatchDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  const applicantName = app.applicant
    ? `${app.applicant.firstName ?? ''} ${app.applicant.lastName ?? ''}`.trim()
    : 'Applicant';

  // The submitted CV is the richest source; fall back to its parse blob, then
  // to the applicant's saved profile. Skills may be strings or {skill|name}.
  const cv: any = (app as any).cv ?? {};
  const parsed: any = cv.parsedData ?? {};
  const applicant: any = app.applicant ?? {};
  const skillName = (s: any) => (typeof s === 'string' ? s : s?.skill ?? s?.name ?? '');
  const skills: string[] = (cv.skills ?? parsed.skills ?? applicant.skills ?? []).map(skillName).filter(Boolean);
  const summary: string | undefined = cv.professionalSummary ?? parsed.professionalSummary ?? parsed.summary ?? applicant.professionalSummary;
  const education: any[] = cv.education ?? parsed.education ?? applicant.education ?? [];
  const experience: any[] = cv.experience ?? parsed.experience ?? applicant.workExperience ?? [];
  const cvLink: string | undefined = cv.cvLink ?? applicant.cvLink;
  const coverLetterLink: string | undefined = (app as any).coverLetterLink ?? cv.coverLetterLink;

  const hasCoverLetter = !!app.coverLetter || !!coverLetterLink;
  const hasExperience = experience.length > 0;
  const hasScreening = app.screeningAnswers && Object.keys(app.screeningAnswers).length > 0;

  const tabs: Array<{ id: DetailTab; label: string; show: boolean }> = [
    { id: 'overview', label: 'Overview', show: true },
    { id: 'cover', label: 'Cover Letter', show: hasCoverLetter },
    { id: 'experience', label: 'Experience', show: hasExperience },
    { id: 'screening', label: 'Screening', show: !!hasScreening },
  ].filter(t => t.show) as Array<{ id: DetailTab; label: string; show: boolean }>;

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={app.applicant?.profilePicture} />
          <AvatarFallback>{getInitials(applicantName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-semibold text-base">{applicantName}</h2>
          <p className="text-sm text-muted-foreground">{app.applicant?.email}</p>
          {(app.applicant as any)?.professionalTitle && (
            <p className="text-xs text-muted-foreground">{(app.applicant as any).professionalTitle}</p>
          )}
          {(applicant.city || applicant.country) && (
            <p className="text-xs text-muted-foreground mt-0.5">{[applicant.city, applicant.country].filter(Boolean).join(', ')}</p>
          )}
          {applicant.phoneNumber && <p className="text-xs text-muted-foreground">{applicant.phoneNumber}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {cvLink && (
              <a href={cvLink} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary border border-primary/30 bg-primary/5 rounded-lg px-2 py-1 hover:bg-primary/10">
                <FileText className="h-3 w-3" /> View CV
              </a>
            )}
            <Link to={`/profile/applicant/${app.applicantId}`} target="_blank"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground border border-border rounded-lg px-2 py-1 hover:text-foreground hover:border-primary/30">
              <Users className="h-3 w-3" /> Full profile
            </Link>
            {applicant.linkedInProfile && (
              <a href={applicant.linkedInProfile} target="_blank" rel="noreferrer"
                className="text-[11px] font-medium text-muted-foreground border border-border rounded-lg px-2 py-1 hover:text-foreground hover:border-primary/30">
                LinkedIn
              </a>
            )}
          </div>
        </div>
        {(() => {
          const badge = getMatchScoreBadge(app.aiMatchScore);
          if (!badge) return null;
          return (
            <button
              onClick={() => setShowMatchDetails(true)}
              className={cn('text-center px-3.5 py-2 rounded-2xl border shadow-sm shrink-0 transition-transform hover:scale-105 cursor-pointer', badge.style)}
              title="Click to view full match breakdown"
            >
              <p className="text-xl font-extrabold font-['Outfit',sans-serif] leading-tight">{badge.score}%</p>
              <p className="text-[10px] font-semibold opacity-90">{badge.labelText}</p>
              <span className="text-[9px] underline block mt-0.5 opacity-80">View Details</span>
            </button>
          );
        })()}
      </div>

      {/* Status change */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Application status</p>
        <select
          value={app.status}
          onChange={e => onStatusChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-1 focus:ring-primary/50"
        >
          {statusOptions(app.status).map(s => (
            <option key={s} value={s} disabled={NON_SETTABLE.has(s)}>{APPLICATION_STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="flex border-b border-border gap-1">
          {tabs.map((t: { id: DetailTab; label: string; show: boolean }) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'text-xs px-3 py-2 border-b-2 transition-colors',
                activeTab === t.id
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'overview' && (
        <>
          {/* Summary */}
          {summary && (
            <div>
              <p className="text-xs font-semibold mb-2">Summary</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2">Skills <span className="text-muted-foreground font-normal">({skills.length})</span></p>
              <div className="flex flex-wrap gap-1.5">
                {skills.slice(0, 30).map((s, i) => (
                  <Badge key={`${s}-${i}`} variant="outline" className="text-xs">{s}</Badge>
                ))}
                {skills.length > 30 && <Badge variant="outline" className="text-xs text-muted-foreground">+{skills.length - 30}</Badge>}
              </div>
            </div>
          )}

          {/* Education */}
          {education.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold">Education</p>
              </div>
              <div className="space-y-2">
                {education.slice(0, 3).map((edu: any, i: number) => (
                  <div key={i} className="bg-surface-raised rounded-lg p-3">
                    <p className="text-xs font-medium">{[edu.degree, edu.fieldOfStudy ?? edu.field].filter(Boolean).join(' in ')}</p>
                    <p className="text-[11px] text-muted-foreground">{edu.institution}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{edu.startDate} — {edu.endDate || 'Present'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auto-applied notice */}
          {app.isAutoApplied && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-surface-raised rounded-lg p-3">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
              Auto-applied via AI job matching
            </div>
          )}
        </>
      )}

      {activeTab === 'cover' && (
        <div>
          <p className="text-xs font-semibold mb-2">Cover Letter</p>
          {app.coverLetter ? (
            <div className="bg-surface-raised rounded-lg p-4">
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{app.coverLetter}</p>
            </div>
          ) : coverLetterLink ? (
            <a href={coverLetterLink} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/30 bg-primary/5 rounded-lg px-3 py-2 hover:bg-primary/10">
              <FileText className="h-3.5 w-3.5" /> Open submitted cover letter
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">No cover letter submitted.</p>
          )}
        </div>
      )}

      {activeTab === 'experience' && (
        <div className="space-y-3">
          {experience.map((exp: any, i: number) => (
            <div key={i} className="bg-surface-raised rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold">{exp.title ?? exp.position}</p>
                  <p className="text-[11px] text-muted-foreground">{exp.company}{exp.location ? ` · ${exp.location}` : ''}</p>
                </div>
                <p className="text-[10px] text-muted-foreground shrink-0">{exp.startDate} — {exp.endDate || 'Present'}</p>
              </div>
              {exp.description && (
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{exp.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'screening' && hasScreening && (
        <div className="space-y-3">
          {Object.entries(app.screeningAnswers!).map(([q, a]) => (
            <div key={q} className="bg-surface border border-border rounded-lg p-3">
              <p className="text-xs font-medium mb-1">{q}</p>
              <p className="text-xs text-muted-foreground">{a as string}</p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline" size="sm"
          className="flex-1 text-xs gap-1.5"
          onClick={() => setShowMessage(true)}
        >
          <MessageSquare className="h-3.5 w-3.5" /> Message
        </Button>
        <Button
          size="sm"
          className="flex-1 text-xs gap-1.5"
          onClick={onSchedule}
        >
          <Calendar className="h-3.5 w-3.5" /> Schedule Interview
        </Button>
      </div>

      {/* Modals */}
      <MessageModal
        open={showMessage}
        onClose={() => setShowMessage(false)}
        app={app}
        applicantName={applicantName}
      />
      <MatchDetailsModal
        isOpen={showMatchDetails}
        onClose={() => setShowMatchDetails(false)}
        applicantId={(app.applicant as any)?.id ?? (app as any).applicantId ?? ''}
        jobId={app.jobId ?? (app as any).job?.id ?? ''}
        applicantName={applicantName}
      />
    </div>
  );
}

// ─── Message modal ────────────────────────────────────────────────────────────

function MessageModal({ open, onClose, app, applicantName }: {
  open: boolean;
  onClose: () => void;
  app: Application;
  applicantName: string;
}) {
  const [message, setMessage] = useState('');

  const send = useMutation({
    mutationFn: async () => {
      const recipientId = (app.applicant as any)?.id ?? (app as any).applicantId;
      const conv = await chatApi.startDirect(recipientId);
      const convId = conv.data?.id ?? conv.data?.data?.id;
      await chatApi.sendMessage(convId, message);
    },
    onSuccess: () => {
      toast.success('Message sent!');
      setMessage('');
      onClose();
    },
    onError: () => toast.error('Failed to send message'),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Message {applicantName}</DialogTitle>
          <p className="text-xs text-muted-foreground">{app.applicant?.email}</p>
        </DialogHeader>
        <DialogBody>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Write your message…"
            rows={5}
            className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => send.mutate()}
            disabled={!message.trim() || send.isPending}
          >
            {send.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
            <Send className="h-3.5 w-3.5 mr-2" /> Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Schedule interview modal ─────────────────────────────────────────────────

function ScheduleInterviewModal({ open, onClose, app, applicantName, onScheduled }: {
  open: boolean;
  onClose: () => void;
  app: Application;
  applicantName: string;
  onScheduled: () => void;
}) {
  const [interviewDate, setInterviewDate] = useState<Date | null>(null);
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewType, setInterviewType] = useState<'video' | 'phone' | 'in_person'>('video');
  const [meetingLink, setMeetingLink] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const schedule = useMutation({
    mutationFn: () => jobsApi.scheduleInterview(app.id, {
      date: interviewDate?.toISOString().slice(0, 10),
      time: interviewTime,
      type: interviewType,
      meetingLink: interviewType === 'video' ? (meetingLink || undefined) : undefined,
      location: interviewType === 'in_person' ? (location || undefined) : undefined,
      notes: notes || undefined,
    }),
    onSuccess: () => {
      onScheduled();
      toast.success('Interview scheduled!');
      onClose();
    },
    onError: () => {
      toast.error('Failed to schedule interview');
    },
  });

  const canSubmit = !!interviewDate && !!interviewTime;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
          <p className="text-xs text-muted-foreground">with {applicantName}</p>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Interview type */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Interview type</p>
            <div className="grid grid-cols-3 gap-2">
              {INTERVIEW_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setInterviewType(value as any)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 text-xs font-medium transition-colors',
                    interviewType === value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Date and time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Date <span className="text-destructive">*</span></p>
              <DatePicker
                selectedDate={interviewDate}
                onDateChange={d => setInterviewDate(d)}
                placeholder="Pick a date"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Time <span className="text-destructive">*</span></p>
              <TimePicker
                value={interviewTime}
                onChange={setInterviewTime}
                placeholder="Pick a time"
              />
            </div>
          </div>

          {/* Meeting link (for video) */}
          {interviewType === 'video' && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Meeting link</p>
              <Input
                value={meetingLink}
                onChange={e => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/… or Zoom link"
              />
            </div>
          )}

          {/* Location (for in person) */}
          {interviewType === 'in_person' && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Location</p>
              <Input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Office address or where to meet"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Notes for candidate <span className="text-[11px] text-muted-foreground/60">(optional)</span></p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any preparation instructions or context for the candidate…"
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => schedule.mutate()}
            disabled={!canSubmit || schedule.isPending}
          >
            {schedule.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
            <Calendar className="h-3.5 w-3.5 mr-2" /> Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
