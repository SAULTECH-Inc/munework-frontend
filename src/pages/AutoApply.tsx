import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Zap, Settings2, Briefcase, Loader2, Plus, X, ToggleLeft,
  Clock, Building2, Tag, AlertCircle, CheckCircle2, MapPin, Sparkles,
  ShieldAlert, Sliders, PlayCircle, PauseCircle, Check, ExternalLink,
} from 'lucide-react';
import { TopBar } from '@/components/common/TopBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { autoApplyApi } from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const TIMEZONES = [
  'Africa/Lagos',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Dubai',
  'Australia/Sydney',
  'UTC',
];

interface AutoApplySettings {
  enableAutoApply: boolean;
  pauseAutoApply: boolean;
  minimumMatchPercentage: number;
  applyImmediately: boolean;
  batchApplyTime: string;
  timezone: string;
  applyOnWeekends: boolean;
  skipAlreadyApplied: boolean;
  blacklistedCompanies: string[];
  blacklistedKeywords: string[];
  desiredJobTitles: string[];
  openToRelocation: boolean;
  preferredCountries: string[];
  preferredCompanies: string[];
  expectedSalaries: any[];
  workTypes: string[];
  preferredBenefits: string[];
}

const DEFAULTS: AutoApplySettings = {
  enableAutoApply: false,
  pauseAutoApply: false,
  minimumMatchPercentage: 75,
  applyImmediately: false,
  batchApplyTime: '09:00',
  timezone: 'Africa/Lagos',
  applyOnWeekends: true,
  skipAlreadyApplied: true,
  blacklistedCompanies: [],
  blacklistedKeywords: [],
  desiredJobTitles: [],
  openToRelocation: false,
  preferredCountries: [],
  preferredCompanies: [],
  expectedSalaries: [],
  workTypes: [],
  preferredBenefits: [],
};

export default function AutoApplyPage() {
  const qc = useQueryClient();
  const [settings, setSettings] = useState<AutoApplySettings>(DEFAULTS);
  const [companyInput, setCompanyInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [prefCompanyInput, setPrefCompanyInput] = useState('');
  const [prefCountryInput, setPrefCountryInput] = useState('');
  const [benefitInput, setBenefitInput] = useState('');
  const [salCurrency, setSalCurrency] = useState('USD');
  const [salMin, setSalMin] = useState('');
  const [salMax, setSalMax] = useState('');
  const [salFreq, setSalFreq] = useState('yearly');
  const [showSalInput, setShowSalInput] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { data: raw, isLoading } = useQuery({
    queryKey: ['auto-apply-settings'],
    queryFn: () => autoApplyApi.getSettings().then(r => r.data.data ?? r.data),
    retry: false,
  });

  const { data: jobsRaw, isLoading: jobsLoading } = useQuery({
    queryKey: ['auto-apply-jobs'],
    queryFn: () => autoApplyApi.getJobs({ limit: 20 }).then(r => r.data.data ?? r.data),
    retry: false,
  });

  useEffect(() => {
    if (raw) {
      setSettings({ ...DEFAULTS, ...raw });
      setDirty(false);
    }
  }, [raw]);

  const save = useMutation({
    mutationFn: () => autoApplyApi.updateSettings(settings),
    onSuccess: () => {
      toast.success('Auto-apply settings saved');
      qc.invalidateQueries({ queryKey: ['auto-apply-settings'] });
      setDirty(false);
    },
    onError: () => toast.error('Failed to save settings. Please try again.'),
  });

  function patch<K extends keyof AutoApplySettings>(key: K, value: AutoApplySettings[K]) {
    setSettings(s => ({ ...s, [key]: value }));
    setDirty(true);
  }

  function addTag(field: 'blacklistedCompanies' | 'blacklistedKeywords', value: string) {
    const trimmed = value.trim();
    if (!trimmed || settings[field].includes(trimmed)) return;
    patch(field, [...settings[field], trimmed]);
  }

  function removeTag(field: 'blacklistedCompanies' | 'blacklistedKeywords', tag: string) {
    patch(field, settings[field].filter(t => t !== tag));
  }

  const jobs: any[] = Array.isArray(jobsRaw) ? jobsRaw : (jobsRaw as any)?.data ?? [];

  if (isLoading) {
    return (
      <>
        <TopBar title="Auto Apply" />
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-28 rounded-3xl" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-44 rounded-2xl" />
              <Skeleton className="h-56 rounded-2xl" />
            </div>
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Auto Apply" />

      <div className="p-6 max-w-7xl mx-auto space-y-6 pb-24">

        {/* Hero Header Banner */}
        <div className="glass rounded-3xl border border-border/50 p-6 md:p-8 bg-gradient-to-r from-primary/15 via-surface to-accent/15 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(262_83%_58%/0.15),transparent_50%)]" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 mb-2">
                <Sparkles className="h-3.5 w-3.5" /> AI Job Application Assistant
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground font-['Outfit',sans-serif]">Auto-Apply Bot</h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Set your preferences, minimum match score thresholds, and let Mune Work automatically apply to matching jobs in the background.
              </p>
            </div>

            {/* Master Toggle Button Card */}
            <div className={cn(
              'glass rounded-2xl border p-4 px-6 flex items-center gap-4 transition-all duration-300 shrink-0 shadow-lg',
              settings.enableAutoApply
                ? 'border-primary/40 bg-primary/10 shadow-[0_0_30px_hsl(262_83%_58%/0.18)]'
                : 'border-border/60 bg-surface-raised/80',
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  'h-12 w-12 rounded-xl flex items-center justify-center transition-colors',
                  settings.enableAutoApply ? 'bg-primary text-primary-foreground shadow-md' : 'bg-surface border border-border text-muted-foreground',
                )}>
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {settings.enableAutoApply ? 'Auto Apply Active' : 'Auto Apply Disabled'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {settings.enableAutoApply ? 'Running in background' : 'Click to enable automation'}
                  </p>
                </div>
              </div>
              <Toggle value={settings.enableAutoApply} onChange={v => patch('enableAutoApply', v)} />
            </div>
          </div>
        </div>

        {/* 2-Column Grid Layout */}
        <div className="grid lg:grid-cols-3 gap-6 items-start">

          {/* Left Column: Settings (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Pause & General Controls */}
            <Card title="Automation Controls" icon={Settings2}>
              <div className="space-y-4">
                <Row
                  icon={settings.pauseAutoApply ? PauseCircle : PlayCircle}
                  title="Pause Auto-Apply"
                  subtitle="Temporarily pause execution without losing your blacklists and settings"
                  control={<Toggle value={settings.pauseAutoApply} onChange={v => patch('pauseAutoApply', v)} />}
                />
                <div className="border-t border-border/40 pt-4">
                  <Row
                    icon={CheckCircle2}
                    title="Skip Already Applied Jobs"
                    subtitle="Don't re-apply to job listings you've already applied to manually"
                    control={<Toggle value={settings.skipAlreadyApplied} onChange={v => patch('skipAlreadyApplied', v)} />}
                  />
                </div>
              </div>
            </Card>

            {/* Match Threshold Slider */}
            <Card title="AI Match Score Threshold" icon={Sparkles}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">Minimum Match Score</p>
                    <p className="text-xs text-muted-foreground">Only apply to jobs with at least this AI match score</p>
                  </div>
                  <span className="text-2xl font-black text-primary font-['Outfit',sans-serif]">
                    {settings.minimumMatchPercentage}%
                  </span>
                </div>

                <div className="space-y-2">
                  <input
                    type="range"
                    min={50}
                    max={95}
                    step={5}
                    value={settings.minimumMatchPercentage}
                    onChange={e => patch('minimumMatchPercentage', Number(e.target.value))}
                    className="w-full accent-primary h-2 bg-surface-raised rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                    <span>50% (Flexible)</span>
                    <span>75% (Balanced)</span>
                    <span>95% (Strict)</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Timing Rules */}
            <Card title="Application Timing & Schedule" icon={Clock}>
              <div className="space-y-4">
                <Row
                  icon={Zap}
                  title="Apply Immediately"
                  subtitle="Apply as soon as a matching job is posted instead of batching"
                  control={<Toggle value={settings.applyImmediately} onChange={v => patch('applyImmediately', v)} />}
                />

                {!settings.applyImmediately && (
                  <div className="border-t border-border/40 pt-4 grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Batch Apply Time</label>
                      <input
                        type="time"
                        value={settings.batchApplyTime}
                        onChange={e => patch('batchApplyTime', e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-surface-raised border border-border/60 rounded-xl text-foreground font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Timezone</label>
                      <select
                        value={settings.timezone}
                        onChange={e => patch('timezone', e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-surface-raised border border-border/60 rounded-xl text-foreground font-medium"
                      >
                        {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <div className="border-t border-border/40 pt-4">
                  <Row
                    icon={Clock}
                    title="Apply on Weekends"
                    subtitle="Include Saturday and Sunday in auto-apply schedule"
                    control={<Toggle value={settings.applyOnWeekends} onChange={v => patch('applyOnWeekends', v)} />}
                  />
                </div>
              </div>
            </Card>

            {/* Blacklists & Filters */}
            <Card title="Blacklists & Exclusions" icon={ShieldAlert}>
              <div className="space-y-6">
                {/* Companies */}
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Blacklisted Companies</p>
                  <p className="text-xs text-muted-foreground mb-3">Auto apply will skip any jobs posted by these companies</p>
                  <div className="flex gap-2 mb-3">
                    <input
                      placeholder="Add company name…"
                      value={companyInput}
                      onChange={e => setCompanyInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag('blacklistedCompanies', companyInput); setCompanyInput(''); } }}
                      className="flex-1 h-9 px-3 text-xs bg-surface-raised border border-border/60 rounded-xl text-foreground"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 px-4 rounded-xl text-xs"
                      onClick={() => { addTag('blacklistedCompanies', companyInput); setCompanyInput(''); }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>
                  <TagList tags={settings.blacklistedCompanies} onRemove={t => removeTag('blacklistedCompanies', t)} />
                </div>

                {/* Keywords */}
                <div className="border-t border-border/40 pt-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Blacklisted Keywords</p>
                  <p className="text-xs text-muted-foreground mb-3">Skip jobs containing specific titles or keywords (e.g., Unpaid, Senior, Crypto)</p>
                  <div className="flex gap-2 mb-3">
                    <input
                      placeholder="Add keyword…"
                      value={keywordInput}
                      onChange={e => setKeywordInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag('blacklistedKeywords', keywordInput); setKeywordInput(''); } }}
                      className="flex-1 h-9 px-3 text-xs bg-surface-raised border border-border/60 rounded-xl text-foreground"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 px-4 rounded-xl text-xs"
                      onClick={() => { addTag('blacklistedKeywords', keywordInput); setKeywordInput(''); }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>
                  <TagList tags={settings.blacklistedKeywords} onRemove={t => removeTag('blacklistedKeywords', t)} />
                </div>
              </div>
            </Card>

            {/* Target Job Preferences */}
            <Card title="Target Job Preferences" icon={Sliders}>
              <div className="space-y-6">

                {/* Work Types */}
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Preferred Work Types</p>
                  <p className="text-xs text-muted-foreground mb-3">Auto apply will match jobs fitting your preferred work style</p>
                  <div className="flex flex-wrap gap-2">
                    {['REMOTE', 'ONSITE', 'HYBRID'].map(wt => {
                      const active = settings.workTypes.includes(wt);
                      return (
                        <button
                          type="button"
                          key={wt}
                          onClick={() => {
                            const updated = active
                              ? settings.workTypes.filter(w => w !== wt)
                              : [...settings.workTypes, wt];
                            patch('workTypes', updated);
                          }}
                          className={cn(
                            'px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all',
                            active
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'border-border bg-surface-raised text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {wt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Desired Titles */}
                <div className="border-t border-border/40 pt-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Target Job Titles</p>
                  <p className="text-xs text-muted-foreground mb-3">Specific job titles to target for auto applications</p>
                  <div className="flex gap-2 mb-3">
                    <input
                      placeholder="Add job title e.g. Frontend Engineer…"
                      value={titleInput}
                      onChange={e => setTitleInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && titleInput.trim()) {
                          e.preventDefault();
                          if (!settings.desiredJobTitles.includes(titleInput.trim())) {
                            patch('desiredJobTitles', [...settings.desiredJobTitles, titleInput.trim()]);
                          }
                          setTitleInput('');
                        }
                      }}
                      className="flex-1 h-9 px-3 text-xs bg-surface-raised border border-border/60 rounded-xl text-foreground"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 px-4 rounded-xl text-xs"
                      onClick={() => {
                        if (titleInput.trim() && !settings.desiredJobTitles.includes(titleInput.trim())) {
                          patch('desiredJobTitles', [...settings.desiredJobTitles, titleInput.trim()]);
                        }
                        setTitleInput('');
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>
                  <TagList tags={settings.desiredJobTitles} onRemove={t => patch('desiredJobTitles', settings.desiredJobTitles.filter(x => x !== t))} />
                </div>

                {/* Relocation & Preferred Countries */}
                <div className="border-t border-border/40 pt-4 space-y-3">
                  <Row
                    icon={MapPin}
                    title="Open to Relocation"
                    subtitle="Allow auto-apply to target opportunities in preferred countries"
                    control={<Toggle value={settings.openToRelocation} onChange={v => patch('openToRelocation', v)} />}
                  />

                  {settings.openToRelocation && (
                    <div className="pl-2 pt-2 border-l-2 border-primary/30 space-y-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Most Preferred Countries</p>
                      <div className="flex gap-2 mb-3">
                        <input
                          placeholder="Add country e.g. Canada, Germany…"
                          value={prefCountryInput}
                          onChange={e => setPrefCountryInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && prefCountryInput.trim()) {
                              e.preventDefault();
                              if (!settings.preferredCountries.includes(prefCountryInput.trim())) {
                                patch('preferredCountries', [...settings.preferredCountries, prefCountryInput.trim()]);
                              }
                              setPrefCountryInput('');
                            }
                          }}
                          className="flex-1 h-9 px-3 text-xs bg-surface-raised border border-border/60 rounded-xl text-foreground"
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-9 px-4 rounded-xl text-xs"
                          onClick={() => {
                            if (prefCountryInput.trim() && !settings.preferredCountries.includes(prefCountryInput.trim())) {
                              patch('preferredCountries', [...settings.preferredCountries, prefCountryInput.trim()]);
                            }
                            setPrefCountryInput('');
                          }}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add
                        </Button>
                      </div>
                      <TagList tags={settings.preferredCountries} onRemove={t => patch('preferredCountries', settings.preferredCountries.filter(x => x !== t))} />
                    </div>
                  )}
                </div>

                {/* Preferred Companies */}
                <div className="border-t border-border/40 pt-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Most Preferred Companies</p>
                  <p className="text-xs text-muted-foreground mb-3">Prioritize applications for these target companies</p>
                  <div className="flex gap-2 mb-3">
                    <input
                      placeholder="Add company name…"
                      value={prefCompanyInput}
                      onChange={e => setPrefCompanyInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && prefCompanyInput.trim()) {
                          e.preventDefault();
                          if (!settings.preferredCompanies.includes(prefCompanyInput.trim())) {
                            patch('preferredCompanies', [...settings.preferredCompanies, prefCompanyInput.trim()]);
                          }
                          setPrefCompanyInput('');
                        }
                      }}
                      className="flex-1 h-9 px-3 text-xs bg-surface-raised border border-border/60 rounded-xl text-foreground"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 px-4 rounded-xl text-xs"
                      onClick={() => {
                        if (prefCompanyInput.trim() && !settings.preferredCompanies.includes(prefCompanyInput.trim())) {
                          patch('preferredCompanies', [...settings.preferredCompanies, prefCompanyInput.trim()]);
                        }
                        setPrefCompanyInput('');
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>
                  <TagList tags={settings.preferredCompanies} onRemove={t => patch('preferredCompanies', settings.preferredCompanies.filter(x => x !== t))} />
                </div>

                {/* Multi-Currency Expected Salary */}
                <div className="border-t border-border/40 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Expected Salary (Multi-Currency)</p>
                      <p className="text-xs text-muted-foreground">Salary thresholds per currency for matching jobs</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowSalInput(!showSalInput)}>
                      <Plus className="h-3 w-3 mr-1" /> Add Range
                    </Button>
                  </div>

                  {settings.expectedSalaries.length > 0 && (
                    <div className="space-y-2">
                      {settings.expectedSalaries.map((s: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl border border-border bg-surface-raised/60 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase">{s.currency}</span>
                            <span className="font-semibold text-foreground">
                              {s.minAmount ? Number(s.minAmount).toLocaleString() : '0'} – {s.maxAmount ? Number(s.maxAmount).toLocaleString() : 'Any'}
                            </span>
                            <span className="text-muted-foreground">/ {s.frequency ?? 'yearly'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => patch('expectedSalaries', settings.expectedSalaries.filter((_: any, i: number) => i !== idx))}
                            className="text-muted-foreground hover:text-destructive p-1"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {showSalInput && (
                    <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <input
                          type="number"
                          placeholder="Min Amount"
                          value={salMin}
                          onChange={e => setSalMin(e.target.value)}
                          className="h-8 text-xs px-2 bg-surface border border-border/60 rounded-lg text-foreground"
                        />
                        <input
                          type="number"
                          placeholder="Max Amount"
                          value={salMax}
                          onChange={e => setSalMax(e.target.value)}
                          className="h-8 text-xs px-2 bg-surface border border-border/60 rounded-lg text-foreground"
                        />
                        <input
                          placeholder="Currency (USD, NGN)"
                          value={salCurrency}
                          onChange={e => setSalCurrency(e.target.value.toUpperCase())}
                          className="h-8 text-xs px-2 bg-surface border border-border/60 rounded-lg text-foreground"
                        />
                        <select
                          value={salFreq}
                          onChange={e => setSalFreq(e.target.value)}
                          className="h-8 text-xs px-2 bg-surface border border-border/60 rounded-lg text-foreground"
                        >
                          <option value="yearly">yearly</option>
                          <option value="monthly">monthly</option>
                          <option value="daily">daily</option>
                          <option value="weekly">weekly</option>
                          <option value="hourly">hourly</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="ghost" onClick={() => setShowSalInput(false)} className="h-7 text-xs">Cancel</Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            if (!salMin && !salMax) return;
                            const cleanCurr = salCurrency.toUpperCase().trim() || 'USD';
                            const cleanFreq = salFreq.toLowerCase().trim();
                            const duplicate = settings.expectedSalaries.find(
                              (s: any) => (s.currency || '').toUpperCase() === cleanCurr && (s.frequency || '').toLowerCase() === cleanFreq
                            );
                            if (duplicate) {
                              toast.error(`An expected salary for ${cleanCurr} (${cleanFreq}) already exists. Choose a different frequency.`);
                              return;
                            }
                            const item = {
                              currency: cleanCurr,
                              minAmount: Number(salMin) || 0,
                              maxAmount: Number(salMax) || 0,
                              frequency: cleanFreq,
                            };
                            patch('expectedSalaries', [...settings.expectedSalaries, item]);
                            setSalMin('');
                            setSalMax('');
                            setShowSalInput(false);
                          }}
                          className="h-7 text-xs"
                        >
                          Add Currency
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preferred Benefits */}
                <div className="border-t border-border/40 pt-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Most Preferred Benefits</p>
                  <p className="text-xs text-muted-foreground mb-3">Key benefits you expect or prefer (HMO, Housing, Travel, Equity)</p>
                  <div className="flex gap-2 mb-3">
                    <input
                      placeholder="Add benefit e.g. HMO, Housing, Travel…"
                      value={benefitInput}
                      onChange={e => setBenefitInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && benefitInput.trim()) {
                          e.preventDefault();
                          if (!settings.preferredBenefits.includes(benefitInput.trim())) {
                            patch('preferredBenefits', [...settings.preferredBenefits, benefitInput.trim()]);
                          }
                          setBenefitInput('');
                        }
                      }}
                      className="flex-1 h-9 px-3 text-xs bg-surface-raised border border-border/60 rounded-xl text-foreground"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 px-4 rounded-xl text-xs"
                      onClick={() => {
                        if (benefitInput.trim() && !settings.preferredBenefits.includes(benefitInput.trim())) {
                          patch('preferredBenefits', [...settings.preferredBenefits, benefitInput.trim()]);
                        }
                        setBenefitInput('');
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>
                  <TagList tags={settings.preferredBenefits} onRemove={t => patch('preferredBenefits', settings.preferredBenefits.filter(x => x !== t))} />
                </div>

              </div>
            </Card>

          </div>

          {/* Right Column: Activity Stream (1 Col) */}
          <div className="space-y-6 lg:sticky lg:top-5">

            <Card title="Auto-Applied History" icon={Briefcase}>
              {jobsLoading ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
              ) : jobs.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <Zap className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-foreground">No automated applications yet</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Once Enabled, Mune Work will automatically submit applications to matching jobs and list them here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {jobs.map((j: any) => (
                    <div key={j.id} className="p-3.5 rounded-2xl border border-border/40 bg-surface-raised/70 space-y-2 hover:border-primary/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{j.job?.title ?? j.jobTitle}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{j.job?.company ?? j.company}</p>
                        </div>
                        <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                          Applied
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                        <span>{timeAgo(j.createdAt)}</span>
                        {j.job?.id && (
                          <Link to={`/jobs/${j.job.id}`} className="text-primary font-semibold hover:underline flex items-center gap-1">
                            View <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Quick Tips */}
            <div className="glass rounded-2xl border border-border/50 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wide">
                <Sparkles className="h-4 w-4" /> Optimization Tip
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Make sure your default CV and skills profile are fully up to date in your <strong>Resume Builder</strong> so the AI can match high-scoring jobs accurately.
              </p>
            </div>

          </div>

        </div>

        {/* Floating Save Banner */}
        {dirty && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface/90 backdrop-blur-md border border-primary/40 rounded-2xl px-6 py-3 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200">
            <span className="text-xs font-semibold text-foreground">You have unsaved settings changes</span>
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending} className="gap-1.5 font-bold rounded-xl">
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save Changes
            </Button>
          </div>
        )}

      </div>
    </>
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

function Row({ icon: Icon, title, subtitle, control }: { icon: React.ElementType; title: string; subtitle: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-surface-raised border border-border/40 flex items-center justify-center text-primary shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {control}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        'w-12 h-6 rounded-full transition-colors relative border p-0.5 shrink-0',
        value ? 'bg-primary border-primary' : 'bg-surface-raised border-border/80',
      )}
    >
      <div className={cn(
        'w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
        value ? 'translate-x-6' : 'translate-x-0',
      )} />
    </button>
  );
}

function TagList({ tags, onRemove }: { tags: string[]; onRemove: (tag: string) => void }) {
  if (!tags.length) return <p className="text-xs text-muted-foreground italic">None added</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(t => (
        <span key={t} className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl bg-surface-raised border border-border/60 text-foreground">
          {t}
          <button type="button" onClick={() => onRemove(t)} className="text-muted-foreground hover:text-destructive transition-colors">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
