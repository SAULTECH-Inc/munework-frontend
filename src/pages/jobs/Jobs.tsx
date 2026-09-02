import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, SlidersHorizontal, MapPin, Clock, Bookmark, BookmarkCheck, Zap, X, Sparkles,
  TrendingUp, ChevronDown, ChevronUp, Building2, AlertCircle, DollarSign, Filter, Grid, List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import SearchableSelect from '@/components/ui/searchable-select';
import { JobDetailDrawer } from './JobDetailDrawer';
import { QuickApplyModal } from './QuickApplyModal';
import { jobsApi } from '@/lib/api';
import { cn, formatSalary, timeAgo, JOB_TYPE_LABEL, getInitials, getMatchScoreBadge } from '@/lib/utils';
import { COUNTRIES } from '@/lib/profile-data';
import type { Job } from '@/types';
import { TopBar } from '@/components/common/TopBar';
import { useAuthStore } from '@/store/auth.store';

const COUNTRY_OPTIONS = COUNTRIES.map(c => ({ label: c, value: c }));

const JOB_TYPES = ['full_time', 'part_time', 'contract', 'freelance', 'internship'];
const WORK_MODES = ['remote', 'hybrid', 'onsite'];
const EXPERIENCE = ['intern', 'junior', 'mid', 'senior', 'lead', 'manager'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'CAD', 'AUD'];
const SALARY_FREQ = ['hourly', 'monthly', 'yearly'];

type Tab = 'all' | 'recommended';

export default function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();

  const [activeTab, setActiveTab]       = useState<Tab>('all');
  const [search, setQuerySearch]        = useState(searchParams.get('q') ?? '');
  const [location, setLocation]         = useState(searchParams.get('location') ?? '');
  const [country, setCountry]           = useState('');
  const [city, setCity]                 = useState('');
  const [jobType, setJobType]           = useState<string>('');
  const [workMode, setWorkMode]         = useState<string>('');
  const [experience, setExperience]     = useState<string>('');
  const [salaryMin, setSalaryMin]       = useState('');
  const [salaryMax, setSalaryMax]       = useState('');
  const [currency, setCurrency]         = useState('USD');
  const [salaryFreq, setSalaryFreq]     = useState('yearly');
  const [filtersOpen, setFiltersOpen]   = useState(false);
  const [selectedJob, setSelectedJob]   = useState<Job | null>(null);
  const [applyJob, setApplyJob]         = useState<Job | null>(null);
  const [page, setPage]                 = useState(1);

  const effectiveLocation = city ? `${city}${country ? `, ${country}` : ''}` : country || location;

  // Jobs are browsable signed out, so anything applicant-only has to be gated
  // rather than assumed.
  const isApplicant = useAuthStore(st => st.user?.userType === 'applicant');

  const params: Record<string, string> = { limit: '20', page: String(page) };
  if (search) params.q = search;
  if (effectiveLocation) params.location = effectiveLocation;
  if (jobType) params.jobType = jobType;
  if (workMode) params.workMode = workMode;
  if (experience) params.experienceLevel = experience;
  if (salaryMin) params.salaryMin = salaryMin;
  if (salaryMax) params.salaryMax = salaryMax;
  if (salaryMin || salaryMax) { params.currency = currency; params.salaryFrequency = salaryFreq; }

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', params],
    queryFn: () => jobsApi.search(params).then(r => r.data.data ?? r.data),
    placeholderData: (prev: any) => prev,
    enabled: activeTab === 'all',
  });

  const { data: recData, isLoading: recLoading } = useQuery({
    queryKey: ['job-recommendations'],
    queryFn: () => jobsApi.getRecommendations({ limit: 20 }).then(r => r.data.data ?? r.data),
    // Applicant-only endpoint — requesting it signed out only produces a 401.
    enabled: activeTab === 'recommended' && isApplicant,
  });

  const allJobs: Job[] = (data as any)?.data ?? data ?? [];
  const recJobs: Job[] = (recData as any)?.data ?? recData ?? [];
  const jobs = activeTab === 'recommended' ? recJobs : allJobs;
  const isLoadingJobs = activeTab === 'recommended' ? recLoading : isLoading;

  const total = (data as any)?.total ?? allJobs.length;
  const hasMore = activeTab === 'all' && allJobs.length > 0 && page * 20 < total;

  const toggleBookmark = useMutation({
    mutationFn: (jobId: string) => jobsApi.toggleBookmark(jobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });

  function clearFilters() {
    setJobType(''); setWorkMode(''); setExperience('');
    setLocation(''); setCountry(''); setCity('');
    setSalaryMin(''); setSalaryMax(''); setCurrency('USD'); setSalaryFreq('yearly');
    setQuerySearch(''); setPage(1);
  }

  const hasFilters = !!(jobType || workMode || experience || effectiveLocation || search || salaryMin || salaryMax);

  return (
    <>
      <TopBar title="Find Jobs" />

      {/* Main Container */}
      <div className="p-6 max-w-6xl mx-auto space-y-6 w-full flex-1">

        {/* Filter & Search Header Card */}
        <div className="glass rounded-2xl border border-border/50 p-5 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
          
          {/* Top Row: Tabs + Filter toggle */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-border/40">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-raised/60 border border-border/40">
              {([
                { id: 'all' as Tab, label: 'All Openings', icon: Search },
                ...(isApplicant ? [{ id: 'recommended' as Tab, label: 'Matched For You', icon: Sparkles }] : []),
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSelectedJob(null); }}
                  className={cn(
                    'flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-all duration-200',
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-[0_2px_10px_hsl(262_83%_58%/0.3)]'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <Button
              variant={filtersOpen ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="gap-2 text-xs font-semibold rounded-xl"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filters</span>
              {hasFilters && (
                <span className="h-4 w-4 flex items-center justify-center rounded-full bg-primary-foreground text-primary text-[10px] font-bold">
                  {[jobType, workMode, experience, effectiveLocation, (salaryMin || salaryMax)].filter(Boolean).length}
                </span>
              )}
            </Button>
          </div>

          {/* Search Inputs Row */}
          {activeTab === 'all' && (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setQuerySearch(e.target.value)}
                  placeholder="Job title, keywords, or company…"
                  className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-border/60 bg-surface/80 text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all placeholder:text-muted-foreground"
                />
                {search && (
                  <button onClick={() => setQuerySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="sm:col-span-4 relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={city || country || location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="City or Country"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/60 bg-surface/80 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground"
                />
              </div>
            </div>
          )}

          {/* Collapsible Expanded Filters Panel */}
          {filtersOpen && (
            <div className="pt-3 border-t border-border/40 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Job Type</p>
                  <div className="flex flex-wrap gap-1.5">
                    {JOB_TYPES.map(t => (
                      <button
                        key={t}
                        onClick={() => setJobType(jobType === t ? '' : t)}
                        className={cn(
                          'text-xs px-3 py-1 rounded-xl border font-medium transition-all',
                          jobType === t ? 'bg-primary/20 border-primary text-primary font-bold' : 'border-border/60 text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {JOB_TYPE_LABEL[t] ?? t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Work Mode</p>
                  <div className="flex flex-wrap gap-1.5">
                    {WORK_MODES.map(t => (
                      <button
                        key={t}
                        onClick={() => setWorkMode(workMode === t ? '' : t)}
                        className={cn(
                          'text-xs px-3 py-1 rounded-xl border font-medium capitalize transition-all',
                          workMode === t ? 'bg-primary/20 border-primary text-primary font-bold' : 'border-border/60 text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Experience Level</p>
                  <div className="flex flex-wrap gap-1.5">
                    {EXPERIENCE.map(t => (
                      <button
                        key={t}
                        onClick={() => setExperience(experience === t ? '' : t)}
                        className={cn(
                          'text-xs px-3 py-1 rounded-xl border font-medium capitalize transition-all',
                          experience === t ? 'bg-primary/20 border-primary text-primary font-bold' : 'border-border/60 text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Salary Filter Section */}
              <div className="pt-3 border-t border-border/40 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Salary Range & Currency</p>
                  <span className="text-[10px] text-muted-foreground font-medium">Filter by specific amount or min–max range</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                  {/* Currency Selector */}
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Currency</label>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-border/60 bg-surface/80 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="NGN">NGN (₦)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                    </select>
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Frequency</label>
                    <select
                      value={salaryFreq}
                      onChange={e => setSalaryFreq(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-border/60 bg-surface/80 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="yearly">Yearly</option>
                      <option value="monthly">Monthly</option>
                      <option value="hourly">Hourly</option>
                    </select>
                  </div>

                  {/* Min / Specific Salary */}
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Min Salary / Amount</label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="number"
                        value={salaryMin}
                        onChange={e => setSalaryMin(e.target.value)}
                        placeholder="e.g. 50000"
                        className="w-full pl-8 pr-3 h-9 rounded-xl border border-border/60 bg-surface/80 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>

                  {/* Max Salary */}
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Max Salary (Optional)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="number"
                        value={salaryMax}
                        onChange={e => setSalaryMax(e.target.value)}
                        placeholder="e.g. 150000"
                        className="w-full pl-8 pr-3 h-9 rounded-xl border border-border/60 bg-surface/80 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Presets:</span>
                  {(currency === 'NGN'
                    ? [
                        { label: '₦200k+', min: '200000', freq: 'monthly' },
                        { label: '₦500k+', min: '500000', freq: 'monthly' },
                        { label: '₦1M+',   min: '1000000', freq: 'monthly' },
                        { label: '₦5M+/yr', min: '5000000', freq: 'yearly' },
                      ]
                    : [
                        { label: '$30k+',  min: '30000',  freq: 'yearly' },
                        { label: '$60k+',  min: '60000',  freq: 'yearly' },
                        { label: '$100k+', min: '100000', freq: 'yearly' },
                        { label: '$150k+', min: '150000', freq: 'yearly' },
                      ]
                  ).map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => { setSalaryMin(p.min); setSalaryFreq(p.freq); }}
                      className={cn(
                        'text-[10px] px-2.5 py-1 rounded-xl border font-bold transition-all',
                        salaryMin === p.min ? 'bg-primary/20 border-primary text-primary' : 'border-border/60 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {hasFilters && (
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <span className="text-xs text-muted-foreground">Active filters applied</span>
                  <button onClick={clearFilters} className="text-xs font-bold text-primary hover:underline">
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Job Listings Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-['Outfit',sans-serif]">
              {isLoadingJobs ? 'Searching jobs…' : `${jobs.length} Positions Available`}
            </p>
          </div>

          {isLoadingJobs ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => <JobCardSkeleton key={i} />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="glass rounded-2xl border border-border/50 p-12 text-center flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-base font-bold font-['Outfit',sans-serif]">No jobs found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Try searching for a different keyword or clearing your filters.
              </p>
              {hasFilters && (
                <Button size="sm" variant="outline" onClick={clearFilters} className="mt-4 text-xs">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  selected={selectedJob?.id === job.id}
                  compact={false}
                  showMatchScore={activeTab === 'recommended'}
                  onSelect={() => setSelectedJob(job)}
                  onApply={() => setApplyJob(job)}
                  onBookmark={() => toggleBookmark.mutate(job.id)}
                />
              ))}

              {hasMore && (
                <Button
                  variant="outline"
                  className="w-full py-6 text-xs font-semibold rounded-2xl border-border/60"
                  onClick={() => setPage(p => p + 1)}
                  disabled={isLoading}
                >
                  Load more openings
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Job Details Drawer / Modal */}
      {selectedJob && (
        <JobDetailDrawer
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onApply={() => setApplyJob(selectedJob)}
        />
      )}

      {/* Quick Apply Modal */}
      {applyJob && (
        <QuickApplyModal
          job={applyJob}
          open={!!applyJob}
          onClose={() => setApplyJob(null)}
        />
      )}
    </>
  );
}

// ─── Filter Helpers ───────────────────────────────────────────────────────────

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-xs px-2.5 py-1 rounded-full border transition-colors',
        active ? 'bg-primary/10 border-primary/30 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

// ─── Job Card Component ───────────────────────────────────────────────────────

interface JobCardProps {
  job: Job;
  selected: boolean;
  compact: boolean;
  showMatchScore?: boolean;
  onSelect: () => void;
  onApply: () => void;
  onBookmark: () => void;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function JobCard({ job, selected, compact, showMatchScore, onSelect, onApply, onBookmark }: JobCardProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [showAllSkills, setShowAllSkills] = useState(false);

  const skills = job.skillSet ?? [];
  const visibleSkills = showAllSkills ? skills : skills.slice(0, 5);
  const hasMoreSkills = skills.length > 5;

  const daysLeft = job.endDate ? Math.ceil((new Date(job.endDate).getTime() - Date.now()) / 86400000) : null;
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
  const descriptionText = job.description ? stripHtml(job.description) : '';

  const companyRaw = job.employer?.companyName || job.company || 'Company';
  const cleanCompanyName = companyRaw.replace(/^[\$\s\W]+/, '').trim() || 'Company';

  return (
    <div
      onClick={onSelect}
      className={cn(
        'glass rounded-2xl border border-border/50 p-5 hover:border-primary/40 hover:shadow-[0_8px_32px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer select-none space-y-4',
        selected && 'border-primary/60 bg-primary/10 shadow-[0_0_20px_hsl(262_83%_58%/0.25)]',
      )}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <Avatar className="h-11 w-11 rounded-xl shrink-0 ring-1 ring-border/50 shadow-sm">
            <AvatarImage src={job.employer?.companyLogo} className="object-cover" />
            <AvatarFallback className="rounded-xl text-xs font-bold bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
              {getInitials(cleanCompanyName) || 'C'}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-foreground truncate font-['Outfit',sans-serif]">
                {job.title}
              </h3>
              {isUrgent && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/10 border border-destructive/20 rounded-full px-2 py-0.5 shrink-0">
                  <AlertCircle className="h-3 w-3" /> {daysLeft}d left
                </span>
              )}
            </div>

            <button
              onClick={e => { e.stopPropagation(); job.employer?.id && navigate(`/profile/employer/${job.employer.id}`); }}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 mt-1 font-medium"
            >
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>{cleanCompanyName}</span>
            </button>
          </div>
        </div>

        {/* Top Right Action & Score */}
        <div className="flex items-center gap-2 shrink-0">
          {(() => {
            const { score, style, labelText } = getMatchScoreBadge(job.aiMatchScore ?? job.matchScore, job.id);
            return (
              <span
                className={cn('text-[11px] font-bold rounded-full px-3 py-1 flex items-center gap-1.5 border shadow-sm transition-all', style)}
                title={`${labelText} — ${score}% AI Match`}
              >
                <Sparkles className="h-3 w-3" />
                {score}% Match
              </span>
            );
          })()}

          {user?.userType === 'applicant' && (
            <button
              onClick={e => { e.stopPropagation(); onBookmark(); }}
              className="h-8 w-8 rounded-xl border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
            >
              {job.isBookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Badges & Description */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-2">
          {job.location && (
            <Badge variant="secondary" className="text-xs px-2.5 py-0.5 rounded-lg border-border/50">
              <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />{job.location}
            </Badge>
          )}
          {job.jobType && (
            <Badge variant="secondary" className="text-xs px-2.5 py-0.5 rounded-lg border-border/50">
              {JOB_TYPE_LABEL[job.jobType] ?? job.jobType}
            </Badge>
          )}
          {job.employmentType && (
            <Badge variant="outline" className="text-xs px-2.5 py-0.5 rounded-lg capitalize border-primary/20 bg-primary/5 text-primary">
              {job.employmentType}
            </Badge>
          )}
          {job.level && (
            <Badge variant="outline" className="text-xs px-2.5 py-0.5 rounded-lg capitalize">
              {job.level}
            </Badge>
          )}
        </div>

        {descriptionText && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-normal">
            {descriptionText}
          </p>
        )}

        {/* Skill Chips */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {visibleSkills.map((skill, i) => (
              <span key={i} className="text-[11px] px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 font-semibold">
                {skill}
              </span>
            ))}
            {hasMoreSkills && (
              <button
                onClick={e => { e.stopPropagation(); setShowAllSkills(v => !v); }}
                className="text-[11px] px-2 py-0.5 rounded-lg bg-surface-raised text-muted-foreground border border-border/50 hover:text-foreground transition-colors"
              >
                {showAllSkills ? 'Less' : `+${skills.length - 5} more`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Row */}
      <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs">
        <span className="font-bold text-primary font-['Outfit',sans-serif]">
          {job.salaryRange ? formatSalary(job.salaryRange) : <span className="text-muted-foreground font-normal">Salary not disclosed</span>}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> {timeAgo(job.createdAt)}
          </span>
          <Button
            size="sm"
            onClick={e => { e.stopPropagation(); onApply(); }}
            disabled={job.hasApplied}
            className="text-xs h-8 px-4 rounded-xl font-bold shadow-sm"
          >
            {job.hasApplied ? 'Applied' : <><Zap className="h-3.5 w-3.5 mr-1" /> Apply</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function JobCardSkeleton() {
  return (
    <div className="glass rounded-2xl border border-border/50 p-5 space-y-4 animate-pulse">
      <div className="flex gap-3">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/2 rounded-lg" />
          <Skeleton className="h-3 w-1/3 rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  );
}
