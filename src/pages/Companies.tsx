import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Filter, LayoutGrid, List, X, RefreshCw, Download,
  MapPin, Users, Briefcase, Star, Globe, Heart, ChevronLeft, ChevronRight,
  Building2, ExternalLink, Loader2, AlertCircle, Sparkles, ArrowRight,
} from 'lucide-react';
import { TopBar } from '@/components/common/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { companiesApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSeo } from '@/lib/seo';

type ViewMode = 'grid' | 'list';
type SortField = 'companyName' | 'industry' | 'location' | 'employeeCount' | 'foundedYear' | 'rating' | 'openPositions';
type SortDir = 'ASC' | 'DESC';

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Retail',
  'Manufacturing', 'Media', 'Energy', 'Real Estate', 'Consulting',
  'Transportation', 'Agriculture', 'Legal', 'Marketing', 'Non-profit',
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];
const SORT_OPTIONS: { label: string; value: SortField }[] = [
  { label: 'Company Name', value: 'companyName' },
  { label: 'Industry', value: 'industry' },
  { label: 'Location', value: 'location' },
  { label: 'Employee Count', value: 'employeeCount' },
  { label: 'Founded Year', value: 'foundedYear' },
  { label: 'Rating', value: 'rating' },
  { label: 'Open Positions', value: 'openPositions' },
];

interface Company {
  id: string;
  companyName: string;
  industry?: string;
  companyAddress?: string;
  companySize?: string;
  aboutCompany?: string;
  companyDescription?: string;
  companyLogo?: string;
  coverImage?: string;
  website?: string;
  rating?: number;
  openPositions?: number;
  foundedYear?: number;
  isFollowed?: boolean;
  email?: string;
}

export default function CompaniesPage() {
  useSeo({
    title: 'Companies Hiring Now | Mune Work',
    description: 'Discover companies hiring on Mune Work. Explore employer profiles, see what they do, and browse their open roles.',
  });

  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<SortField>('companyName');
  const [sortDir, setSortDir] = useState<SortDir>('ASC');
  const [filterIndustry, setFilterIndustry] = useState<string[]>([]);
  const [filterSize, setFilterSize] = useState<string[]>([]);
  const [hasOpenings, setHasOpenings] = useState(false);
  const [isRemoteFriendly, setIsRemoteFriendly] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const params = {
    page, limit, sortBy, sortDirection: sortDir,
    searchQuery: debouncedSearch || undefined,
    filters: JSON.stringify({
      industry: filterIndustry,
      companySize: filterSize,
      hasOpenings: hasOpenings || undefined,
      isRemoteFriendly: isRemoteFriendly || undefined,
    }),
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['companies', params],
    queryFn: () => companiesApi.list(params).then(r => r.data.data ?? r.data),
    staleTime: 30_000,
  });

  const companies: Company[] = Array.isArray(data) ? data : (data as any)?.data ?? [];
  const total: number = (data as any)?.total ?? (data as any)?.meta?.total ?? companies.length;
  const totalPages = Math.ceil(total / limit) || 1;

  const toggleFollow = useCallback(async (company: Company) => {
    if (processingId) return;
    setProcessingId(company.id);
    const wasFollowing = company.isFollowed;
    qc.setQueryData(['companies', params], (old: any) => {
      const list = Array.isArray(old) ? old : old?.data ?? [];
      const updated = list.map((c: Company) => c.id === company.id ? { ...c, isFollowed: !wasFollowing } : c);
      return Array.isArray(old) ? updated : { ...old, data: updated };
    });
    try {
      if (wasFollowing) await companiesApi.unfollow(company.id);
      else await companiesApi.follow(company.id);
      toast.success(wasFollowing ? 'Unfollowed company' : 'Following company');
    } catch {
      qc.setQueryData(['companies', params], (old: any) => {
        const list = Array.isArray(old) ? old : old?.data ?? [];
        const reverted = list.map((c: Company) => c.id === company.id ? { ...c, isFollowed: wasFollowing } : c);
        return Array.isArray(old) ? reverted : { ...old, data: reverted };
      });
      toast.error('Failed to update follow status');
    } finally {
      setProcessingId(null);
    }
  }, [processingId, params, qc]);

  const handleExport = () => {
    if (!companies.length) return;
    const rows = companies.map(c => ({
      name: c.companyName, industry: c.industry, location: c.companyAddress,
      size: c.companySize, openPositions: c.openPositions, rating: c.rating,
    }));
    const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `companies-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Exported successfully');
  };

  const clearFilters = () => {
    setSearch(''); setFilterIndustry([]); setFilterSize([]);
    setHasOpenings(false); setIsRemoteFriendly(false); setPage(1);
  };

  const activeCount = filterIndustry.length + filterSize.length + (hasOpenings ? 1 : 0) + (isRemoteFriendly ? 1 : 0) + (debouncedSearch ? 1 : 0);
  const followedCount = companies.filter(c => c.isFollowed).length;

  const startIdx = total ? (page - 1) * limit + 1 : 0;
  const endIdx = Math.min(page * limit, total);

  return (
    <>
      <TopBar title="Companies" />
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Hero Header */}
        <div className="glass rounded-3xl border border-border/50 p-6 md:p-8 bg-gradient-to-r from-primary/10 via-surface to-accent/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(262_83%_58%/0.12),transparent_50%)]" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 mb-2">
                <Sparkles className="h-3.5 w-3.5" /> Top Employers
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground font-['Outfit',sans-serif]">Discover Companies</h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Explore leading organizations, view company culture, active job openings, and connect directly with hiring managers.
              </p>
            </div>
            {total > 0 && (
              <div className="flex items-center gap-3 bg-surface/80 backdrop-blur border border-border/60 rounded-2xl p-3 px-4 shrink-0 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-black text-foreground">{total}</p>
                  <p className="text-xs text-muted-foreground font-medium">Verified Companies</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search + actions row */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search companies by name, industry, location…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-8 h-10 text-sm bg-surface-raised border-border/60 rounded-xl focus:border-primary/50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Button
            variant={showFilters || activeCount > 0 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1.5 h-10 px-4 rounded-xl"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <span className="bg-white/20 text-[10px] font-bold rounded-full px-1.5">{activeCount}</span>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={handleExport} disabled={!companies.length} className="gap-1.5 h-10 px-4 rounded-xl">
            <Download className="h-4 w-4" />
            Export
          </Button>

          <Button variant="outline" size="icon-sm" onClick={() => refetch()} disabled={isLoading} className="h-10 w-10 rounded-xl">
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="glass border border-border/50 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Industry</p>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {INDUSTRIES.map(ind => (
                    <button
                      key={ind}
                      onClick={() => setFilterIndustry(prev =>
                        prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
                      )}
                      className={cn(
                        'px-2.5 py-1 text-xs rounded-xl border transition-colors',
                        filterIndustry.includes(ind)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-surface-raised',
                      )}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Company Size</p>
                <div className="flex flex-wrap gap-1.5">
                  {COMPANY_SIZES.map(s => (
                    <button
                      key={s}
                      onClick={() => setFilterSize(prev =>
                        prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                      )}
                      className={cn(
                        'px-2.5 py-1 text-xs rounded-xl border transition-colors',
                        filterSize.includes(s)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-surface-raised',
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Options</p>
                <div className="space-y-2 pt-1">
                  {[
                    { label: 'Has Open Positions', value: hasOpenings, set: setHasOpenings },
                    { label: 'Remote Friendly', value: isRemoteFriendly, set: setIsRemoteFriendly },
                  ].map(({ label, value, set }) => (
                    <label key={label} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={value} onChange={e => { set(e.target.checked); setPage(1); }}
                        className="rounded border-border text-primary focus:ring-primary" />
                      <span className="text-xs text-foreground font-medium">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sort By</p>
                <select
                  value={sortBy}
                  onChange={e => { setSortBy(e.target.value as SortField); setPage(1); }}
                  className="w-full h-9 text-xs bg-surface-raised border border-border/60 rounded-xl px-2.5 text-foreground"
                >
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div className="flex gap-1 pt-1">
                  {(['ASC', 'DESC'] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setSortDir(d)}
                      className={cn(
                        'flex-1 text-[11px] py-1.5 rounded-lg border font-semibold transition-colors',
                        sortDir === d ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground bg-surface-raised',
                      )}
                    >
                      {d === 'ASC' ? 'A → Z' : 'Z → A'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {activeCount > 0 && (
              <div className="flex items-center gap-2 pt-3 border-t border-border/40 flex-wrap">
                <span className="text-xs text-muted-foreground">Active filters:</span>
                {debouncedSearch && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 text-primary text-xs rounded-full border border-primary/20">
                    "{debouncedSearch}" <button onClick={() => setSearch('')}><X className="h-3 w-3" /></button>
                  </span>
                )}
                {filterIndustry.map(ind => (
                  <span key={ind} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 text-primary text-xs rounded-full border border-primary/20">
                    {ind} <button onClick={() => setFilterIndustry(p => p.filter(i => i !== ind))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
                <button onClick={clearFilters} className="ml-auto text-xs text-primary font-semibold hover:underline">Clear all filters</button>
              </div>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-3 text-muted-foreground text-xs font-medium">
            {isLoading ? (
              <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Loading companies…</span>
            ) : (
              <span>Showing <strong className="text-foreground font-bold">{startIdx}–{endIdx}</strong> of <strong className="text-foreground font-bold">{total.toLocaleString()}</strong> companies</span>
            )}
            {followedCount > 0 && (
              <span className="flex items-center gap-1 text-primary font-semibold"><Heart className="h-3.5 w-3.5 fill-primary" /> {followedCount} followed</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
              className="h-8 text-xs bg-surface-raised border border-border/60 rounded-xl px-2.5 text-foreground font-medium"
            >
              {[10, 20, 50].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>

            <div className="flex border border-border/60 rounded-xl overflow-hidden bg-surface-raised p-0.5">
              <button onClick={() => setViewMode('grid')} title="Grid"
                className={cn('p-1.5 rounded-lg transition-colors', viewMode === 'grid' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setViewMode('list')} title="List"
                className={cn('p-1.5 rounded-lg transition-colors', viewMode === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        {isLoading ? (
          <div className={cn('grid gap-5', viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1')}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className={cn('rounded-2xl', viewMode === 'grid' ? 'h-64' : 'h-28')} />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center glass rounded-3xl border border-border/50">
            <AlertCircle className="h-12 w-12 text-destructive/50" />
            <p className="text-sm text-muted-foreground font-medium">Failed to load companies</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl">Try again</Button>
          </div>
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center glass rounded-3xl border border-border/50">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Building2 className="h-8 w-8" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">No companies found</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">No organizations matched your current search filters.</p>
            </div>
            {activeCount > 0 && <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl mt-2">Clear filters</Button>}
          </div>
        ) : (
          <div className={cn('grid gap-5', viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1')}>
            {companies.map(company => (
              <CompanyCard
                key={company.id}
                company={company}
                viewMode={viewMode}
                onFollow={() => toggleFollow(company)}
                processing={processingId === company.id}
                onViewProfile={() => navigate(`/profile/employer/${company.id}`)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-5 border-t border-border/50 flex-wrap gap-3">
            <span className="text-xs text-muted-foreground font-medium">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon-sm" onClick={() => setPage(1)} disabled={page === 1} className="rounded-xl">
                <ChevronLeft className="h-3.5 w-3.5" /><ChevronLeft className="h-3.5 w-3.5 -ml-2" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-xl">
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const n = start + i;
                return n <= totalPages ? (
                  <Button key={n} variant={n === page ? 'default' : 'outline'} size="icon-sm"
                    className="w-8 h-8 text-xs font-bold rounded-xl" onClick={() => setPage(n)}>
                    {n}
                  </Button>
                ) : null;
              })}
              <Button variant="outline" size="icon-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-xl">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => setPage(totalPages)} disabled={page === totalPages} className="rounded-xl">
                <ChevronRight className="h-3.5 w-3.5" /><ChevronRight className="h-3.5 w-3.5 -ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Company Card ─────────────────────────────────────────────────────────────

function CompanyCard({ company, viewMode, onFollow, processing, onViewProfile }: {
  company: Company;
  viewMode: ViewMode;
  onFollow: () => void;
  processing: boolean;
  onViewProfile: () => void;
}) {
  const desc = (company.companyDescription || company.aboutCompany || '').replace(/<[^>]*>/g, '').trim();
  const initials = company.companyName?.charAt(0)?.toUpperCase() ?? '?';

  if (viewMode === 'list') {
    return (
      <div
        onClick={onViewProfile}
        className="glass border border-border/50 rounded-2xl p-5 flex gap-4 hover:border-primary/40 hover:shadow-[0_8px_32px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
      >
        <div className="h-16 w-16 shrink-0 rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center overflow-hidden ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all shadow-md">
          {company.companyLogo
            ? <img src={company.companyLogo} alt={company.companyName} className="h-full w-full object-cover" />
            : <span className="text-xl font-black text-primary">{initials}</span>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors font-['Outfit',sans-serif]">{company.companyName}</h3>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap font-medium">
                {company.industry && <span className="flex items-center gap-1.5 bg-surface-raised border border-border/40 rounded-lg px-2 py-0.5"><Briefcase className="h-3 w-3 text-primary/70" />{company.industry}</span>}
                {company.companyAddress && <span className="flex items-center gap-1.5 bg-surface-raised border border-border/40 rounded-lg px-2 py-0.5"><MapPin className="h-3 w-3 text-primary/70" />{company.companyAddress}</span>}
                {company.companySize && <span className="flex items-center gap-1.5 bg-surface-raised border border-border/40 rounded-lg px-2 py-0.5"><Users className="h-3 w-3 text-primary/70" />{company.companySize} employees</span>}
                {company.openPositions != null && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                    {company.openPositions} open role{company.openPositions !== 1 ? 's' : ''}
                  </span>
                )}
                {company.rating != null && (
                  <span className="flex items-center gap-1 text-warning font-bold"><Star className="h-3.5 w-3.5 fill-warning" />{company.rating.toFixed(1)}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
              <Button variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-xl" onClick={onViewProfile}>
                View Profile <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
              <Button
                variant={company.isFollowed ? 'default' : 'outline'}
                size="sm" className="h-8 text-xs gap-1.5 font-semibold rounded-xl"
                onClick={onFollow} disabled={processing}
              >
                {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Heart className={cn('h-3.5 w-3.5', company.isFollowed && 'fill-current')} />}
                {company.isFollowed ? 'Following' : 'Follow'}
              </Button>
            </div>
          </div>
          {desc && <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2 leading-relaxed">{desc}</p>}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onViewProfile}
      className="glass border border-border/50 rounded-2xl overflow-hidden hover:border-primary/40 hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(0,0,0,0.2)] transition-all duration-200 cursor-pointer flex flex-col group h-full"
    >
      {/* Banner */}
      <div className="h-28 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/10 relative shrink-0">
        {company.coverImage && (
          <img src={company.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-90" />
        <div className="absolute -bottom-6 left-5 h-14 w-14 rounded-2xl border-2 border-surface bg-surface-raised flex items-center justify-center overflow-hidden shadow-lg ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
          {company.companyLogo
            ? <img src={company.companyLogo} alt={company.companyName} className="h-full w-full object-cover" />
            : <span className="text-lg font-black text-primary">{initials}</span>}
        </div>
      </div>

      <div className="p-5 pt-8 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          <div>
            <h3 className="text-base font-bold text-foreground leading-tight font-['Outfit',sans-serif] group-hover:text-primary transition-colors truncate">
              {company.companyName}
            </h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5 flex items-center gap-1">
              <Briefcase className="h-3 w-3 text-primary/60" /> {company.industry ?? 'General'}
            </p>
          </div>

          <div className="space-y-1.5 text-xs text-muted-foreground font-medium">
            {company.companyAddress && (
              <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary/60 shrink-0" /><span className="truncate">{company.companyAddress}</span></div>
            )}
            {company.companySize && (
              <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary/60 shrink-0" />{company.companySize} employees</div>
            )}
            {company.website && (
              <div className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                <a href={company.website} target="_blank" rel="noopener noreferrer"
                  className="truncate text-primary hover:underline font-medium" onClick={e => e.stopPropagation()}>
                  {company.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>

          {desc && <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed pt-1">{desc}</p>}
        </div>

        <div className="space-y-3 pt-2 border-t border-border/30">
          <div className="flex items-center justify-between">
            {company.openPositions != null && company.openPositions > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                {company.openPositions} open role{company.openPositions !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground font-medium">No open positions</span>
            )}
            {company.rating != null && (
              <span className="flex items-center gap-1 text-xs text-warning font-bold"><Star className="h-3.5 w-3.5 fill-warning" />{company.rating.toFixed(1)}</span>
            )}
          </div>

          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs font-semibold rounded-xl" onClick={onViewProfile}>
              View Profile
            </Button>
            <Button
              variant={company.isFollowed ? 'default' : 'outline'}
              size="sm" className="flex-1 h-8 text-xs gap-1 font-semibold rounded-xl"
              onClick={onFollow} disabled={processing}
            >
              {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Heart className={cn('h-3.5 w-3.5', company.isFollowed && 'fill-current')} />}
              {company.isFollowed ? 'Following' : 'Follow'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
