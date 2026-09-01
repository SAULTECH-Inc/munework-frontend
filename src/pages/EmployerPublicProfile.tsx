import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  MapPin, Globe, Linkedin, Twitter, Facebook, Instagram,
  Building2, Users, Briefcase, ArrowLeft, MessageSquare,
  Calendar, ExternalLink, Phone, Mail, Sparkles, Share2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usersApi, jobsApi, chatApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn, getInitials, timeAgo, formatSalary } from '@/lib/utils';
import type { EmployerProfile, Job } from '@/types';
import toast from 'react-hot-toast';

export default function EmployerPublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const { data: raw, isLoading, isError } = useQuery({
    queryKey: ['public-employer', id],
    queryFn: () => usersApi.getPublicEmployer(id!).then(r => r.data.data ?? r.data),
    enabled: !!id,
  });

  const { data: jobsRaw } = useQuery({
    queryKey: ['employer-public-jobs', id],
    queryFn: () => jobsApi.search({ employerId: id, status: 'active', limit: 12 }).then(r => r.data.data ?? r.data),
    enabled: !!id,
  });

  const profile = raw as EmployerProfile | undefined;
  const jobs: Job[] = Array.isArray(jobsRaw) ? jobsRaw : (jobsRaw as any)?.data ?? [];

  const startChat = useMutation({
    mutationFn: () => chatApi.startDirect(id!),
    onSuccess: (res) => {
      const convId = res.data?.data?.id ?? res.data?.id;
      if (convId) navigate(`/chat?conv=${convId}`);
    },
  });

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Company profile link copied!');
  };

  if (isLoading) return <ProfileSkeleton />;

  if (isError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
          <Building2 className="h-8 w-8" />
        </div>
        <p className="text-base font-bold text-foreground">Company profile not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="rounded-xl">
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 pb-24">

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back
      </button>

      {/* Hero header card */}
      <div className="glass border border-border/50 rounded-3xl overflow-hidden shadow-xl">
        {/* Banner */}
        <div className="h-36 md:h-44 bg-gradient-to-r from-primary/30 via-accent/20 to-primary/10 relative">
          {profile.coverPage && (
            <img src={profile.coverPage} alt="cover" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        <div className="px-6 md:px-8 pb-6">
          <div className="flex flex-wrap items-end justify-between -mt-12 md:-mt-14 mb-4 gap-4">
            <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-surface rounded-2xl shadow-xl shrink-0 ring-2 ring-primary/20">
              <AvatarImage src={profile.companyLogo} className="object-cover" />
              <AvatarFallback className="rounded-2xl text-2xl font-black bg-gradient-to-br from-primary/30 to-accent/20 text-primary">
                {getInitials(profile.companyName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="h-10 px-4 rounded-xl text-xs font-bold gap-1.5"
              >
                <Share2 className="h-4 w-4" /> Share
              </Button>
              {/* Messaging needs an account. Anonymous visitors reach this page
                  from a shared link or a job post, so send them to sign-up
                  rather than firing a request that would only 401. */}
              {isAuthenticated ? (
                <Button
                  size="sm"
                  className="h-10 px-5 rounded-xl text-xs font-bold gap-2 shadow-md"
                  onClick={() => startChat.mutate()}
                  disabled={startChat.isPending}
                >
                  <MessageSquare className="h-4 w-4" />
                  {startChat.isPending ? 'Opening…' : 'Message Company'}
                </Button>
              ) : (
                <Button asChild size="sm" className="h-10 px-5 rounded-xl text-xs font-bold gap-2 shadow-md">
                  <Link to="/signup">
                    <MessageSquare className="h-4 w-4" /> Message Company
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground font-['Outfit',sans-serif] leading-tight">
              {profile.companyName}
            </h1>
            {profile.industry && (
              <p className="text-sm font-semibold text-primary mt-1 flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" /> {profile.industry}
              </p>
            )}
          </div>

          {/* Meta bar */}
          <div className="flex flex-wrap gap-3 mt-4 text-xs font-medium text-muted-foreground">
            {(profile.city || profile.country) && (
              <span className="flex items-center gap-1.5 bg-surface-raised border border-border/50 rounded-xl px-3 py-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary/70" />
                {[profile.city, profile.country].filter(Boolean).join(', ')}
              </span>
            )}
            {profile.companySize && (
              <span className="flex items-center gap-1.5 bg-surface-raised border border-border/50 rounded-xl px-3 py-1.5">
                <Users className="h-3.5 w-3.5 text-primary/70" />
                {profile.companySize} employees
              </span>
            )}
            {profile.companyWebsite && (
              <a
                href={profile.companyWebsite}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 bg-surface-raised border border-border/50 rounded-xl px-3 py-1.5 text-primary font-semibold hover:underline"
              >
                <Globe className="h-3.5 w-3.5" />
                {profile.companyWebsite.replace(/^https?:\/\//, '')}
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            )}
          </div>

          {/* Social icons */}
          <div className="flex gap-2 mt-4">
            {profile.linkedInProfile && (
              <a href={profile.linkedInProfile} target="_blank" rel="noreferrer"
                className="h-8 w-8 rounded-xl bg-surface-raised border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
            )}
            {profile.twitterProfile && (
              <a href={profile.twitterProfile} target="_blank" rel="noreferrer"
                className="h-8 w-8 rounded-xl bg-surface-raised border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
            )}
            {profile.facebookProfile && (
              <a href={profile.facebookProfile} target="_blank" rel="noreferrer"
                className="h-8 w-8 rounded-xl bg-surface-raised border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
            )}
            {profile.instagramProfile && (
              <a href={profile.instagramProfile} target="_blank" rel="noreferrer"
                className="h-8 w-8 rounded-xl bg-surface-raised border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 2-Column Main Layout */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">

        {/* Left Column */}
        <div className="space-y-6">

          {/* About */}
          {(profile.aboutCompany || profile.companyDescription) && (
            <Card title="About the Company" icon={Building2}>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                {profile.aboutCompany ?? profile.companyDescription}
              </p>
            </Card>
          )}

          {/* Gallery */}
          {profile.brandVisuals && profile.brandVisuals.length > 0 && (
            <Card title="Company Culture & Visuals" icon={Sparkles}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {profile.brandVisuals.map((img, i) => (
                  <a key={i} href={img} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-2xl border border-border/50">
                    <img src={img} alt={`gallery-${i}`} className="h-32 w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </a>
                ))}
              </div>
            </Card>
          )}

          {/* Job Openings */}
          <Card title={`Active Job Openings (${jobs.length})`} icon={Briefcase}>
            {jobs.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No active job openings at the moment.
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map(job => (
                  <div key={job.id} className="glass rounded-2xl border border-border/50 p-4 hover:border-primary/40 hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <Link to={`/jobs/${job.id}`} className="text-sm font-bold text-foreground hover:text-primary transition-colors truncate block">
                        {job.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground font-medium">
                        {job.location && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-primary/70" /> {job.location}</span>
                        )}
                        {job.salaryRange && (
                          <span className="text-primary font-semibold">{formatSalary(job.salaryRange)}</span>
                        )}
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {timeAgo(job.createdAt)}</span>
                      </div>
                    </div>
                    <Button size="sm" asChild className="h-9 px-4 rounded-xl text-xs font-bold shrink-0">
                      <Link to={`/jobs/${job.id}`}>
                        View Details <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>

        {/* Right Sidebar Column */}
        <div className="space-y-6 lg:sticky lg:top-5">

          <Card title="Company Information" icon={Building2}>
            <div className="space-y-3 text-xs">
              <InfoRow icon={Briefcase} label="Industry" value={profile.industry} />
              <InfoRow icon={Users} label="Company Size" value={profile.companySize ? `${profile.companySize} employees` : null} />
              <InfoRow icon={MapPin} label="Headquarters" value={[profile.city, profile.country].filter(Boolean).join(', ')} />
              {profile.companyWebsite && (
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="text-muted-foreground flex items-center gap-2 font-medium">
                    <Globe className="h-3.5 w-3.5 text-primary/60" /> Website
                  </span>
                  <a href={profile.companyWebsite} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline flex items-center gap-1">
                    Visit <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </Card>

          {(profile.companyAddress || profile.managerRole || profile.managerEmail || profile.companyPhone) && (
            <Card title="Contact Info" icon={MapPin}>
              <div className="space-y-3 text-xs font-medium text-muted-foreground">
                {profile.companyAddress && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary/70 shrink-0 mt-0.5" />
                    <span className="text-foreground/90">{profile.companyAddress}</span>
                  </div>
                )}
                {profile.managerEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary/70 shrink-0" />
                    <span className="text-foreground/90">{profile.managerEmail}</span>
                  </div>
                )}
                {profile.companyPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary/70 shrink-0" />
                    <span className="text-foreground/90">{profile.companyPhone}</span>
                  </div>
                )}
                {profile.managerRole && (
                  <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                    <Users className="h-4 w-4 text-primary/70 shrink-0" />
                    <span>Contact: <strong className="text-foreground">{profile.managerRole}</strong></span>
                  </div>
                )}
              </div>
            </Card>
          )}

        </div>

      </div>

    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl border border-border/50 p-6 space-y-4">
      <div className="flex items-center gap-2 border-b border-border/30 pb-3">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30">
      <span className="text-muted-foreground flex items-center gap-2 font-medium">
        <Icon className="h-3.5 w-3.5 text-primary/60" /> {label}
      </span>
      <span className="text-foreground font-bold capitalize">{value}</span>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <Skeleton className="h-64 rounded-3xl" />
      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
