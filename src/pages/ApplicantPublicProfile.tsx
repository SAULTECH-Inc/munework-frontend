import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  MapPin, Mail, Phone, Linkedin, Twitter,
  Briefcase, GraduationCap, Award, Languages, Star,
  Calendar, ArrowLeft, MessageSquare, Github, Instagram,
  Facebook, Youtube, Link2, ChevronDown, ChevronUp,
  Share2, Check, UserSearch,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usersApi, chatApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn, getInitials } from '@/lib/utils';
import type { ApplicantProfile } from '@/types';
import { useSeo } from '@/lib/seo';

export default function ApplicantPublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const { data: raw, isLoading, isError } = useQuery({
    queryKey: ['public-applicant', id],
    queryFn: () => usersApi.getPublicApplicant(id!).then(r => r.data.data ?? r.data),
    enabled: !!id,
  });

  const profile = raw as ApplicantProfile | undefined;

  // noindex, matching the robots.txt rule: the profile is shareable by link,
  // but someone job-hunting quietly should not surface in a search for their
  // name. Titled anyway so the browser tab and any link preview read sensibly.
  useSeo({
    title: profile ? `${profile.firstName} ${profile.lastName} — Mune Work` : 'Profile — Mune Work',
    description: profile?.professionalSummary?.slice(0, 155)
      ?? profile?.professionalTitle
      ?? 'A Mune Work candidate profile.',
    noindex: true,
    type: 'profile',
  });

  const [showAllExp, setShowAllExp] = useState(false);
  const [copied, setCopied] = useState(false);

  const startChat = useMutation({
    mutationFn: () => chatApi.startDirect(id!),
    onSuccess: (res) => {
      const convId = res.data?.data?.id ?? res.data?.id;
      if (convId) navigate(`/chat?conv=${convId}`);
    },
  });

  const share = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <ProfileSkeleton />;

  if (isError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3 px-6">
        <div className="h-12 w-12 rounded-2xl bg-surface-raised border border-border flex items-center justify-center">
          <UserSearch className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-base font-semibold text-foreground">Profile not available</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          This profile doesn’t exist, or the person has made it private.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-2">
          <Link to="/jobs">Browse jobs</Link>
        </Button>
      </div>
    );
  }

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const location = [profile.city, profile.state, profile.country].filter(Boolean).join(', ');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-5 pb-16">

      {/* Only offer "back" when there is somewhere to go back to — arriving
          from a shared link leaves no history to pop. */}
      {window.history.length > 1 && (
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      )}

      {/* Hero card */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="h-28 sm:h-36 bg-gradient-to-br from-primary via-primary/70 to-purple-500 relative">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_120%,white,transparent_60%)]" />
        </div>
        <div className="px-5 sm:px-7 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-14 sm:-mt-16 mb-5">
            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-surface shadow-md">
              <AvatarImage src={profile.profilePicture} />
              <AvatarFallback className="text-2xl">{getInitials(fullName)}</AvatarFallback>
            </Avatar>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={share}>
                {copied
                  ? <><Check className="h-4 w-4 text-success" /> Copied</>
                  : <><Share2 className="h-4 w-4" /> Share</>}
              </Button>

              {/* Messaging needs an account, so send anonymous visitors to sign
                  up rather than firing a request that would only 401. */}
              {isAuthenticated ? (
                <Button size="sm" className="gap-1.5"
                  onClick={() => startChat.mutate()} disabled={startChat.isPending}>
                  <MessageSquare className="h-4 w-4" />
                  {startChat.isPending ? 'Opening…' : 'Message'}
                </Button>
              ) : (
                <Button asChild size="sm" className="gap-1.5">
                  <Link to="/signup">
                    <MessageSquare className="h-4 w-4" /> Message
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground">{fullName}</h1>
          {profile.professionalTitle && (
            <p className="text-base text-muted-foreground mt-1">{profile.professionalTitle}</p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
            {location && <MetaItem icon={MapPin} label={location} />}
            {profile.email && <MetaItem icon={Mail} label={profile.email} />}
            {profile.phoneNumber && <MetaItem icon={Phone} label={profile.phoneNumber} />}
            {profile.linkedInProfile && <MetaItem icon={Linkedin} label="LinkedIn" href={profile.linkedInProfile} />}
            {profile.twitterProfile && <MetaItem icon={Twitter} label="Twitter" href={profile.twitterProfile} />}
            {profile.githubProfile && <MetaItem icon={Github} label="GitHub" href={profile.githubProfile} />}
            {profile.facebookProfile && <MetaItem icon={Facebook} label="Facebook" href={profile.facebookProfile} />}
            {profile.instagramProfile && <MetaItem icon={Instagram} label="Instagram" href={profile.instagramProfile} />}
            {profile.youtubeProfile && <MetaItem icon={Youtube} label="YouTube" href={profile.youtubeProfile} />}
          </div>

          {/* Portfolio links */}
          {profile.portfolioLinks && profile.portfolioLinks.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.portfolioLinks.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline border border-primary/20 bg-primary/5 rounded-full px-2.5 py-0.5">
                  <Link2 className="h-3 w-3" /> {url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                </a>
              ))}
            </div>
          )}

          {/* Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {profile.skills.slice(0, 12).map((s, i) => (
                <Badge key={i} variant="outline" className="text-xs px-2.5 py-0.5">{s.skill}</Badge>
              ))}
              {profile.skills.length > 12 && (
                <Badge variant="outline" className="text-[11px] px-2 py-0.5 text-muted-foreground">
                  +{profile.skills.length - 12} more
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {(profile.professionalSummary || profile.bio) && (
        <Card title="About" icon={Star}>
          <p className="text-[15px] text-muted-foreground leading-relaxed">
            {profile.professionalSummary ?? profile.bio}
          </p>
        </Card>
      )}

      {/* Work Experience */}
      {profile.workExperience && profile.workExperience.length > 0 && (
        <Card title="Work Experience" icon={Briefcase}>
          <div className="space-y-4">
            {(showAllExp ? profile.workExperience : profile.workExperience.slice(0, 3)).map((exp, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-surface-raised border border-border flex items-center justify-center shrink-0 mt-0.5">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-foreground">{exp.position}</p>
                  <p className="text-sm text-muted-foreground">{exp.company}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {exp.startDate} – {exp.isCurrent ? 'Present' : (exp.endDate ?? '—')}
                    {exp.location && ` · ${exp.location}`}
                  </p>
                  {exp.description && (
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{exp.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {profile.workExperience.length > 3 && (
            <button
              onClick={() => setShowAllExp(v => !v)}
              className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
            >
              {showAllExp
                ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
                : <><ChevronDown className="h-3.5 w-3.5" /> Show {profile.workExperience.length - 3} more</>}
            </button>
          )}
        </Card>
      )}

      {/* Education */}
      {profile.education && profile.education.length > 0 && (
        <Card title="Education" icon={GraduationCap}>
          <div className="space-y-4">
            {profile.education.map((edu, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-surface-raised border border-border flex items-center justify-center shrink-0 mt-0.5">
                  <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-foreground">{edu.institution}</p>
                  <p className="text-sm text-muted-foreground">{[edu.degree, edu.fieldOfStudy].filter(Boolean).join(' · ')}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {edu.startDate ?? '—'} – {edu.endDate ?? 'Present'}
                  </p>
                  {edu.grade && <p className="text-[11px] text-muted-foreground mt-0.5">Grade: {edu.grade}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Certifications */}
      {profile.certifications && profile.certifications.length > 0 && (
        <Card title="Certifications" icon={Award}>
          <div className="space-y-3">
            {profile.certifications.map((cert, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-lg bg-surface-raised border border-border flex items-center justify-center shrink-0">
                  <Award className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-foreground">{cert.certification}</p>
                  <p className="text-xs text-muted-foreground">
                    {cert.institution}{cert.dateObtained ? ` · ${cert.dateObtained}` : ''}
                  </p>
                  {cert.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{cert.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Languages */}
      {profile.languages && profile.languages.length > 0 && (
        <Card title="Languages" icon={Languages}>
          <div className="flex flex-wrap gap-2">
            {profile.languages.map((lang, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-surface-raised border border-border rounded-lg px-3 py-1.5">
                <span className="text-sm font-medium text-foreground">{lang.language}</span>
                <span className="text-xs text-muted-foreground">· {lang.level}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Awards */}
      {profile.awards && profile.awards.length > 0 && (
        <Card title="Awards & Honours" icon={Star}>
          <div className="space-y-3">
            {profile.awards.map((award, i) => (
              <div key={i} className="flex gap-3">
                <Star className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{award.title}</p>
                  {award.date && <p className="text-xs text-muted-foreground">{award.date}</p>}
                  {award.description && <p className="text-xs text-muted-foreground mt-0.5">{award.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* References */}
      {profile.references && profile.references.length > 0 && (
        <Card title="References" icon={Briefcase}>
          <div className="grid sm:grid-cols-2 gap-4">
            {profile.references.map((ref, i) => (
              <div key={i} className="bg-surface-raised border border-border rounded-xl p-4 space-y-1.5">
                <p className="text-sm font-semibold text-foreground">{ref.name}</p>
                {ref.title && <p className="text-xs text-muted-foreground">{ref.title}{ref.company ? ` · ${ref.company}` : ''}</p>}
                {ref.relationship && <p className="text-[11px] text-muted-foreground capitalize">{ref.relationship}</p>}
                <div className="flex flex-col gap-1 pt-1">
                  {ref.email && (
                    <a href={`mailto:${ref.email}`} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                      <Mail className="h-3 w-3" />{ref.email}
                    </a>
                  )}
                  {ref.phone && (
                    <a href={`tel:${ref.phone}`} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                      <Phone className="h-3 w-3" />{ref.phone}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <p className="text-base font-semibold text-foreground">{title}</p>
      </div>
      {children}
    </div>
  );
}

function MetaItem({ icon: Icon, label, href }: { icon: React.ElementType; label: string; href?: string }) {
  const cls = 'flex items-center gap-1.5 text-sm text-muted-foreground';
  const inner = <><Icon className="h-4 w-4 shrink-0" />{label}</>;
  if (href) return <a href={href} target="_blank" rel="noreferrer" className={cn(cls, 'hover:text-primary transition-colors')}>{inner}</a>;
  return <span className={cls}>{inner}</span>;
}

function ProfileSkeleton() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}
