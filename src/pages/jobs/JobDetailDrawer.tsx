import { X, MapPin, Clock, Briefcase, Globe, Zap, Share2, Bookmark, BookmarkCheck, ExternalLink, Sparkles, Building2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { jobsApi } from '@/lib/api';
import { cn, formatSalary, timeAgo, JOB_TYPE_LABEL, EMPLOYMENT_TYPE_LABEL, LEVEL_LABEL, getInitials, getMatchScoreBadge } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import type { Job } from '@/types';
import toast from 'react-hot-toast';

interface Props {
  job: Job;
  open?: boolean;
  onClose: () => void;
  onApply: () => void;
}

export function JobDetailDrawer({ job, onClose, onApply }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isApplicant = user?.userType === 'applicant';

  const toggleBookmark = useMutation({
    mutationFn: () => jobsApi.toggleBookmark(job.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const companyRaw = job.employer?.companyName || job.company || 'Company';
  const cleanCompanyName = companyRaw.replace(/^[\$\s\W]+/, '').trim() || 'Company';
  const matchInfo = getMatchScoreBadge(job.aiMatchScore ?? job.matchScore);

  return (
    <Dialog open={true} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent hideCloseButton className="max-w-2xl max-h-[85vh] flex flex-col p-0 glass rounded-3xl border border-border/60 shadow-[0_16px_48px_rgba(0,0,0,0.35)] overflow-hidden">
        
        {/* Modal Banners & Header */}
        <div className="relative bg-gradient-to-r from-primary/20 via-primary/10 to-accent/15 border-b border-border/40 p-6 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <Avatar className="h-14 w-14 rounded-2xl shrink-0 ring-2 ring-primary/20 shadow-md">
                <AvatarImage src={job.employer?.companyLogo} className="object-cover" />
                <AvatarFallback className="rounded-2xl text-base font-bold bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
                  {getInitials(cleanCompanyName) || 'C'}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold font-['Outfit',sans-serif] text-foreground truncate">
                    {job.title}
                  </h2>
                  {matchInfo && (
                    <span className={cn('text-xs font-bold rounded-full px-2.5 py-0.5 flex items-center gap-1 border shrink-0', matchInfo.style)}>
                      <Sparkles className="h-3 w-3" /> {matchInfo.score}% Match
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-primary flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {cleanCompanyName}
                  </span>
                  {job.employer?.industry && (
                    <span className="text-[11px] text-muted-foreground">· {job.employer.industry}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Top Right Control Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {isApplicant && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => toggleBookmark.mutate()}
                  className={cn('rounded-xl', job.isBookmarked ? 'text-primary' : 'text-muted-foreground')}
                  title="Bookmark Job"
                >
                  {job.isBookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon-sm"
                title="Open full page"
                onClick={() => { navigate(`/jobs/${job.id}`); onClose(); }}
                className="rounded-xl text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                className="rounded-xl text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Metadata Badges */}
          <div className="flex flex-wrap gap-2">
            {job.location && (
              <Badge variant="secondary" className="gap-1.5 text-xs py-1 px-3 rounded-xl border-border/50">
                <MapPin className="h-3.5 w-3.5 text-primary" />{job.location}
              </Badge>
            )}
            {job.jobType && (
              <Badge variant="secondary" className="gap-1.5 text-xs py-1 px-3 rounded-xl border-border/50">
                <Briefcase className="h-3.5 w-3.5 text-primary" />{JOB_TYPE_LABEL[job.jobType] ?? job.jobType}
              </Badge>
            )}
            {job.employmentType && (
              <Badge variant="outline" className="capitalize text-xs py-1 px-3 rounded-xl border-primary/30 bg-primary/5 text-primary">
                {EMPLOYMENT_TYPE_LABEL[job.employmentType] ?? job.employmentType}
              </Badge>
            )}
            {job.level && (
              <Badge variant="outline" className="capitalize text-xs py-1 px-3 rounded-xl">
                {LEVEL_LABEL[job.level] ?? job.level}
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1.5 text-xs py-1 px-3 rounded-xl border-border/50">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />{timeAgo(job.createdAt)}
            </Badge>
          </div>

          {/* Salary & Compensation Box */}
          <div className="flex items-center justify-between glass rounded-2xl border border-border/50 p-4 shadow-sm">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Compensation</p>
              <p className="font-bold text-primary text-base font-['Outfit',sans-serif] mt-0.5">
                {job.salaryRange ? formatSalary(job.salaryRange) : 'Salary not disclosed'}
              </p>
            </div>
            {job.endDate && (
              <div className="text-right">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Deadline</p>
                <p className="text-xs font-bold text-foreground mt-0.5 font-['Outfit',sans-serif]">
                  {new Date(job.endDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          {job.description && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-foreground font-['Outfit',sans-serif]">About the Role</h3>
              <div
                className="text-xs text-muted-foreground leading-relaxed rich-content [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 [&_strong]:text-foreground [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: job.description }}
              />
            </section>
          )}

          {/* Responsibilities */}
          {job.responsibility && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-foreground font-['Outfit',sans-serif]">Responsibilities</h3>
              <div
                className="text-xs text-muted-foreground leading-relaxed [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 [&_strong]:text-foreground [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: job.responsibility }}
              />
            </section>
          )}

          {/* Requirements */}
          {job.requirements && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-foreground font-['Outfit',sans-serif]">Requirements</h3>
              <div
                className="text-xs text-muted-foreground leading-relaxed [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 [&_strong]:text-foreground [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: job.requirements }}
              />
            </section>
          )}

          {/* Skills */}
          {job.skillSet && job.skillSet.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-foreground font-['Outfit',sans-serif]">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.skillSet.map(s => (
                  <span key={s} className="text-xs font-bold px-3 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20">
                    {s}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Company Details */}
          {job.employer && (
            <section className="glass rounded-2xl border border-border/50 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">About the Employer</h3>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 rounded-xl shrink-0">
                  <AvatarImage src={job.employer.companyLogo} />
                  <AvatarFallback className="rounded-xl font-bold bg-primary/10 text-primary">
                    {getInitials(cleanCompanyName) || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-bold text-foreground font-['Outfit',sans-serif]">{cleanCompanyName}</p>
                  {job.employer.industry && <p className="text-xs text-muted-foreground">{job.employer.industry}</p>}
                </div>
              </div>
              {job.employer.website && (
                <a href={job.employer.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline">
                  <Globe className="h-3.5 w-3.5" /> {job.employer.website}
                </a>
              )}
            </section>
          )}
        </div>

        {/* Modal Footer with Sticky Apply Button */}
        <div className="border-t border-border/40 p-4 bg-surface/80 flex items-center gap-3 shrink-0">
          <Button
            className="flex-1 rounded-xl font-bold text-sm h-11"
            onClick={() => { onApply(); onClose(); }}
            disabled={job.hasApplied}
          >
            {job.hasApplied ? 'Application Submitted' : <><Zap className="h-4 w-4 mr-2" /> Apply Now</>}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl h-11 w-11 shrink-0"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: job.title, url: window.location.href }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied to clipboard');
              }
            }}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
