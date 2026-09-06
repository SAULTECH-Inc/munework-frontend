import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpDown, Briefcase, Building2, Calendar, Edit2, ExternalLink, MapPin, PlusCircle,
  Search, ToggleLeft, ToggleRight, Trash2, Users, X, Clock, ChevronRight, Eye,
  DollarSign, Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TopBar } from '@/components/common/TopBar';
import { PostJobModal } from './PostJobModal';
import { jobsApi } from '@/lib/api';
import { Pagination } from '@/components/common/Pagination';
import { cn, timeAgo, JOB_TYPE_LABEL, formatSalary } from '@/lib/utils';
import type { Job, JobStatus } from '@/types';
import toast from 'react-hot-toast';

type TabStatus = 'all' | JobStatus;
type SortKey = 'date' | 'applicants' | 'deadline' | 'title';

const TABS: Array<{ id: TabStatus; label: string }> = [
  { id: 'all',    label: 'All' },
  { id: 'posted', label: 'Active' },
  { id: 'draft',  label: 'Draft' },
  { id: 'paused', label: 'Paused' },
  { id: 'closed', label: 'Closed' },
];

const STATUS_STYLE: Record<string, string> = {
  posted: 'bg-success/10 text-success border-success/20',
  active: 'bg-success/10 text-success border-success/20',
  draft:  'bg-border text-muted-foreground',
  paused: 'bg-warning/10 text-warning border-warning/20',
  closed: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function EmployerJobsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [postJobOpen, setPostJobOpen] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState<TabStatus>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['employer-jobs-all'],
    queryFn: () => jobsApi.getEmployerJobs({ limit: 200 }).then(r => r.data.data ?? r.data),
  });

  const allJobs: Job[] = useMemo(() => {
    const raw = (data as any)?.data ?? data ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [data]);

  const toggleStatus = useMutation({
    mutationFn: (job: Job) => {
      const current = job.jobStatus ?? job.status;
      return jobsApi.updateJob(job.id, { jobStatus: current === 'posted' ? 'paused' : 'posted' });
    },
    onSuccess: (_, job) => {
      const current = job.jobStatus ?? job.status;
      toast.success(current === 'posted' ? 'Job paused' : 'Job re-activated');
      qc.invalidateQueries({ queryKey: ['employer-jobs-all'] });
    },
    onError: () => toast.error('Failed to update job status'),
  });

  const deleteJob = useMutation({
    mutationFn: (id: string) => jobsApi.deleteJob(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employer-jobs-all'] });
      toast.success('Job deleted');
    },
    onError: () => toast.error('Failed to delete job'),
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allJobs.length };
    for (const j of allJobs) {
      const s = j.jobStatus ?? j.status ?? '';
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [allJobs]);

  const jobs = useMemo(() => {
    let list = allJobs;
    if (activeTab !== 'all') list = list.filter(j => (j.jobStatus ?? j.status) === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(j =>
        j.title.toLowerCase().includes(q) ||
        (j.location ?? '').toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sortKey === 'applicants') return (b._count?.applications ?? 0) - (a._count?.applications ?? 0);
      if (sortKey === 'title') return a.title.localeCompare(b.title);
      if (sortKey === 'deadline') {
        const da = a.endDate ? new Date(a.endDate).getTime() : Infinity;
        const db = b.endDate ? new Date(b.endDate).getTime() : Infinity;
        return da - db;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [allJobs, activeTab, search, sortKey]);

  // Keep the page in range as the filtered set changes.
  const totalPages = Math.max(1, Math.ceil(jobs.length / PER_PAGE));
  const pagedJobs = jobs.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  if (page > totalPages && page !== 1) setPage(1);

  return (
    <>
      <TopBar
        title="My Jobs"
        actions={
          <Button size="sm" onClick={() => setPostJobOpen(true)}>
            <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Post a Job
          </Button>
        }
      />

      {/* Status tabs */}
      <div className="border-b border-border/60 bg-surface/70 backdrop-blur-sm shrink-0">
        <div className="flex px-5 gap-0.5 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 text-xs px-3 py-3 border-b-2 whitespace-nowrap transition-all duration-150',
                activeTab === tab.id
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
              {counts[tab.id] != null && counts[tab.id] > 0 && (
                <span className={cn(
                  'text-[10px] rounded-full px-1.5 py-0.5 font-bold',
                  activeTab === tab.id
                    ? 'bg-primary/15 text-primary shadow-[0_0_6px_hsl(262_83%_58%/0.2)]'
                    : 'bg-surface-raised text-muted-foreground',
                )}>
                  {counts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 max-w-5xl mx-auto space-y-4">
        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs by title or location…"
              className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-border/60 bg-surface/80 text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all placeholder:text-muted-foreground"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 border border-border/60 rounded-xl px-3 py-2.5 bg-surface/80 shrink-0">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              className="text-xs bg-transparent outline-none text-muted-foreground cursor-pointer"
            >
              <option value="date">Date posted</option>
              <option value="applicants">Most applicants</option>
              <option value="deadline">Deadline</option>
              <option value="title">Title A–Z</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        {!isLoading && (
          <p className="text-xs text-muted-foreground">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''}
            {search ? ` matching "${search}"` : ''}
          </p>
        )}

        {/* Jobs list */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-sm text-muted-foreground mb-3">
              {search ? `No jobs matching "${search}"` : activeTab !== 'all' ? `No ${activeTab} jobs` : 'No jobs posted yet'}
            </p>
            {activeTab === 'all' && !search && (
              <Button onClick={() => setPostJobOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" /> Post your first job
              </Button>
            )}
            {search && (
              <Button variant="ghost" size="sm" onClick={() => setSearch('')}>Clear search</Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {pagedJobs.map(job => (
              <JobRow
                key={job.id}
                job={job}
                onClick={() => setDetailJob(job)}
                onEdit={(e) => { e.stopPropagation(); setEditJob(job); }}
                onToggle={(e) => { e.stopPropagation(); toggleStatus.mutate(job); }}
                onDelete={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${job.title}"? This cannot be undone.`)) deleteJob.mutate(job.id);
                }}
                toggling={toggleStatus.isPending && (toggleStatus.variables as Job)?.id === job.id}
                deleting={deleteJob.isPending && deleteJob.variables === job.id}
              />
            ))}
            <Pagination page={page} totalPages={totalPages} onChange={setPage} className="mt-4" />
          </div>
        )}
      </div>

      <PostJobModal
        open={postJobOpen || !!editJob}
        editJob={editJob ?? undefined}
        onClose={() => { setPostJobOpen(false); setEditJob(null); }}
      />

      {/* Job Detail Panel */}
      {detailJob && (
        <JobDetailPanel
          job={detailJob}
          onClose={() => setDetailJob(null)}
          onEdit={() => { setDetailJob(null); setEditJob(detailJob); }}
          onViewCandidates={() => navigate(`/employer/jobs/${detailJob.id}/candidates`)}
          onToggle={() => toggleStatus.mutate(detailJob)}
          toggling={toggleStatus.isPending && (toggleStatus.variables as Job)?.id === detailJob.id}
        />
      )}
    </>
  );
}

// ─── Job Row ──────────────────────────────────────────────────────────────────

function JobRow({
  job, onClick, onEdit, onToggle, onDelete, toggling, deleting,
}: {
  job: Job;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onToggle: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  toggling: boolean;
  deleting: boolean;
}) {
  const jobStatus  = job.jobStatus ?? job.status ?? '';
  const applicantCount = (job as any).applicantCount ?? (job as any).applicationsCount ?? job._count?.applications ?? 0;
  const isExpiring = job.endDate
    ? (new Date(job.endDate).getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000
    : false;

  return (
    <div
      onClick={onClick}
      className="glass rounded-2xl border border-border/50 p-5 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(0,0,0,0.15)] transition-all duration-200 cursor-pointer group w-full"
    >
      <div className="flex items-start gap-4">
        {/* Company logo placeholder */}
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center shrink-0 border border-border/40">
          <Briefcase className="h-5 w-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Title + status */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold group-hover:text-primary transition-colors truncate">{job.title}</p>
              {job.company && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3" /> {job.company}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={cn(
                'text-xs font-semibold border rounded-full px-3 py-1 capitalize',
                STATUS_STYLE[jobStatus] ?? 'bg-border text-muted-foreground',
              )}>
                {jobStatus === 'posted' ? 'Active' : jobStatus}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

          {/* Meta chips */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {job.location && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-surface-raised border border-border/40 rounded-lg px-2 py-1">
                <MapPin className="h-3 w-3" /> {job.location}
              </span>
            )}
            {job.jobType && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-surface-raised border border-border/40 rounded-lg px-2 py-1">
                <Tag className="h-3 w-3" /> {JOB_TYPE_LABEL[job.jobType] ?? job.jobType}
              </span>
            )}
            {job.employmentType && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-surface-raised border border-border/40 rounded-lg px-2 py-1 capitalize">
                <Clock className="h-3 w-3" /> {job.employmentType}
              </span>
            )}
            {(job as any).salaryRange && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-surface-raised border border-border/40 rounded-lg px-2 py-1">
                <DollarSign className="h-3 w-3" /> {formatSalary((job as any).salaryRange)}
              </span>
            )}
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border/30">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                <Users className="h-3.5 w-3.5" />
                {applicantCount} applicant{applicantCount !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" /> Posted {timeAgo(job.createdAt)}
              </span>
              {job.endDate && (
                <span className={cn(
                  'flex items-center gap-1 text-xs',
                  isExpiring ? 'text-warning font-medium' : 'text-muted-foreground',
                )}>
                  Deadline: {new Date(job.endDate).toLocaleDateString()}
                  {isExpiring && <span className="ml-1 text-[10px] bg-warning/10 text-warning border border-warning/20 rounded-full px-1.5 py-0.5 font-bold">Expiring soon</span>}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <Link
                to={`/jobs/${job.id}`}
                title="Preview public listing"
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>

              <Button
                variant="ghost"
                size="icon"
                title={jobStatus === 'posted' ? 'Pause job' : 'Activate job'}
                onClick={onToggle}
                disabled={toggling || jobStatus === 'draft' || jobStatus === 'closed'}
                className={cn(
                  'h-7 w-7',
                  jobStatus === 'posted' ? 'text-success' : 'text-muted-foreground',
                )}
              >
                {jobStatus === 'posted'
                  ? <ToggleRight className="h-4 w-4" />
                  : <ToggleLeft className="h-4 w-4" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                title="Edit"
                onClick={onEdit}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                title="Delete"
                disabled={deleting}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Job Detail Panel ─────────────────────────────────────────────────────────

function JobDetailPanel({
  job, onClose, onEdit, onViewCandidates, onToggle, toggling,
}: {
  job: Job;
  onClose: () => void;
  onEdit: () => void;
  onViewCandidates: () => void;
  onToggle: () => void;
  toggling: boolean;
}) {
  const jobStatus = job.jobStatus ?? job.status ?? '';
  const applicantCount = (job as any).applicantCount ?? (job as any).applicationsCount ?? job._count?.applications ?? 0;
  const isExpiring = job.endDate
    ? (new Date(job.endDate).getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000
    : false;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Centered modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
        <div className="relative w-full max-w-2xl bg-surface border border-border/60 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] my-auto">
          {/* Header */}
          <div className="flex items-start gap-3 p-5 border-b border-border/40 shrink-0">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center shrink-0 border border-border/40">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-base leading-tight">{job.title}</h2>
              {job.company && (
                <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {job.company}
                </p>
              )}
              <span className={cn(
                'inline-flex mt-1.5 text-xs font-semibold border rounded-full px-2.5 py-0.5 capitalize',
                STATUS_STYLE[jobStatus] ?? 'bg-border text-muted-foreground',
              )}>
                {jobStatus === 'posted' ? 'Active' : jobStatus}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 divide-x divide-border/40 border-b border-border/40 shrink-0">
            {[
              { label: 'Applicants', value: applicantCount, icon: Users, color: 'text-primary' },
              { label: 'Posted', value: timeAgo(job.createdAt), icon: Calendar, color: 'text-muted-foreground' },
              { label: 'Deadline', value: job.endDate ? new Date(job.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—', icon: Clock, color: isExpiring ? 'text-warning' : 'text-muted-foreground' },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center py-3 px-2">
                <s.icon className={cn('h-4 w-4 mb-1', s.color)} />
                <p className={cn('text-sm font-bold', s.color)}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Meta chips */}
            <div className="flex flex-wrap gap-2">
              {job.location && (
                <span className="flex items-center gap-1.5 text-xs bg-surface-raised border border-border/50 rounded-xl px-3 py-1.5">
                  <MapPin className="h-3 w-3 text-muted-foreground" /> {job.location}
                </span>
              )}
              {job.jobType && (
                <span className="flex items-center gap-1.5 text-xs bg-surface-raised border border-border/50 rounded-xl px-3 py-1.5">
                  <Tag className="h-3 w-3 text-muted-foreground" /> {JOB_TYPE_LABEL[job.jobType] ?? job.jobType}
                </span>
              )}
              {job.employmentType && (
                <span className="flex items-center gap-1.5 text-xs bg-surface-raised border border-border/50 rounded-xl px-3 py-1.5 capitalize">
                  <Clock className="h-3 w-3 text-muted-foreground" /> {job.employmentType}
                </span>
              )}
              {(job as any).salaryRange && (
                <span className="flex items-center gap-1.5 text-xs bg-surface-raised border border-border/50 rounded-xl px-3 py-1.5">
                  <DollarSign className="h-3 w-3 text-muted-foreground" /> {formatSalary((job as any).salaryRange)}
                </span>
              )}
            </div>

            {/* Description */}
            {job.description && (
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">About this role</h3>
                <div
                  className="text-sm text-foreground/80 leading-relaxed [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:text-sm [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: job.description }}
                />
              </div>
            )}

            {/* Requirements */}
            {job.requirements && (
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Requirements</h3>
                <div
                  className="text-sm text-foreground/80 leading-relaxed [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:text-sm [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: job.requirements }}
                />
              </div>
            )}

            {/* Skills */}
            {(job as any).skillSet?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(job as any).skillSet.map((s: string) => (
                    <span key={s} className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-lg px-2.5 py-1">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-border/40 shrink-0 flex flex-col gap-2">
            <Button className="w-full" onClick={onViewCandidates}>
              <Users className="h-4 w-4 mr-2" /> View Candidates ({applicantCount})
            </Button>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" className="text-xs" onClick={onEdit}>
                <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit Job
              </Button>
              <Button
                variant="outline"
                className={cn('text-xs', jobStatus === 'posted' ? 'text-warning border-warning/30' : 'text-success border-success/30')}
                onClick={onToggle}
                disabled={toggling || jobStatus === 'draft' || jobStatus === 'closed'}
              >
                {jobStatus === 'posted'
                  ? <><ToggleLeft className="h-3.5 w-3.5 mr-1.5" /> Pause</>
                  : <><ToggleRight className="h-3.5 w-3.5 mr-1.5" /> Activate</>}
              </Button>
              <Button variant="outline" className="text-xs" asChild>
                <Link to={`/jobs/${job.id}`} target="_blank">
                  <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

