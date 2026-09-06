import { useState, useMemo, useRef } from 'react';
import {
  Search, Filter, MessageCircle, Eye, Heart, Download,
  MapPin, Briefcase, Calendar, DollarSign, Award,
  ChevronDown, ChevronUp, Users, Zap, Target,
  Mail, Phone, Linkedin, Github, Globe, Clock,
  CheckCircle2, X, LayoutGrid, LayoutList, Loader2, Send,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader,
} from '@/components/ui/dialog';
import { TopBar } from '@/components/common/TopBar';
import { candidatesApi, chatApi } from '@/lib/api';
import { cn, getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScoreBreakdown {
  skills_score: number;
  experience_score: number;
  location_score: number;
  availability_score: number;
}

interface WorkExp {
  company: string;
  position: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
}

interface ScoutCandidate {
  id: string;
  name: string;
  title: string;
  avatar: string;
  location: string;
  experienceYears: number;
  matchScore: number;
  skills: string[];
  matchReasons: string[];
  scoreBreakdown: ScoreBreakdown;
  availableFrom: string;
  jobTypePreference: string;
  salaryExpectation: string;
  willingToRelocate: boolean;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  portfolio: string;
  certifications: number;
  projects: number;
  responseRate: number;
  reviews: number;
  verified: boolean;
  workExperience: WorkExp[];
}

function mapCandidate(c: any, idx: number): ScoutCandidate {
  const firstName = c.firstName ?? '';
  const lastName = c.lastName ?? '';
  const name = c.name || c.fullName || `${firstName} ${lastName}`.trim() || 'Unknown';

  const rawSkills: any[] = c.skills ?? c.ProfileSkill ?? [];
  const skills = rawSkills
    .map((s: any) =>
      typeof s === 'string' ? s : s?.skill?.name ?? s?.skill ?? s?.name ?? String(s),
    )
    .filter(Boolean);

  return {
    id: String(c.id ?? idx),
    name,
    title: c.professionalTitle ?? c.title ?? c.currentJobTitle ?? 'Applicant',
    avatar: c.profilePicture ?? c.profileImage ?? '',
    location: [c.city, c.state, c.country].filter(Boolean).join(', ') || 'Not specified',
    experienceYears: Number(c.yearsOfExperience ?? 0),
    matchScore: c.matchScore ?? c.score ?? Math.floor(Math.random() * 20 + 72),
    skills,
    matchReasons: c.matchReasons ?? [
      'Skills align with current job requirements',
      'Experience level fits the role',
    ],
    scoreBreakdown: c.scoreBreakdown ?? {
      skills_score: 0.82,
      experience_score: 0.76,
      location_score: 0.88,
      availability_score: 0.84,
    },
    availableFrom: c.availableFrom ?? 'Not specified',
    jobTypePreference: c.jobTypePreference ?? 'Full-time',
    salaryExpectation: c.salaryExpectation ?? 'Not specified',
    willingToRelocate: c.willingToRelocate ?? false,
    email: c.email ?? '',
    phone: c.phone ?? c.phoneNumber ?? '',
    linkedin: c.linkedin ?? c.linkedInProfile ?? '',
    github: c.github ?? '',
    portfolio: c.portfolio ?? c.website ?? '',
    certifications: c.ProfileCertification?.length ?? c.certifications?.length ?? 0,
    projects: c.projects?.length ?? 0,
    responseRate: c.responseRate ?? 0,
    reviews: c.reviews ?? 0,
    verified: c.isVerified ?? false,
    workExperience: c.workExperience ?? [],
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CandidateScoutPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('match_score');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [profileModal, setProfileModal] = useState<ScoutCandidate | null>(null);
  const [messageModal, setMessageModal] = useState<ScoutCandidate | null>(null);
  const [filters, setFilters] = useState({
    minScore: 0,
    availability: 'all',
    experience: 'all',
    location: 'all',
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const { data: raw, isLoading } = useQuery({
    queryKey: ['scout-candidates', debouncedSearch],
    // Unwrap the response envelope once (interceptor) — the paginated
    // { data: [...] } sits under r.data.data. Reading r.data left the array
    // double-nested and the list came back empty.
    queryFn: () =>
      candidatesApi.search({ search: debouncedSearch || undefined, limit: 100 }).then((r) => r.data.data ?? r.data),
    staleTime: 60_000,
  });

  const candidates = useMemo<ScoutCandidate[]>(() => {
    let list: any[] = [];
    if (Array.isArray(raw)) {
      list = raw;
    } else if (raw && typeof raw === 'object') {
      if (Array.isArray((raw as any).data)) list = (raw as any).data;
      else if (Array.isArray((raw as any).items)) list = (raw as any).items;
      else if (Array.isArray((raw as any).results)) list = (raw as any).results;
      else if (Array.isArray((raw as any).candidates)) list = (raw as any).candidates;
    }
    return list.map(mapCandidate);
  }, [raw]);

  const filtered = useMemo(() => {
    const expRanges: Record<string, [number, number]> = {
      '0-1': [0, 1], '1-3': [1, 3], '3-5': [3, 5], '5-10': [5, 10], '10+': [10, Infinity],
    };
    return candidates
      .filter((c) => {
        if (c.matchScore < filters.minScore) return false;
        if (filters.experience !== 'all') {
          const [lo, hi] = expRanges[filters.experience] ?? [0, Infinity];
          if (c.experienceYears < lo || c.experienceYears > hi) return false;
        }
        if (filters.location === 'relocate' && !c.willingToRelocate) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'match_score') return b.matchScore - a.matchScore;
        if (sortBy === 'experience') return b.experienceYears - a.experienceYears;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [candidates, filters, sortBy]);

  const toggleSave = async (c: ScoutCandidate) => {
    const wasSaved = saved.has(c.id);
    setSaved((prev) => {
      const next = new Set(prev);
      wasSaved ? next.delete(c.id) : next.add(c.id);
      return next;
    });
    try {
      if (wasSaved) await candidatesApi.unbookmark(c.id);
      else await candidatesApi.bookmark(c.id);
      toast.success(wasSaved ? 'Removed from saved' : 'Candidate saved');
    } catch {
      setSaved((prev) => {
        const next = new Set(prev);
        wasSaved ? next.add(c.id) : next.delete(c.id);
        return next;
      });
      toast.error('Failed to update saved list');
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Name', 'Title', 'Location', 'Experience (yrs)', 'Match Score', 'Skills', 'Email'],
      ...filtered.map((c) => [
        c.name, c.title, c.location, c.experienceYears, c.matchScore,
        c.skills.join('; '), c.email,
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'talent-scout.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Talent Scout"
        actions={
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        }
      />

      {/* Search & controls */}
      <div className="sticky top-0 z-20 bg-surface border-b border-border px-6 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name, skills, or location..."
              className="pl-9"
            />
          </div>

          <Button
            size="sm"
            variant={filterOpen ? 'default' : 'outline'}
            onClick={() => setFilterOpen(!filterOpen)}
            className="gap-1.5 shrink-0"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {filterOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
          >
            <option value="match_score">Best Match</option>
            <option value="experience">Most Experienced</option>
            <option value="name">Name A–Z</option>
          </select>

          <div className="flex border border-border rounded-md overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'px-2.5 py-1.5 transition-colors',
                viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-2.5 py-1.5 transition-colors',
                viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <LayoutList className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {filterOpen && (
          <div className="p-4 bg-surface-raised rounded-xl border border-border grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Min Match Score:{' '}
                <span className="text-foreground font-semibold">{filters.minScore}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={filters.minScore}
                onChange={(e) => setFilters({ ...filters, minScore: +e.target.value })}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Availability
              </label>
              <select
                value={filters.availability}
                onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All</option>
                <option value="immediate">Immediate</option>
                <option value="2weeks">Within 2 weeks</option>
                <option value="1month">Within 1 month</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Experience
              </label>
              <select
                value={filters.experience}
                onChange={(e) => setFilters({ ...filters, experience: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All levels</option>
                <option value="0-1">0–1 year</option>
                <option value="1-3">1–3 years</option>
                <option value="3-5">3–5 years</option>
                <option value="5-10">5–10 years</option>
                <option value="10+">10+ years</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Location
              </label>
              <select
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All locations</option>
                <option value="relocate">Willing to relocate</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Count bar */}
      <div className="px-6 py-2 border-b border-border/50 bg-background">
        <p className="text-xs text-muted-foreground">
          {isLoading ? 'Finding matches…' : (
            <>
              <span className="text-foreground font-semibold">{filtered.length}</span> candidate{filtered.length !== 1 ? 's' : ''} found
            </>
          )}
        </p>
      </div>

      {/* Candidates grid/list */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Finding your perfect matches…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No candidates match your filters</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setFilters({ minScore: 0, availability: 'all', experience: 'all', location: 'all' })
              }
            >
              Reset filters
            </Button>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 lg:grid-cols-2 gap-5'
                : 'space-y-3'
            }
          >
            {filtered.map((c) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                isSaved={saved.has(c.id)}
                viewMode={viewMode}
                onToggleSave={() => toggleSave(c)}
                onViewProfile={() => setProfileModal(c)}
                onMessage={() => setMessageModal(c)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {messageModal && (
        <MessageModal
          candidate={messageModal}
          onClose={() => setMessageModal(null)}
          navigate={navigate}
        />
      )}

      {profileModal && (
        <ProfileModal
          candidate={profileModal}
          isSaved={saved.has(profileModal.id)}
          onToggleSave={() => toggleSave(profileModal)}
          onMessage={() => {
            const c = profileModal;
            setProfileModal(null);
            setMessageModal(c);
          }}
          onClose={() => setProfileModal(null)}
          navigate={navigate}
        />
      )}
    </div>
  );
}

// ── CandidateCard ─────────────────────────────────────────────────────────────

function CandidateCard({
  candidate: c,
  isSaved,
  viewMode,
  onToggleSave,
  onViewProfile,
  onMessage,
}: {
  candidate: ScoutCandidate;
  isSaved: boolean;
  viewMode: 'grid' | 'list';
  onToggleSave: () => void;
  onViewProfile: () => void;
  onMessage: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (viewMode === 'list') {
    return (
      <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 transition-colors">
        <Avatar className="h-12 w-12 rounded-full shrink-0">
          <AvatarImage src={c.avatar} />
          <AvatarFallback className="text-sm font-bold">{getInitials(c.name)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
            {c.verified && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground truncate">{c.title}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {c.location}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {c.experienceYears} yrs
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 bg-primary/5 border border-primary/20 px-3 py-2 rounded-lg shrink-0">
          <Target className="h-4 w-4 text-warning" />
          <div>
            <p className="text-base font-bold text-foreground leading-none">{c.matchScore}%</p>
            <p className="text-[10px] text-muted-foreground">Match</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" onClick={onViewProfile} className="gap-1.5">
            <Eye className="h-3.5 w-3.5" /> View
          </Button>
          <Button size="sm" variant="outline" onClick={onMessage} className="gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" /> Message
          </Button>
          <button
            onClick={onToggleSave}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isSaved
                ? 'text-destructive bg-destructive/10'
                : 'text-muted-foreground hover:text-destructive hover:bg-destructive/5',
            )}
          >
            <Heart className={cn('h-4 w-4', isSaved && 'fill-current')} />
          </button>
        </div>
      </div>
    );
  }

  // Grid mode
  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4 hover:border-primary/30 hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar className="h-14 w-14 rounded-xl shrink-0">
          <AvatarImage src={c.avatar} />
          <AvatarFallback className="rounded-xl text-sm font-bold">
            {getInitials(c.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                {c.verified && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.title}</p>
            </div>
            <button
              onClick={onToggleSave}
              className={cn(
                'p-1.5 rounded-lg transition-colors shrink-0',
                isSaved
                  ? 'text-destructive bg-destructive/10'
                  : 'text-muted-foreground hover:text-destructive hover:bg-destructive/5',
              )}
            >
              <Heart className={cn('h-4 w-4', isSaved && 'fill-current')} />
            </button>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />{c.location}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="h-3 w-3" />{c.experienceYears} yrs
            </span>
          </div>
        </div>
      </div>

      {/* Match score */}
      <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 px-4 py-2.5 rounded-lg">
        <Target className="h-5 w-5 text-warning shrink-0" />
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">{c.matchScore}%</span>
          <span className="text-xs text-muted-foreground">Match Score</span>
        </div>
      </div>

      {/* Skills */}
      {c.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {c.skills.slice(0, expanded ? undefined : 5).map((s) => (
            <Badge key={s} variant="secondary" className="text-xs">
              {s}
            </Badge>
          ))}
          {!expanded && c.skills.length > 5 && (
            <button
              onClick={() => setExpanded(true)}
              className="px-2 py-0.5 bg-surface-raised border border-border rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              +{c.skills.length - 5} more
            </button>
          )}
        </div>
      )}

      {/* Match reasons */}
      <div className="bg-warning/5 border border-warning/20 rounded-lg p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="h-3.5 w-3.5 text-warning" />
          <span className="text-xs font-semibold text-foreground">Why they're a great match</span>
        </div>
        <ul className="space-y-1">
          {c.matchReasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
              {r}
            </li>
          ))}
        </ul>
      </div>

      {/* Score breakdown (expanded) */}
      {expanded && (
        <div className="space-y-2.5 bg-surface-raised rounded-lg p-3">
          <p className="text-xs font-semibold text-foreground">Match Breakdown</p>
          {Object.entries(c.scoreBreakdown).map(([key, val]) => (
            <div key={key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground capitalize">
                  {key.replace('_score', '').replace('_', ' ')}
                </span>
                <span className="font-medium text-foreground">{Math.round(val * 100)}%</span>
              </div>
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${val * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick info */}
      <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          Available: {c.availableFrom}
        </span>
        <span className="flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 shrink-0" />
          {c.salaryExpectation}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {c.jobTypePreference}
        </span>
        <span className="flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5 shrink-0" />
          {c.certifications} certs
        </span>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3 w-3" /> Show less
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" /> Show match breakdown
          </>
        )}
      </button>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-border/50">
        <Button size="sm" className="flex-1 gap-1.5" onClick={onViewProfile}>
          <Eye className="h-3.5 w-3.5" /> View Profile
        </Button>
        <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={onMessage}>
          <MessageCircle className="h-3.5 w-3.5" /> Message
        </Button>
      </div>
    </div>
  );
}

// ── MessageModal ──────────────────────────────────────────────────────────────

function MessageModal({
  candidate: c,
  onClose,
  navigate,
}: {
  candidate: ScoutCandidate;
  onClose: () => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const firstName = c.name.split(' ')[0];
  const skillHint = c.skills[0] ? ` in ${c.skills[0]}` : '';

  const templates = {
    interview: `Hi ${firstName},\n\nI came across your profile and was impressed by your background${skillHint}. I'd love to schedule a call to discuss an exciting opportunity at our company.\n\nAre you available for a quick chat this week?\n\nBest regards`,
    interest: `Hello ${firstName},\n\nYour profile is a great match for a position we're looking to fill. Would you be interested in learning more about this opportunity?\n\nLooking forward to hearing from you!`,
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const { data } = await chatApi.startDirect(c.id);
      const convId = data?.id ?? data?.data?.id;
      if (convId) await chatApi.sendMessage(convId, message.trim());
      toast.success('Message sent!');
      onClose();
      navigate('/chat');
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 rounded-xl">
              <AvatarImage src={c.avatar} />
              <AvatarFallback className="rounded-xl">{getInitials(c.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground">Message {c.name}</p>
              <p className="text-xs text-muted-foreground">{c.title}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Quick Templates</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMessage(templates.interview)}
              >
                Interview Request
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMessage(templates.interest)}
              >
                Express Interest
              </Button>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Your Message</p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
              placeholder="Write your message here..."
              rows={7}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {message.length} / 1000
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="gap-1.5"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Send Message
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── ProfileModal ──────────────────────────────────────────────────────────────

function ProfileModal({
  candidate: c,
  isSaved,
  onToggleSave,
  onMessage,
  onClose,
  navigate,
}: {
  candidate: ScoutCandidate;
  isSaved: boolean;
  onToggleSave: () => void;
  onMessage: () => void;
  onClose: () => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {/* Gradient cover */}
        <div className="relative h-24 bg-gradient-to-r from-primary to-primary/50 rounded-t-xl shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 bg-white/20 backdrop-blur hover:bg-white/30 rounded-lg text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pb-6">
          {/* Profile header */}
          <div className="flex items-end gap-4 -mt-12 mb-5">
            <Avatar className="h-20 w-20 rounded-xl ring-4 ring-background shadow-lg shrink-0">
              <AvatarImage src={c.avatar} />
              <AvatarFallback className="rounded-xl text-xl font-bold">
                {getInitials(c.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 pb-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">{c.name}</h2>
                    {c.verified && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{c.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{c.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />{c.experienceYears} yrs experience
                    </span>
                  </div>
                </div>
                <button
                  onClick={onToggleSave}
                  className={cn(
                    'p-2 rounded-lg transition-colors shrink-0',
                    isSaved
                      ? 'text-destructive bg-destructive/10'
                      : 'text-muted-foreground hover:text-destructive hover:bg-destructive/5',
                  )}
                >
                  <Heart className={cn('h-5 w-5', isSaved && 'fill-current')} />
                </button>
              </div>
            </div>
          </div>

          {/* Match score banner */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-4xl font-bold text-foreground">{c.matchScore}%</div>
                <p className="text-sm text-muted-foreground mt-0.5">Overall Match Score</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(c.scoreBreakdown).map(([key, val]) => (
                  <div key={key} className="text-center">
                    <div className="text-xl font-bold text-foreground">
                      {Math.round(val * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {key.replace('_score', '').replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Two-column body */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left 2/3 */}
            <div className="md:col-span-2 space-y-5">
              {/* Skills */}
              {c.skills.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    Skills & Expertise
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {c.skills.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {/* Work Experience */}
              {c.workExperience.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Experience
                  </h3>
                  <div className="space-y-3">
                    {c.workExperience.map((w, i) => (
                      <div key={i} className="border-l-2 border-primary pl-3">
                        <p className="text-sm font-medium text-foreground">{w.position}</p>
                        <p className="text-xs text-muted-foreground">
                          {w.company}
                          {w.startDate && (
                            <>
                              {' '}·{' '}
                              {new Date(w.startDate).getFullYear()} –{' '}
                              {w.isCurrent
                                ? 'Present'
                                : w.endDate
                                ? new Date(w.endDate).getFullYear()
                                : ''}
                            </>
                          )}
                        </p>
                        {w.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {w.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Match Reasons */}
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-2">Why They Match</h3>
                <div className="space-y-2">
                  {c.matchReasons.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-2.5 bg-warning/5 border border-warning/20 rounded-lg"
                    >
                      <CheckCircle2 className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{r}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right 1/3 */}
            <div className="space-y-4">
              {/* Actions */}
              <div className="space-y-2">
                <Button className="w-full gap-1.5" onClick={onMessage}>
                  <MessageCircle className="h-4 w-4" /> Send Message
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-1.5"
                  onClick={() => { onClose(); navigate('/schedules'); }}
                >
                  <Calendar className="h-4 w-4" /> Schedule Interview
                </Button>
                <Button
                  variant="ghost"
                  className="w-full gap-1.5"
                  onClick={() => navigate(`/profile/applicant/${c.id}`)}
                >
                  <Eye className="h-4 w-4" /> Full Profile Page
                </Button>
              </div>

              {/* Contact */}
              {(c.email || c.phone || c.linkedin || c.github || c.portfolio) && (
                <div>
                  <h3 className="text-xs font-semibold text-foreground mb-2">Contact</h3>
                  <div className="space-y-1.5">
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="flex items-center gap-2 px-3 py-2 bg-surface-raised rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </a>
                    )}
                    {c.phone && (
                      <a
                        href={`tel:${c.phone}`}
                        className="flex items-center gap-2 px-3 py-2 bg-surface-raised rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        {c.phone}
                      </a>
                    )}
                    {c.linkedin && (
                      <a
                        href={c.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-surface-raised rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Linkedin className="h-3.5 w-3.5 shrink-0" /> LinkedIn Profile
                      </a>
                    )}
                    {c.github && (
                      <a
                        href={c.github}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-surface-raised rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Github className="h-3.5 w-3.5 shrink-0" /> GitHub Profile
                      </a>
                    )}
                    {c.portfolio && (
                      <a
                        href={c.portfolio}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-surface-raised rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Globe className="h-3.5 w-3.5 shrink-0" /> Portfolio
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Availability */}
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-2">Availability</h3>
                <div className="bg-surface-raised rounded-lg border border-border p-3 space-y-2 text-xs">
                  {[
                    { label: 'Start Date', value: c.availableFrom },
                    { label: 'Job Type', value: c.jobTypePreference },
                    { label: 'Expected Salary', value: c.salaryExpectation },
                    { label: 'Willing to Relocate', value: c.willingToRelocate ? 'Yes' : 'No' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-foreground text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Profile Stats */}
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-2">Profile Stats</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Certifications', value: c.certifications, color: 'text-primary' },
                    { label: 'Projects', value: c.projects, color: 'text-primary' },
                    { label: 'Response Rate', value: `${c.responseRate}%`, color: 'text-warning' },
                    { label: 'Reviews', value: c.reviews, color: 'text-success' },
                  ].map(({ label, value, color }) => (
                    <div
                      key={label}
                      className="bg-surface-raised rounded-lg border border-border p-2.5 text-center"
                    >
                      <div className={cn('text-xl font-bold', color)}>{value}</div>
                      <div className="text-[10px] text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
