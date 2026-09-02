import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin, Clock, Briefcase, DollarSign, Globe, Bookmark, BookmarkCheck,
  Share2, ArrowLeft, AlertCircle, Building2, Users, Calendar, CheckCircle2,
  Sparkles, Tag, ChevronRight, Zap, ExternalLink, Star,
} from 'lucide-react';
import { TopBar } from '@/components/common/TopBar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { QuickApplyModal } from '@/pages/jobs/QuickApplyModal';
import { jobsApi } from '@/lib/api';
import { cn, formatSalary, timeAgo, JOB_TYPE_LABEL, EMPLOYMENT_TYPE_LABEL, LEVEL_LABEL, getMatchScoreBadge } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useSeo, useJsonLd } from '@/lib/seo';
import type { Job } from '@/types';
import toast from 'react-hot-toast';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest shrink-0">{children}</h2>
      <div className="h-px flex-1 bg-gradient-to-l from-primary/30 to-transparent" />
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, highlight }: {
  icon: React.ElementType; label: string; value?: string | null; highlight?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0 text-primary/60" />
        {label}
      </div>
      <span className={cn('text-xs font-semibold capitalize', highlight ? 'text-primary' : 'text-foreground')}>
        {value}
      </span>
    </div>
  );
}

function Chip({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'primary' | 'success' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-xs font-medium rounded-xl px-3 py-1.5 border',
      variant === 'primary'
        ? 'bg-primary/10 text-primary border-primary/20'
        : variant === 'success'
        ? 'bg-success/10 text-success border-success/20'
        : 'bg-surface-raised text-muted-foreground border-border/50',
    )}>
      {children}
    </span>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [applyOpen, setApplyOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 180);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const { data: job, isLoading, isError } = useQuery<Job>({
    queryKey: ['job', id],
    queryFn: () => jobsApi.get(id!).then(r => r.data.data ?? r.data),
    enabled: !!id,
  });

  const companyName = job?.company ?? (job?.employer as any)?.companyName ?? '';

  useSeo({
    title: job ? `${job.title}${companyName ? ` at ${companyName}` : ''} | Mune Work` : 'Job | Mune Work',
    description: job
      ? (job.description ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155)
        || `${job.title} — apply on Mune Work.`
      : undefined,
    type: 'article',
  });

  // JobPosting is what puts a listing into the Google Jobs carousel, which is
  // the main organic channel for a job board. Google requires title,
  // description, datePosted and hiringOrganization at minimum.
  useJsonLd(job ? {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description ?? job.responsibility ?? job.title,
    datePosted: job.createdAt,
    validThrough: job.endDate ?? undefined,
    employmentType: job.employmentType ?? job.jobType ?? undefined,
    hiringOrganization: companyName ? {
      '@type': 'Organization',
      name: companyName,
      logo: (job.employer as any)?.companyLogo ?? undefined,
    } : undefined,
    jobLocation: job.location ? {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: job.location },
    } : undefined,
    directApply: true,
  } : null);

  const toggleBookmark = useMutation({
    mutationFn: () => jobsApi.toggleBookmark(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job', id] });
      toast.success(job?.isBookmarked ? 'Bookmark removed' : 'Job bookmarked!');
    },
  });

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  if (isLoading) {
    return (
      <>
        <TopBar title="Job Details" />
        <div className="p-6 max-w-5xl mx-auto space-y-5">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-52 rounded-2xl" />
          <div className="grid lg:grid-cols-[1fr_300px] gap-5">
            <div className="space-y-4">
              <Skeleton className="h-72 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-36 rounded-2xl" />
              <Skeleton className="h-52 rounded-2xl" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (isError || !job) {
    return (
      <>
        <TopBar title="Job Details" />
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="h-20 w-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-destructive/50" />
          </div>
          <p className="text-sm text-muted-foreground">Job not found or could not be loaded.</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/jobs')}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Jobs
          </Button>
        </div>
      </>
    );
  }

  const isApplicant = user?.userType === 'applicant';
  const matchBadge = (job as any).aiMatchScore != null ? getMatchScoreBadge((job as any).aiMatchScore) : null;
  const isExpiring = job.endDate ? (new Date(job.endDate).getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000 : false;
  const htmlClasses = "text-sm text-foreground/80 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:text-sm [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-foreground [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1.5";

  return (
    <>
      <TopBar title={job.title} />

      {/* Sticky apply bar */}
      {isApplicant && (
        <div className={cn(
          'fixed top-0 left-0 right-0 z-30 bg-surface/90 backdrop-blur-md border-b border-border/50 px-6 py-3 flex items-center justify-between gap-4 transition-all duration-300',
          scrolled ? 'translate-y-0 opacity-100 shadow-lg' : '-translate-y-full opacity-0 pointer-events-none',
        )}>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{job.title}</p>
            <p className="text-xs text-muted-foreground">{job.employer?.companyName}</p>
          </div>
          <Button size="sm" onClick={() => setApplyOpen(true)} disabled={job.hasApplied} className="shrink-0">
            {job.hasApplied ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Applied</> : 'Apply Now'}
          </Button>
        </div>
      )}

      <div className="p-5 max-w-5xl mx-auto space-y-5">

        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back
        </button>

        {/* Hero card */}
        <div className="glass rounded-2xl border border-border/50 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary/25 via-accent/10 to-primary/5 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(262_83%_58%/0.18),transparent_60%)]" />
            {isExpiring && (
              <span className="absolute top-3 right-3 text-[10px] font-bold bg-warning text-warning-foreground rounded-full px-2.5 py-1">
                ⚡ Expiring Soon
              </span>
            )}
          </div>

          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-8 mb-4">
              <Avatar className="h-16 w-16 rounded-2xl ring-4 ring-surface shadow-xl shrink-0">
                <AvatarImage src={job.employer?.companyLogo} />
                <AvatarFallback className="rounded-2xl text-xl font-black bg-gradient-to-br from-primary/30 to-accent/20 text-primary">
                  {job.employer?.companyName?.[0] ?? 'C'}
                </AvatarFallback>
              </Avatar>
              {matchBadge && (
                <div className={cn('text-center px-3 py-1.5 rounded-xl border shadow-sm ml-auto mb-1', matchBadge.style)}>
                  <p className="text-lg font-extrabold leading-tight">{matchBadge.score}%</p>
                  <p className="text-[9px] font-semibold opacity-90">{matchBadge.labelText}</p>
                </div>
              )}
            </div>

            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-black text-foreground leading-tight">{job.title}</h1>
                <button
                  onClick={() => job.employer?.id && navigate(`/profile/employer/${job.employer.id}`)}
                  className="text-sm text-primary hover:underline mt-1 flex items-center gap-1 font-medium"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  {job.employer?.companyName ?? job.company}
                  <ChevronRight className="h-3 w-3 opacity-60" />
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isApplicant && (
                  <button
                    onClick={() => toggleBookmark.mutate()}
                    className={cn(
                      'p-2 rounded-xl border transition-all duration-200',
                      job.isBookmarked
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-surface-raised border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary',
                    )}
                  >
                    {job.isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  </button>
                )}
                <button onClick={handleShare} className="p-2 rounded-xl border bg-surface-raised border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary transition-all duration-200">
                  <Share2 className="h-4 w-4" />
                </button>
                {isApplicant && (
                  <Button
                    onClick={() => setApplyOpen(true)}
                    disabled={job.hasApplied}
                    className={cn('gap-2 font-bold px-5', job.hasApplied && 'bg-success/20 text-success border border-success/30 hover:bg-success/20')}
                  >
                    {job.hasApplied ? <><CheckCircle2 className="h-4 w-4" />Applied</> : <><Zap className="h-4 w-4" />Apply Now</>}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {job.location && <Chip><MapPin className="h-3 w-3" />{job.location}</Chip>}
              {job.jobType && <Chip><Briefcase className="h-3 w-3" />{JOB_TYPE_LABEL[job.jobType] ?? job.jobType}</Chip>}
              {job.employmentType && <Chip><Tag className="h-3 w-3" />{EMPLOYMENT_TYPE_LABEL[job.employmentType] ?? job.employmentType}</Chip>}
              {job.level && <Chip><Star className="h-3 w-3" />{LEVEL_LABEL[job.level] ?? job.level}</Chip>}
              {job.salaryRange && <Chip variant="primary"><DollarSign className="h-3 w-3" />{formatSalary(job.salaryRange)}</Chip>}
              <Chip><Clock className="h-3 w-3" />{timeAgo(job.createdAt)}</Chip>
              {job.endDate && (
                <Chip variant={isExpiring ? 'success' : 'default'}>
                  <Calendar className="h-3 w-3" />Deadline: {new Date(job.endDate).toLocaleDateString()}
                </Chip>
              )}
            </div>
          </div>
        </div>

        {/* Body grid */}
        <div className="grid lg:grid-cols-[1fr_300px] gap-5 items-start">
          <div className="space-y-4">
            {job.description && (
              <div className="glass rounded-2xl border border-border/50 p-6">
                <SectionHeading>Job Description</SectionHeading>
                <div className={htmlClasses} dangerouslySetInnerHTML={{ __html: job.description }} />
              </div>
            )}

            {job.requirements && (
              <div className="glass rounded-2xl border border-border/50 p-6">
                <SectionHeading>Requirements</SectionHeading>
                <div className={htmlClasses} dangerouslySetInnerHTML={{ __html: job.requirements }} />
              </div>
            )}

            {job.responsibility && (
              <div className="glass rounded-2xl border border-border/50 p-6">
                <SectionHeading>Responsibilities</SectionHeading>
                <div className={htmlClasses} dangerouslySetInnerHTML={{ __html: job.responsibility }} />
              </div>
            )}

            {job.skillSet && job.skillSet.length > 0 && (
              <div className="glass rounded-2xl border border-border/50 p-6">
                <SectionHeading>Required Skills</SectionHeading>
                <div className="flex flex-wrap gap-2">
                  {job.skillSet.map((skill: string, i: number) => (
                    <span key={i} className="text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-xl px-3 py-1.5 hover:bg-primary/15 transition-colors">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {isApplicant && (
              <div className="glass rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{job.hasApplied ? 'Application submitted ✓' : 'Ready to apply?'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {job.hasApplied ? "You've already applied. We'll keep you updated." : 'Apply in under 2 minutes using your saved CV and cover letter.'}
                  </p>
                </div>
                <Button onClick={() => setApplyOpen(true)} disabled={job.hasApplied} size="sm" className="shrink-0">
                  {job.hasApplied ? 'Applied' : 'Apply Now'}
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 lg:sticky lg:top-5">
            {job.employer && (
              <div className="glass rounded-2xl border border-border/50 p-5 space-y-4">
                <SectionHeading>About the Company</SectionHeading>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 rounded-xl ring-1 ring-border/40">
                    <AvatarImage src={job.employer.companyLogo} />
                    <AvatarFallback className="rounded-xl font-black text-lg bg-gradient-to-br from-primary/20 to-accent/10 text-primary">
                      {job.employer.companyName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground truncate">{job.employer.companyName}</p>
                    {job.employer.industry && <p className="text-xs text-muted-foreground truncate">{job.employer.industry}</p>}
                  </div>
                </div>
                {(job.employer as any).companyDescription && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{(job.employer as any).companyDescription}</p>
                )}
                {job.employer.website && (
                  <a href={job.employer.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors">
                    <Globe className="h-3.5 w-3.5" />
                    {job.employer.website.replace(/^https?:\/\//, '')}
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                )}
                {job.employer.id && (
                  <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={() => navigate(`/profile/employer/${job.employer!.id}`)}>
                    <Building2 className="h-3.5 w-3.5 mr-1.5" />View Company Profile
                  </Button>
                )}
              </div>
            )}

            <div className="glass rounded-2xl border border-border/50 p-5">
              <SectionHeading>Job Details</SectionHeading>
              <div>
                <DetailRow icon={Briefcase} label="Job Type" value={JOB_TYPE_LABEL[job.jobType] ?? job.jobType} />
                <DetailRow icon={Globe} label="Work Mode" value={EMPLOYMENT_TYPE_LABEL[job.employmentType ?? ''] ?? job.employmentType} />
                <DetailRow icon={Users} label="Experience" value={LEVEL_LABEL[job.level ?? ''] ?? job.level} />
                <DetailRow icon={MapPin} label="Location" value={job.location} />
                {job.salaryRange && <DetailRow icon={DollarSign} label="Salary" value={formatSalary(job.salaryRange)} highlight />}
                <DetailRow icon={Calendar} label="Posted" value={timeAgo(job.createdAt)} />
                {job.endDate && <DetailRow icon={Clock} label="Deadline" value={new Date(job.endDate).toLocaleDateString()} />}
              </div>
            </div>

            <div className="glass rounded-2xl border border-border/50 p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">Share this job</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Know someone perfect for this role?</p>
              </div>
              <button onClick={handleShare} className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {job && <QuickApplyModal job={job} open={applyOpen} onClose={() => setApplyOpen(false)} />}
    </>
  );
}
