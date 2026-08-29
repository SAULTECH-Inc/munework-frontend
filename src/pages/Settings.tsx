import { useState, useRef, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2, Shield, User, Bell, CreditCard, QrCode, AlertTriangle,
  Camera, X, Link, MapPin, Briefcase, Building2, Users, Gavel,
  GraduationCap, FileText, Plus, Trash2, Wrench, Trophy,
  FolderOpen, Sparkles, ChevronDown, Target, Eye, EyeOff, Lock,
  Check, Zap, Star, CheckCircle2, XCircle, Mail, Smartphone,
  Monitor, LogOut, Download, ExternalLink, ReceiptText,
  Globe, UserCheck, Network, Bot, Sliders,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { TopBar } from '@/components/common/TopBar';
import { useAuthStore } from '@/store/auth.store';
import { authApi, usersApi, subscriptionsApi, settingsApi, autoApplyApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { COUNTRIES, SKILLS, CERTIFICATIONS, INDUSTRIES, COMPANY_SIZES, JOB_TITLES, generateSummaryFromTitle } from '@/lib/profile-data';
import type {
  ApplicantProfile, EmployerProfile,
  ProfileEducation, ProfileExperience, ProfileSkill, ProfileLanguage,
  ProfileCertification, ProfileAward, ProfileReference,
  ProfileSalaryRange, ProfileLocation,
} from '@/types';
import { Switch } from '@/components/ui/switch';
import DatePicker from '@/components/ui/date-picker';
import RichTextEditor from '@/components/ui/rich-text-editor';
import toast from 'react-hot-toast';
import { WhatsAppPanel } from './settings/WhatsAppPanel';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'At least 8 characters'),
  confirm: z.string(),
}).refine(d => d.newPassword === d.confirm, { message: "Passwords don't match", path: ['confirm'] });

// ─── Shared UI helpers ─────────────────────────────────────────────────────────

function Section({ id, title, icon: Icon, children }: { id?: string; title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-4 space-y-3">
      <div className="flex items-center gap-2 pb-1 border-b border-border">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1.5 block">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('');
  function add() {
    const t = input.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput('');
  }
  return (
    <div className="rounded-lg border border-border bg-surface px-2.5 py-2 flex flex-wrap gap-1.5 min-h-[38px]">
      {value.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
          {tag}
          <button type="button" onClick={() => onChange(value.filter(t => t !== tag))}><X className="h-2.5 w-2.5" /></button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } if (e.key === ',') { e.preventDefault(); add(); } }}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] text-xs bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

/** Single-value searchable combobox with predefined options + custom entry */
function Combobox({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 30);
    return options.filter(o => o.toLowerCase().includes(q)).slice(0, 30);
  }, [query, options]);

  return (
    <div className="relative">
      <div className="relative">
        <Input
          value={open ? query : value}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); }}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onBlur={() => setTimeout(() => { setOpen(false); setQuery(''); }, 160)}
          placeholder={placeholder}
          className="pr-7"
        />
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={cn(
                'w-full text-left px-3 py-2 text-xs transition-colors',
                value === opt ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-surface-raised text-foreground',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Tag input with autocomplete from a predefined list */
function SkillTagInput({ value, onChange, options, placeholder }: {
  value: string[];
  onChange: (v: string[]) => void;
  options: string[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    return options
      .filter(o => o.toLowerCase().includes(query.toLowerCase()) && !value.includes(o))
      .slice(0, 8);
  }, [query, options, value]);

  const canAddNew = query.trim() !== '' &&
    !options.some(o => o.toLowerCase() === query.trim().toLowerCase()) &&
    !value.some(v => v.toLowerCase() === query.trim().toLowerCase());

  const dropdownVisible = open && (suggestions.length > 0 || canAddNew);

  function add(item: string) {
    const v = item.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="rounded-lg border border-border bg-surface px-2.5 py-2 flex flex-wrap gap-1.5 min-h-[38px]">
        {value.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {tag}
            <button type="button" onClick={() => onChange(value.filter(t => t !== tag))}><X className="h-2.5 w-2.5" /></button>
          </span>
        ))}
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={e => {
            if ((e.key === 'Enter' || e.key === ',') && query.trim()) { e.preventDefault(); add(query); }
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 160)}
          placeholder={value.length === 0 ? placeholder : 'Search or type…'}
          className="flex-1 min-w-[140px] text-xs bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>
      {dropdownVisible && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => add(s)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-primary/10 text-foreground transition-colors"
            >
              {s}
            </button>
          ))}
          {canAddNew && (
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => add(query)}
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
            >
              <Plus className="h-3 w-3" />
              Add "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AvatarUpload({ src, label, onFile }: { src?: string; label: string; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <div className="h-16 w-16 rounded-full bg-surface-raised border border-border flex items-center justify-center overflow-hidden">
          {src ? <img src={src} className="h-full w-full object-cover" /> : <User className="h-6 w-6 text-muted-foreground" />}
        </div>
        <button type="button" onClick={() => ref.current?.click()} className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow">
          <Camera className="h-3 w-3 text-white" />
        </button>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG or WebP · max 2MB</p>
      </div>
    </div>
  );
}

function ItemRow({ primary, secondary, onRemove }: { primary: string; secondary?: string; onRemove: () => void }) {
  return (
    <div className="flex items-start justify-between px-3 py-2 rounded-lg bg-surface-raised border border-border">
      <div>
        <p className="text-xs font-medium">{primary}</p>
        {secondary && <p className="text-[11px] text-muted-foreground mt-0.5">{secondary}</p>}
      </div>
      <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive ml-2 shrink-0 mt-0.5">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AddFormBox({ children, onSave, onCancel }: { children: React.ReactNode; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="border border-primary/30 rounded-lg p-3 space-y-3 bg-primary/5">
      {children}
      <div className="flex gap-2 pt-1">
        <Button size="sm" type="button" onClick={onSave}>Add</Button>
        <Button size="sm" variant="outline" type="button" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function AddLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 text-xs text-primary hover:underline">
      <Plus className="h-3 w-3" />{label}
    </button>
  );
}

// ─── Section nav config ────────────────────────────────────────────────────────

const PROFILE_SECTIONS = [
  { id: 'sec-personal',   icon: User,          label: 'Personal'    },
  { id: 'sec-address',    icon: MapPin,         label: 'Address'     },
  { id: 'sec-summary',    icon: Sparkles,       label: 'Summary'     },
  { id: 'sec-prefs',      icon: Target,         label: 'Preferences' },
  { id: 'sec-education',  icon: GraduationCap,  label: 'Education'   },
  { id: 'sec-experience', icon: Briefcase,      label: 'Experience'  },
  { id: 'sec-skills',     icon: Wrench,         label: 'Skills'      },
  { id: 'sec-portfolio',  icon: FolderOpen,     label: 'Portfolio'   },
  { id: 'sec-awards',     icon: Trophy,         label: 'Awards'      },
  { id: 'sec-references', icon: Users,          label: 'References'  },
  { id: 'sec-social',     icon: Link,           label: 'Social'      },
  { id: 'sec-documents',  icon: FileText,       label: 'Documents'   },
] as const;

// ─── Main Settings page ────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuthStore();
  return (
    <>
      <TopBar title="Settings" />
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Settings Header Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-primary/8 to-accent/10 px-6 py-6">
          <div className="pointer-events-none absolute top-0 right-0 h-40 w-40 rounded-full bg-accent/10 blur-[60px]" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 mb-2">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-bold text-primary tracking-wide">Account Control Center</span>
              </div>
              <h2 className="text-xl font-bold font-['Outfit',sans-serif]">Account Settings</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Manage your credentials, security preferences, notification channels, and billing plan.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
              <span className="px-3 py-1.5 rounded-xl bg-surface/80 border border-border/50 font-semibold font-['Outfit',sans-serif]">
                User: <span className="text-foreground">{user?.email}</span>
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Tabs Layout */}
        <Tabs defaultValue="security" orientation="vertical" className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Left Category Sidebar (4 cols) */}
          <TabsList className="md:col-span-4 flex-col h-auto shrink-0 items-stretch bg-transparent p-0 gap-2">
            {[
              { value: 'security',      icon: Shield,     label: 'Security & Auth', desc: 'Passwords, 2FA & active sessions' },
              { value: 'privacy',       icon: Eye,        label: 'Privacy Control', desc: 'Profile visibility & discovery' },
              { value: 'notifications', icon: Bell,       label: 'Notifications',  desc: 'Email, push alerts & digests' },
              { value: 'billing',       icon: CreditCard, label: 'Billing & Plans', desc: 'Subscriptions, invoices & gateways' },
            ].map(t => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className={cn(
                  'justify-start gap-3.5 text-left p-3.5 rounded-2xl border border-border/50 bg-surface/70 transition-all duration-200 select-none group',
                  'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/15 data-[state=active]:via-primary/10 data-[state=active]:to-transparent',
                  'data-[state=active]:border-primary/40 data-[state=active]:text-primary data-[state=active]:shadow-[0_4px_20px_hsl(262_83%_58%/0.12)]',
                  'hover:border-primary/30 hover:bg-surface-raised/60',
                )}
              >
                <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-data-[state=active]:bg-primary group-data-[state=active]:text-white transition-colors">
                  <t.icon className="h-4 w-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold font-['Outfit',sans-serif] text-foreground group-data-[state=active]:text-primary">{t.label}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{t.desc}</span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Right Main Content Area (8 cols) */}
          <div className="md:col-span-8 min-w-0">
            <TabsContent value="security" className="m-0 focus-visible:outline-none"><SecurityTab /></TabsContent>
            <TabsContent value="privacy" className="m-0 focus-visible:outline-none"><PrivacyTab /></TabsContent>
            <TabsContent value="notifications" className="m-0 focus-visible:outline-none"><NotificationsTab /></TabsContent>
            <TabsContent value="billing" className="m-0 focus-visible:outline-none"><BillingTab /></TabsContent>
          </div>
        </Tabs>

      </div>
    </>
  );
}

// ─── Applicant profile ─────────────────────────────────────────────────────────

const JOB_TYPE_OPTIONS = [
  { value: 'full_time',  label: 'Full Time'   },
  { value: 'part_time',  label: 'Part Time'   },
  { value: 'contract',   label: 'Contract'    },
  { value: 'freelance',  label: 'Freelance'   },
  { value: 'internship', label: 'Internship'  },
  { value: 'temporary',  label: 'Temporary'   },
  { value: 'volunteer',  label: 'Volunteer'   },
];
const PROFICIENCY_LEVELS = ['Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'];
const LANGUAGE_LEVELS   = ['Basic', 'Conversational', 'Proficient', 'Fluent', 'Native'];
const SALARY_FREQUENCIES = ['yearly', 'monthly', 'weekly', 'hourly'] as const;

function ApplicantProfileTab() {
  const { user, updateUser } = useAuthStore();
  const qc = useQueryClient();

  const { data: profile } = useQuery<ApplicantProfile>({
    queryKey: ['applicant-profile'],
    queryFn: () => usersApi.getApplicantProfile().then(r => r.data.data ?? r.data),
  });

  const p = profile ?? (user as any);

  const { register, handleSubmit, watch, setValue } = useForm({
    values: {
      firstName: p?.firstName ?? '',
      lastName: p?.lastName ?? '',
      middleName: p?.middleName ?? '',
      phoneNumber: p?.phoneNumber ?? '',
      bio: p?.bio ?? '',
      dateOfBirth: p?.dateOfBirth ? String(p.dateOfBirth).slice(0, 10) : '',
      country: p?.country ?? '',
      state: p?.state ?? '',
      city: p?.city ?? '',
      zipCode: p?.zipCode ?? '',
      address: p?.address ?? '',
      professionalTitle: p?.professionalTitle ?? '',
      professionalSummary: p?.professionalSummary ?? '',
      headline: p?.headline ?? '',
      yearsOfExperience: p?.yearsOfExperience ?? '',
      linkedInProfile: p?.linkedInProfile ?? '',
      githubProfile: p?.githubProfile ?? '',
      twitterProfile: p?.twitterProfile ?? '',
      instagramProfile: p?.instagramProfile ?? '',
      facebookProfile: p?.facebookProfile ?? '',
      youtubeProfile: p?.youtubeProfile ?? '',
      cvLink: p?.cvLink ?? '',
      coverLetterLink: p?.coverLetterLink ?? '',
      videoCv: p?.videoCv ?? '',
      governmentId: p?.governmentId ?? '',
      openToRelocation: p?.openToRelocation ?? false,
      desiredJobTitles: (p?.desiredJobTitles ?? []) as string[],
      jobTypes: (p?.jobTypes ?? []) as string[],
    },
  });

  const desiredJobTitles: string[] = watch('desiredJobTitles') as string[] ?? [];
  const jobTypes: string[] = watch('jobTypes') as string[] ?? [];

  // List state
  const [education,         setEducation]         = useState<ProfileEducation[]>([]);
  const [experience,        setExperience]        = useState<ProfileExperience[]>([]);
  const [skills,            setSkills]            = useState<ProfileSkill[]>([]);
  const [languages,         setLanguages]         = useState<ProfileLanguage[]>([]);
  const [certifications,    setCertifications]    = useState<ProfileCertification[]>([]);
  const [awards,            setAwards]            = useState<ProfileAward[]>([]);
  const [references,        setReferences]        = useState<ProfileReference[]>([]);
  const [preferredLocations,setPreferredLocations]= useState<ProfileLocation[]>([]);
  const [salaryRanges,      setSalaryRanges]      = useState<ProfileSalaryRange[]>([]);
  const [portfolioLinks,    setPortfolioLinks]    = useState<string[]>([]);

  // Initialise lists when profile loads
  useEffect(() => {
    if (!profile) return;
    setEducation(profile.education ?? []);
    setExperience(profile.workExperience ?? []);
    setSkills(profile.skills ?? []);
    setLanguages(profile.languages ?? []);
    setCertifications(profile.certifications ?? []);
    setAwards(profile.awards ?? []);
    setReferences(profile.references ?? []);
    setPreferredLocations(profile.preferredLocations ?? []);
    setSalaryRanges(profile.salaryRanges ?? []);
    setPortfolioLinks(profile.portfolioLinks ?? []);
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Add-form draft state
  const [addingEdu,     setAddingEdu]     = useState(false);
  const [eduDraft,      setEduDraft]      = useState<Partial<ProfileEducation>>({});
  const [addingExp,     setAddingExp]     = useState(false);
  const [expDraft,      setExpDraft]      = useState<Partial<ProfileExperience>>({});
  const [addingSkill,   setAddingSkill]   = useState(false);
  const [skillDraft,    setSkillDraft]    = useState<Partial<ProfileSkill>>({});
  const [addingLang,    setAddingLang]    = useState(false);
  const [langDraft,     setLangDraft]     = useState<Partial<ProfileLanguage>>({});
  const [addingCert,    setAddingCert]    = useState(false);
  const [certDraft,     setCertDraft]     = useState<Partial<ProfileCertification>>({});
  const [addingAward,   setAddingAward]   = useState(false);
  const [awardDraft,    setAwardDraft]    = useState<Partial<ProfileAward>>({});
  const [addingRef,     setAddingRef]     = useState(false);
  const [refDraft,      setRefDraft]      = useState<Partial<ProfileReference>>({});
  const [addingLoc,     setAddingLoc]     = useState(false);
  const [locDraft,      setLocDraft]      = useState<Partial<ProfileLocation>>({});
  const [addingSalary,  setAddingSalary]  = useState(false);
  const [salaryDraft,   setSalaryDraft]   = useState<Partial<ProfileSalaryRange>>({ currency: 'USD', frequency: 'yearly' });
  const [addingPortfolio, setAddingPortfolio] = useState(false);
  const [portfolioDraft,  setPortfolioDraft]  = useState('');

  // Section nav active state
  const [activeSection, setActiveSection] = useState<string>(PROFILE_SECTIONS[0].id);

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    function update() {
      const hits = PROFILE_SECTIONS.map(s => ({
        id: s.id,
        top: document.getElementById(s.id)?.getBoundingClientRect().top ?? Infinity,
      })).filter(s => s.top < 180);
      if (hits.length) setActiveSection(hits[hits.length - 1].id);
    }
    main.addEventListener('scroll', update, { passive: true });
    return () => main.removeEventListener('scroll', update);
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Save mutation
  const save = useMutation({
    mutationFn: (scalarData: any) => usersApi.updateApplicantProfile({
      ...scalarData,
      education,
      workExperience: experience,
      skills,
      languages,
      certifications,
      awards,
      references,
      preferredLocations,
      salaryRanges,
      portfolioLinks,
    }),
    onSuccess: (res) => {
      const updated = res.data.data ?? res.data;
      updateUser(updated);
      qc.setQueryData(['applicant-profile'], updated);
      toast.success('Profile saved');
    },
    onError: () => toast.error('Save failed'),
  });

  const uploadPic = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return usersApi.updateApplicantPicture(form);
    },
    onSuccess: (res) => {
      const url = res.data.data?.url ?? res.data?.url;
      if (url) updateUser({ profilePicture: url });
      toast.success('Photo updated');
    },
  });

  function toggleJobType(jt: string) {
    const cur: string[] = watch('jobTypes') as string[] ?? [];
    setValue('jobTypes', cur.includes(jt) ? cur.filter(x => x !== jt) : [...cur, jt]);
  }

  function handleGenerateSummary() {
    const title = (watch('professionalTitle') as string ?? '').trim();
    if (!title) { toast.error('Enter a professional title first'); return; }
    const suggestion = generateSummaryFromTitle(title);
    setValue('professionalSummary', suggestion);
    toast.success('Summary generated — feel free to edit it');
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(d => save.mutate(d))}>
      <div className="flex gap-5">

        {/* ── Section nav (sticky) ── */}
        <div className="w-36 shrink-0">
          <div className="sticky top-4 space-y-0.5">
            <Button type="submit" size="sm" className="w-full mb-3 text-xs" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save all'}
            </Button>

            {PROFILE_SECTIONS.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(s.id)}
                className={cn(
                  'w-full flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg transition-colors text-left',
                  activeSection === s.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-raised',
                )}
              >
                <s.icon className="h-3 w-3 shrink-0" />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Form content ── */}
        <div className="flex-1 min-w-0 space-y-10">

          {/* Avatar */}
          <AvatarUpload
            src={p?.profilePicture}
            label={[p?.firstName, p?.lastName].filter(Boolean).join(' ') || 'Your photo'}
            onFile={uploadPic.mutate}
          />

          {/* ── Personal information ── */}
          <Section id="sec-personal" title="Personal information" icon={User}>
            <div className="grid grid-cols-3 gap-3">
              <Field label="First name" required><Input {...register('firstName')} /></Field>
              <Field label="Middle name"><Input {...register('middleName')} /></Field>
              <Field label="Last name" required><Input {...register('lastName')} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone number">
                <Input type="tel" placeholder="+1 555 000 0000" {...register('phoneNumber')} />
              </Field>
              <Field label="Date of birth">
                <DatePicker
                  selectedDate={watch('dateOfBirth') ? new Date(watch('dateOfBirth') as string) : null}
                  onDateChange={d => setValue('dateOfBirth', d ? d.toISOString().slice(0, 10) : '')}
                />
              </Field>
            </div>
            <Field label="Bio / About me">
              <textarea
                {...register('bio')}
                rows={3}
                placeholder="Tell employers about yourself…"
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-1 focus:ring-primary/50 resize-none"
              />
            </Field>
            <Field label="Government ID (optional)">
              <Input placeholder="National ID / Passport number" {...register('governmentId')} />
            </Field>
          </Section>

          {/* ── Address ── */}
          <Section id="sec-address" title="Address" icon={MapPin}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Country">
                <Combobox
                  value={watch('country') as string}
                  onChange={v => setValue('country', v)}
                  options={COUNTRIES}
                  placeholder="Search country…"
                />
              </Field>
              <Field label="State / Province">
                <Input placeholder="Lagos State" {...register('state')} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City"><Input placeholder="Lagos" {...register('city')} /></Field>
              <Field label="ZIP / Postal code"><Input placeholder="100001" {...register('zipCode')} /></Field>
            </div>
            <Field label="Street address"><Input placeholder="123 Main Street" {...register('address')} /></Field>
          </Section>

          {/* ── Professional summary ── */}
          <Section id="sec-summary" title="Professional summary" icon={Sparkles}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Professional title">
                <Input placeholder="e.g. Senior Frontend Engineer" {...register('professionalTitle')} />
              </Field>
              <Field label="Headline">
                <Input placeholder="e.g. Building great UX since 2018" {...register('headline')} />
              </Field>
            </div>
            <Field label="Years of experience">
              <Input placeholder="e.g. 5" {...register('yearsOfExperience')} />
            </Field>
            <Field label="Professional summary">
              <div className="space-y-1.5">
                <RichTextEditor
                  value={watch('professionalSummary') as string ?? ''}
                  onChange={v => setValue('professionalSummary', v)}
                  placeholder="Summarise your professional background, core strengths and career goals…"
                  minHeight={140}
                />
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Sparkles className="h-3 w-3" />
                  Generate from my professional title
                </button>
              </div>
            </Field>
          </Section>

          {/* ── Career preferences ── */}
          <Section id="sec-prefs" title="Career preferences" icon={Target}>
            <Field label="Desired job titles">
              <SkillTagInput
                value={desiredJobTitles}
                onChange={v => setValue('desiredJobTitles', v)}
                options={JOB_TITLES}
                placeholder="Search or type a job title…"
              />
            </Field>

            <Field label="Job types">
              <div className="flex flex-wrap gap-2 pt-1">
                {JOB_TYPE_OPTIONS.map(jt => (
                  <button
                    key={jt.value}
                    type="button"
                    onClick={() => toggleJobType(jt.value)}
                    className={cn(
                      'text-xs px-3 py-1 rounded-full border transition-colors',
                      jobTypes.includes(jt.value)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface border-border text-muted-foreground hover:border-primary/50',
                    )}
                  >
                    {jt.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Preferred locations">
              <div className="space-y-1.5">
                {preferredLocations.map((loc, i) => (
                  <ItemRow key={i} primary={`${loc.city}, ${loc.country}`} onRemove={() => setPreferredLocations(preferredLocations.filter((_, j) => j !== i))} />
                ))}
                {addingLoc ? (
                  <AddFormBox
                    onSave={() => {
                      if (locDraft.country && locDraft.city) { setPreferredLocations([...preferredLocations, locDraft as ProfileLocation]); setLocDraft({}); setAddingLoc(false); }
                      else toast.error('Both country and city are required');
                    }}
                    onCancel={() => { setLocDraft({}); setAddingLoc(false); }}
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Country" required>
                        <Combobox value={locDraft.country ?? ''} onChange={v => setLocDraft({ ...locDraft, country: v })} options={COUNTRIES} placeholder="Search country…" />
                      </Field>
                      <Field label="City" required>
                        <Input placeholder="Lagos" value={locDraft.city ?? ''} onChange={e => setLocDraft({ ...locDraft, city: e.target.value })} />
                      </Field>
                    </div>
                  </AddFormBox>
                ) : <AddLink onClick={() => setAddingLoc(true)} label="Add preferred location" />}
              </div>
            </Field>

            <Field label="Salary expectations">
              <div className="space-y-1.5">
                {salaryRanges.map((s, i) => (
                  <ItemRow key={i} primary={`${s.currency} ${s.minAmount.toLocaleString()} – ${s.maxAmount.toLocaleString()}`} secondary={s.frequency} onRemove={() => setSalaryRanges(salaryRanges.filter((_, j) => j !== i))} />
                ))}
                {addingSalary ? (
                  <AddFormBox
                    onSave={() => {
                      const { currency, minAmount, maxAmount, frequency } = salaryDraft;
                      if (currency && minAmount != null && maxAmount != null && frequency) { setSalaryRanges([...salaryRanges, salaryDraft as ProfileSalaryRange]); setSalaryDraft({ currency: 'USD', frequency: 'yearly' }); setAddingSalary(false); }
                      else toast.error('All salary fields are required');
                    }}
                    onCancel={() => { setSalaryDraft({ currency: 'USD', frequency: 'yearly' }); setAddingSalary(false); }}
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Currency">
                        <Input placeholder="USD" value={salaryDraft.currency ?? ''} onChange={e => setSalaryDraft({ ...salaryDraft, currency: e.target.value })} />
                      </Field>
                      <Field label="Frequency">
                        <select value={salaryDraft.frequency ?? 'yearly'} onChange={e => setSalaryDraft({ ...salaryDraft, frequency: e.target.value as ProfileSalaryRange['frequency'] })} className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-1 focus:ring-primary/50">
                          {SALARY_FREQUENCIES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                        </select>
                      </Field>
                      <Field label="Min amount">
                        <Input type="number" placeholder="30000" value={salaryDraft.minAmount ?? ''} onChange={e => setSalaryDraft({ ...salaryDraft, minAmount: Number(e.target.value) })} />
                      </Field>
                      <Field label="Max amount">
                        <Input type="number" placeholder="60000" value={salaryDraft.maxAmount ?? ''} onChange={e => setSalaryDraft({ ...salaryDraft, maxAmount: Number(e.target.value) })} />
                      </Field>
                    </div>
                  </AddFormBox>
                ) : <AddLink onClick={() => setAddingSalary(true)} label="Add salary range" />}
              </div>
            </Field>

            <Field label="Open to relocation">
              <div className="flex items-center gap-2 h-9">
                <Switch
                  checked={!!watch('openToRelocation')}
                  onCheckedChange={v => setValue('openToRelocation', v)}
                />
                <span className="text-sm text-muted-foreground">{watch('openToRelocation') ? 'Yes' : 'No'}</span>
              </div>
            </Field>
          </Section>

          {/* ── Education ── */}
          <Section id="sec-education" title="Education" icon={GraduationCap}>
            <div className="space-y-1.5">
              {education.map((edu, i) => (
                <ItemRow key={i}
                  primary={`${edu.degree}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}`}
                  secondary={`${edu.institution}${edu.startDate ? ` · ${edu.startDate.slice(0, 4)}${edu.endDate ? ` – ${edu.endDate.slice(0, 4)}` : ' – Present'}` : ''}`}
                  onRemove={() => setEducation(education.filter((_, j) => j !== i))}
                />
              ))}
              {addingEdu ? (
                <AddFormBox
                  onSave={() => {
                    if (eduDraft.institution && eduDraft.degree) { setEducation([...education, eduDraft as ProfileEducation]); setEduDraft({}); setAddingEdu(false); }
                    else toast.error('Institution and degree are required');
                  }}
                  onCancel={() => { setEduDraft({}); setAddingEdu(false); }}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Institution" required><Input placeholder="University of Lagos" value={eduDraft.institution ?? ''} onChange={e => setEduDraft({ ...eduDraft, institution: e.target.value })} /></Field>
                    <Field label="Degree" required><Input placeholder="B.Sc, M.Sc, Ph.D…" value={eduDraft.degree ?? ''} onChange={e => setEduDraft({ ...eduDraft, degree: e.target.value })} /></Field>
                    <Field label="Field of study"><Input placeholder="Computer Science" value={eduDraft.fieldOfStudy ?? ''} onChange={e => setEduDraft({ ...eduDraft, fieldOfStudy: e.target.value })} /></Field>
                    <Field label="Grade / Class"><Input placeholder="First Class, 3.8 GPA…" value={eduDraft.grade ?? ''} onChange={e => setEduDraft({ ...eduDraft, grade: e.target.value })} /></Field>
                    <Field label="Country">
                      <Combobox value={eduDraft.country ?? ''} onChange={v => setEduDraft({ ...eduDraft, country: v })} options={COUNTRIES} placeholder="Search country…" />
                    </Field>
                    <Field label="City"><Input placeholder="Lagos" value={eduDraft.city ?? ''} onChange={e => setEduDraft({ ...eduDraft, city: e.target.value })} /></Field>
                    <Field label="Start date"><Input type="date" value={eduDraft.startDate ?? ''} onChange={e => setEduDraft({ ...eduDraft, startDate: e.target.value })} /></Field>
                    <Field label="End date"><Input type="date" value={eduDraft.endDate ?? ''} onChange={e => setEduDraft({ ...eduDraft, endDate: e.target.value })} /></Field>
                  </div>
                  <Field label="Description">
                    <textarea rows={2} placeholder="Relevant coursework, thesis, activities…" value={eduDraft.description ?? ''} onChange={e => setEduDraft({ ...eduDraft, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-1 focus:ring-primary/50 resize-none" />
                  </Field>
                </AddFormBox>
              ) : <AddLink onClick={() => setAddingEdu(true)} label="Add education" />}
            </div>
          </Section>

          {/* ── Work experience ── */}
          <Section id="sec-experience" title="Work experience" icon={Briefcase}>
            <div className="space-y-1.5">
              {experience.map((exp, i) => (
                <ItemRow key={i}
                  primary={`${exp.position} at ${exp.company}`}
                  secondary={`${exp.startDate?.slice(0, 4) ?? ''} – ${exp.isCurrent ? 'Present' : exp.endDate?.slice(0, 4) ?? ''}`}
                  onRemove={() => setExperience(experience.filter((_, j) => j !== i))}
                />
              ))}
              {addingExp ? (
                <AddFormBox
                  onSave={() => {
                    if (expDraft.company && expDraft.position && expDraft.startDate) { setExperience([...experience, expDraft as ProfileExperience]); setExpDraft({}); setAddingExp(false); }
                    else toast.error('Company, position and start date are required');
                  }}
                  onCancel={() => { setExpDraft({}); setAddingExp(false); }}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Company" required><Input placeholder="Acme Corp" value={expDraft.company ?? ''} onChange={e => setExpDraft({ ...expDraft, company: e.target.value })} /></Field>
                    <Field label="Position / Title" required><Input placeholder="Software Engineer" value={expDraft.position ?? ''} onChange={e => setExpDraft({ ...expDraft, position: e.target.value })} /></Field>
                    <Field label="Country">
                      <Combobox value={expDraft.location ?? ''} onChange={v => setExpDraft({ ...expDraft, location: v })} options={COUNTRIES} placeholder="Search country…" />
                    </Field>
                    <Field label="City"><Input placeholder="Lagos" value={expDraft.city ?? ''} onChange={e => setExpDraft({ ...expDraft, city: e.target.value })} /></Field>
                    <Field label="Start date" required><Input type="date" value={expDraft.startDate ?? ''} onChange={e => setExpDraft({ ...expDraft, startDate: e.target.value })} /></Field>
                    <Field label="End date"><Input type="date" value={expDraft.endDate ?? ''} disabled={!!expDraft.isCurrent} onChange={e => setExpDraft({ ...expDraft, endDate: e.target.value })} /></Field>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!expDraft.isCurrent}
                      onCheckedChange={v => setExpDraft({ ...expDraft, isCurrent: v })}
                    />
                    <span className="text-xs text-muted-foreground">Currently working here</span>
                  </div>
                  <Field label="Description">
                    <textarea rows={3} placeholder="Responsibilities, achievements, technologies…" value={expDraft.description ?? ''} onChange={e => setExpDraft({ ...expDraft, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-1 focus:ring-primary/50 resize-none" />
                  </Field>
                </AddFormBox>
              ) : <AddLink onClick={() => setAddingExp(true)} label="Add work experience" />}
            </div>
          </Section>

          {/* ── Skills & competencies ── */}
          <Section id="sec-skills" title="Skills & competencies" icon={Wrench}>

            {/* Skills */}
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Technical &amp; professional skills</p>
            <p className="text-[11px] text-muted-foreground -mt-1">Search from hundreds of predefined skills or type your own and press Enter</p>
            <div className="flex flex-wrap gap-1.5 mb-1">
              {skills.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <span className="font-medium">{s.skill}</span>
                  {s.proficiency && <span className="text-primary/60">· {s.proficiency}</span>}
                  {s.yearsOfExperience && <span className="text-primary/60">· {s.yearsOfExperience}yr</span>}
                  <button type="button" onClick={() => setSkills(skills.filter((_, j) => j !== i))} className="ml-0.5 hover:text-destructive transition-colors">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="space-y-1.5">
              {addingSkill ? (
                <AddFormBox
                  onSave={() => {
                    if (skillDraft.skill) { setSkills([...skills, skillDraft as ProfileSkill]); setSkillDraft({}); setAddingSkill(false); }
                    else toast.error('Skill name is required');
                  }}
                  onCancel={() => { setSkillDraft({}); setAddingSkill(false); }}
                >
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Skill" required>
                      <Combobox value={skillDraft.skill ?? ''} onChange={v => setSkillDraft({ ...skillDraft, skill: v })} options={SKILLS} placeholder="Search skills…" />
                    </Field>
                    <Field label="Proficiency">
                      <select value={skillDraft.proficiency ?? ''} onChange={e => setSkillDraft({ ...skillDraft, proficiency: e.target.value })} className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-1 focus:ring-primary/50">
                        <option value="">Select</option>
                        {PROFICIENCY_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </Field>
                    <Field label="Years of experience">
                      <Input placeholder="3" value={skillDraft.yearsOfExperience ?? ''} onChange={e => setSkillDraft({ ...skillDraft, yearsOfExperience: e.target.value })} />
                    </Field>
                  </div>
                </AddFormBox>
              ) : <AddLink onClick={() => setAddingSkill(true)} label="Add skill" />}
            </div>

            {/* Languages */}
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mt-5">Languages</p>
            <div className="flex flex-wrap gap-1.5 mb-1">
              {languages.map((l, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-surface-raised border border-border text-foreground">
                  <span className="font-medium">{l.language}</span>
                  <span className="text-muted-foreground">· {l.level}</span>
                  <button type="button" onClick={() => setLanguages(languages.filter((_, j) => j !== i))} className="ml-0.5 hover:text-destructive transition-colors">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="space-y-1.5">
              {addingLang ? (
                <AddFormBox
                  onSave={() => {
                    if (langDraft.language && langDraft.level) { setLanguages([...languages, langDraft as ProfileLanguage]); setLangDraft({}); setAddingLang(false); }
                    else toast.error('Language and level are required');
                  }}
                  onCancel={() => { setLangDraft({}); setAddingLang(false); }}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Language" required><Input placeholder="English, French…" value={langDraft.language ?? ''} onChange={e => setLangDraft({ ...langDraft, language: e.target.value })} /></Field>
                    <Field label="Proficiency" required>
                      <select value={langDraft.level ?? ''} onChange={e => setLangDraft({ ...langDraft, level: e.target.value })} className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-1 focus:ring-primary/50">
                        <option value="">Select</option>
                        {LANGUAGE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </Field>
                  </div>
                </AddFormBox>
              ) : <AddLink onClick={() => setAddingLang(true)} label="Add language" />}
            </div>

            {/* Certifications */}
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mt-5">Certifications</p>
            <p className="text-[11px] text-muted-foreground -mt-1">Search globally recognised certifications or type a custom one</p>
            <div className="space-y-1.5">
              {certifications.map((c, i) => (
                <ItemRow key={i} primary={c.certification} secondary={[c.institution, c.dateObtained].filter(Boolean).join(' · ')} onRemove={() => setCertifications(certifications.filter((_, j) => j !== i))} />
              ))}
              {addingCert ? (
                <AddFormBox
                  onSave={() => {
                    if (certDraft.certification) { setCertifications([...certifications, certDraft as ProfileCertification]); setCertDraft({}); setAddingCert(false); }
                    else toast.error('Certification name is required');
                  }}
                  onCancel={() => { setCertDraft({}); setAddingCert(false); }}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Certification name" required>
                      <Combobox value={certDraft.certification ?? ''} onChange={v => setCertDraft({ ...certDraft, certification: v })} options={CERTIFICATIONS} placeholder="Search certifications…" />
                    </Field>
                    <Field label="Issuing institution"><Input placeholder="Amazon Web Services" value={certDraft.institution ?? ''} onChange={e => setCertDraft({ ...certDraft, institution: e.target.value })} /></Field>
                    <Field label="Date obtained"><Input type="date" value={certDraft.dateObtained ?? ''} onChange={e => setCertDraft({ ...certDraft, dateObtained: e.target.value })} /></Field>
                    <Field label="Description"><Input placeholder="Brief note…" value={certDraft.description ?? ''} onChange={e => setCertDraft({ ...certDraft, description: e.target.value })} /></Field>
                  </div>
                </AddFormBox>
              ) : <AddLink onClick={() => setAddingCert(true)} label="Add certification" />}
            </div>
          </Section>

          {/* ── Portfolio & work samples ── */}
          <Section id="sec-portfolio" title="Portfolio & work samples" icon={FolderOpen}>
            <p className="text-xs text-muted-foreground">Add up to 3 links — websites, GitHub projects, Behance, Dribbble, etc.</p>
            <div className="space-y-1.5">
              {portfolioLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Link className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-xs truncate text-foreground bg-surface-raised border border-border px-3 py-2 rounded-lg">{link}</span>
                  <button type="button" onClick={() => setPortfolioLinks(portfolioLinks.filter((_, j) => j !== i))} className="shrink-0 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {portfolioLinks.length < 3 && (
                addingPortfolio ? (
                  <AddFormBox
                    onSave={() => {
                      const url = portfolioDraft.trim();
                      if (url) { setPortfolioLinks([...portfolioLinks, url]); setPortfolioDraft(''); setAddingPortfolio(false); }
                    }}
                    onCancel={() => { setPortfolioDraft(''); setAddingPortfolio(false); }}
                  >
                    <Field label="URL">
                      <Input placeholder="https://yourproject.com" value={portfolioDraft} onChange={e => setPortfolioDraft(e.target.value)} />
                    </Field>
                  </AddFormBox>
                ) : <AddLink onClick={() => setAddingPortfolio(true)} label={`Add portfolio link (${portfolioLinks.length}/3)`} />
              )}
            </div>
          </Section>

          {/* ── Awards ── */}
          <Section id="sec-awards" title="Awards & recognition" icon={Trophy}>
            <div className="space-y-1.5">
              {awards.map((a, i) => (
                <ItemRow key={i} primary={a.title} secondary={[a.recipient, a.date].filter(Boolean).join(' · ')} onRemove={() => setAwards(awards.filter((_, j) => j !== i))} />
              ))}
              {addingAward ? (
                <AddFormBox
                  onSave={() => {
                    if (awardDraft.title) { setAwards([...awards, awardDraft as ProfileAward]); setAwardDraft({}); setAddingAward(false); }
                    else toast.error('Award title is required');
                  }}
                  onCancel={() => { setAwardDraft({}); setAddingAward(false); }}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Award title" required><Input placeholder="Best Innovation Award" value={awardDraft.title ?? ''} onChange={e => setAwardDraft({ ...awardDraft, title: e.target.value })} /></Field>
                    <Field label="Awarded by"><Input placeholder="Google, ACM…" value={awardDraft.recipient ?? ''} onChange={e => setAwardDraft({ ...awardDraft, recipient: e.target.value })} /></Field>
                    <Field label="Date"><Input type="date" value={awardDraft.date ?? ''} onChange={e => setAwardDraft({ ...awardDraft, date: e.target.value })} /></Field>
                    <Field label="Description"><Input placeholder="Brief note…" value={awardDraft.description ?? ''} onChange={e => setAwardDraft({ ...awardDraft, description: e.target.value })} /></Field>
                  </div>
                </AddFormBox>
              ) : <AddLink onClick={() => setAddingAward(true)} label="Add award" />}
            </div>
          </Section>

          {/* ── References ── */}
          <Section id="sec-references" title="References" icon={Users}>
            <div className="space-y-1.5">
              {references.map((r, i) => (
                <ItemRow key={i} primary={r.name} secondary={[r.title, r.company].filter(Boolean).join(' at ')} onRemove={() => setReferences(references.filter((_, j) => j !== i))} />
              ))}
              {addingRef ? (
                <AddFormBox
                  onSave={() => {
                    if (refDraft.name) { setReferences([...references, refDraft as ProfileReference]); setRefDraft({}); setAddingRef(false); }
                    else toast.error('Reference name is required');
                  }}
                  onCancel={() => { setRefDraft({}); setAddingRef(false); }}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Name" required><Input placeholder="John Doe" value={refDraft.name ?? ''} onChange={e => setRefDraft({ ...refDraft, name: e.target.value })} /></Field>
                    <Field label="Job title"><Input placeholder="Engineering Manager" value={refDraft.title ?? ''} onChange={e => setRefDraft({ ...refDraft, title: e.target.value })} /></Field>
                    <Field label="Company"><Input placeholder="Acme Corp" value={refDraft.company ?? ''} onChange={e => setRefDraft({ ...refDraft, company: e.target.value })} /></Field>
                    <Field label="Relationship">
                      <select
                        value={refDraft.relationship ?? ''}
                        onChange={e => setRefDraft({ ...refDraft, relationship: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-1 focus:ring-primary/50"
                      >
                        <option value="">Select relationship…</option>
                        <option value="Former Manager">Former Manager</option>
                        <option value="Current Manager">Current Manager</option>
                        <option value="Former Supervisor">Former Supervisor</option>
                        <option value="Current Supervisor">Current Supervisor</option>
                        <option value="Former Colleague">Former Colleague</option>
                        <option value="Current Colleague">Current Colleague</option>
                        <option value="Team Lead">Team Lead</option>
                        <option value="Former Direct Report">Former Direct Report</option>
                        <option value="Mentor">Mentor</option>
                        <option value="Client">Client</option>
                        <option value="Business Partner">Business Partner</option>
                        <option value="Professor / Lecturer">Professor / Lecturer</option>
                        <option value="Academic Supervisor">Academic Supervisor</option>
                        <option value="Internship Supervisor">Internship Supervisor</option>
                        <option value="Vendor / Contractor">Vendor / Contractor</option>
                      </select>
                    </Field>
                    <Field label="Email"><Input type="email" placeholder="john@acme.com" value={refDraft.email ?? ''} onChange={e => setRefDraft({ ...refDraft, email: e.target.value })} /></Field>
                    <Field label="Phone"><Input type="tel" placeholder="+1 555 000 0000" value={refDraft.phone ?? ''} onChange={e => setRefDraft({ ...refDraft, phone: e.target.value })} /></Field>
                  </div>
                </AddFormBox>
              ) : <AddLink onClick={() => setAddingRef(true)} label="Add reference" />}
            </div>
          </Section>

          {/* ── Social & professional links ── */}
          <Section id="sec-social" title="Social & professional links" icon={Link}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="LinkedIn"><Input placeholder="linkedin.com/in/username" {...register('linkedInProfile')} /></Field>
              <Field label="GitHub"><Input placeholder="github.com/username" {...register('githubProfile')} /></Field>
              <Field label="Twitter / X"><Input placeholder="twitter.com/username" {...register('twitterProfile')} /></Field>
              <Field label="Instagram"><Input placeholder="instagram.com/username" {...register('instagramProfile')} /></Field>
              <Field label="Facebook"><Input placeholder="facebook.com/username" {...register('facebookProfile')} /></Field>
              <Field label="YouTube"><Input placeholder="youtube.com/@handle" {...register('youtubeProfile')} /></Field>
            </div>
          </Section>

          {/* ── Resume & documents ── */}
          <Section id="sec-documents" title="Resume & documents" icon={FileText}>
            <p className="text-xs text-muted-foreground">Paste direct links to your hosted files (Google Drive, Dropbox, etc.)</p>
            <Field label="Resume / CV link"><Input placeholder="https://drive.google.com/…" {...register('cvLink')} /></Field>
            <Field label="Cover letter link"><Input placeholder="https://drive.google.com/…" {...register('coverLetterLink')} /></Field>
            <Field label="Video CV link"><Input placeholder="https://youtube.com/…" {...register('videoCv')} /></Field>
          </Section>

          <div className="pb-10">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save all changes
            </Button>
          </div>

        </div>{/* end form content */}
      </div>{/* end flex */}
    </form>
  );
}

// ─── Employer profile ──────────────────────────────────────────────────────────

const EMPLOYER_SECTIONS = [
  { id: 'emp-company',   icon: Building2, label: 'Company'  },
  { id: 'emp-overview',  icon: FileText,  label: 'Overview' },
  { id: 'emp-location',  icon: MapPin,    label: 'Location' },
  { id: 'emp-contact',   icon: QrCode,    label: 'Contact'  },
  { id: 'emp-branding',  icon: Camera,    label: 'Branding' },
  { id: 'emp-social',    icon: Link,      label: 'Social'   },
  { id: 'emp-legal',     icon: Gavel,     label: 'Legal'    },
] as const;

const BRAND_ASSET_TYPES = [
  { value: 'companyLogo',  label: 'Company Logo'   },
  { value: 'banner',       label: 'Banner Image'   },
  { value: 'coverPage',    label: 'Cover Page'     },
  { value: 'events',       label: 'Event Images'   },
  { value: 'others',       label: 'Other Asset'    },
];

function EmployerProfileTab() {
  const { user, updateUser } = useAuthStore();
  const qc = useQueryClient();

  const { data: profile } = useQuery<EmployerProfile>({
    queryKey: ['employer-profile'],
    queryFn: () => usersApi.getEmployerProfile().then(r => r.data.data ?? r.data),
  });

  const p = profile ?? (user as any);

  const { register, handleSubmit, watch, setValue } = useForm({
    values: {
      companyName:        p?.companyName        ?? '',
      companyDescription: p?.companyDescription ?? '',
      industry:           p?.industry           ?? '',
      companySize:        p?.companySize         ?? '',
      aboutCompany:       p?.aboutCompany        ?? '',
      companyPhone:       p?.companyPhone        ?? '',
      companyAddress:     p?.companyAddress      ?? '',
      companyWebsite:     p?.companyWebsite      ?? '',
      country:            p?.country             ?? '',
      city:               p?.city                ?? '',
      state:              p?.state               ?? '',
      registrationNumber: p?.registrationNumber  ?? '',
      taxId:              p?.taxId ?? p?.taxIdentificationNumber ?? '',
      linkedInProfile:    p?.linkedInProfile     ?? '',
      twitterProfile:     p?.twitterProfile      ?? '',
      facebookProfile:    p?.facebookProfile     ?? '',
      instagramProfile:   p?.instagramProfile    ?? '',
      githubProfile:      p?.githubProfile       ?? '',
      managerName:        p?.managerName         ?? '',
      managerRole:        p?.managerRole         ?? '',
      managerEmail:       p?.managerEmail        ?? '',
      managerPhoneNumber: p?.managerPhoneNumber  ?? p?.managerPhone ?? '',
    },
  });

  // Branding assets list
  const [brandAssets, setBrandAssets] = useState<{ type: string; url: string }[]>([]);
  const [assetType, setAssetType]     = useState('companyLogo');
  const [uploading, setUploading]     = useState(false);
  const brandInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (p?.brandAndVisuals?.length) {
      setBrandAssets((p.brandAndVisuals as string[]).map(url => ({ type: 'others', url })));
    }
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleBrandUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('assetType', assetType);
      const res = await usersApi.updateEmployerLogo(form);
      const url = res.data.data?.url ?? res.data?.url;
      if (url) setBrandAssets(prev => [...prev, { type: assetType, url }]);
      toast.success('Asset uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  // Profile completion
  const completionFields = [
    watch('companyName'), watch('industry'), watch('companySize'),
    watch('country'), watch('city'), watch('companyAddress'),
    watch('companyPhone'), watch('companyWebsite'), watch('companyDescription'),
    watch('aboutCompany'), watch('registrationNumber'), watch('taxId'),
    watch('linkedInProfile'), p?.companyLogo,
  ];
  const completionPct = Math.round(
    (completionFields.filter(f => f && String(f).trim()).length / completionFields.length) * 100
  );

  // Section nav
  const [activeSection, setActiveSection] = useState<string>(EMPLOYER_SECTIONS[0].id);
  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    function update() {
      const hits = EMPLOYER_SECTIONS.map(s => ({
        id: s.id,
        top: document.getElementById(s.id)?.getBoundingClientRect().top ?? Infinity,
      })).filter(s => s.top < 180);
      if (hits.length) setActiveSection(hits[hits.length - 1].id);
    }
    main.addEventListener('scroll', update, { passive: true });
    return () => main.removeEventListener('scroll', update);
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const save = useMutation({
    mutationFn: (data: any) => usersApi.updateEmployerProfile({
      ...data,
      brandAndVisuals: brandAssets.map(a => a.url),
    }),
    onSuccess: (res) => {
      const u = res.data.data ?? res.data;
      updateUser(u);
      qc.setQueryData(['employer-profile'], u);
      toast.success('Profile saved');
    },
    onError: () => toast.error('Save failed'),
  });

  const uploadLogo = useMutation({
    mutationFn: (file: File) => { const form = new FormData(); form.append('file', file); return usersApi.updateEmployerLogo(form); },
    onSuccess: (res) => { const url = res.data.data?.url ?? res.data?.url; if (url) updateUser({ companyLogo: url }); toast.success('Logo updated'); },
  });

  return (
    <form onSubmit={handleSubmit(d => save.mutate(d))}>
      {/* Profile completion bar */}
      <div className="mb-5 p-3 rounded-xl bg-surface border border-border">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-foreground">Profile completion</span>
          <span className={cn('text-xs font-semibold', completionPct >= 80 ? 'text-success' : completionPct >= 50 ? 'text-warning' : 'text-muted-foreground')}>
            {completionPct}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', completionPct >= 80 ? 'bg-success' : completionPct >= 50 ? 'bg-warning' : 'bg-primary')}
            style={{ width: `${completionPct}%` }}
          />
        </div>
        {completionPct < 100 && (
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {completionPct < 50 ? 'Fill in the essentials — candidates judge you by your profile.' : 'Almost there — a complete profile attracts 3× more talent.'}
          </p>
        )}
      </div>

      <div className="flex gap-5">
        {/* Section nav */}
        <div className="w-36 shrink-0">
          <div className="sticky top-4 space-y-0.5">
            <Button type="submit" size="sm" className="w-full mb-3 text-xs" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save all'}
            </Button>
            {EMPLOYER_SECTIONS.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(s.id)}
                className={cn(
                  'w-full flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg transition-colors text-left',
                  activeSection === s.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-raised',
                )}
              >
                <s.icon className="h-3 w-3 shrink-0" />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form content */}
        <div className="flex-1 min-w-0 space-y-10">

          {/* Logo upload */}
          <AvatarUpload
            src={p?.companyLogo}
            label={p?.companyName || 'Company logo'}
            onFile={uploadLogo.mutate}
          />

          {/* ── Company information ── */}
          <Section id="emp-company" title="Company information" icon={Building2}>
            <Field label="Company name" required>
              <Input placeholder="e.g. Acme Technologies Ltd." {...register('companyName')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Industry" required>
                <Combobox
                  value={watch('industry')}
                  onChange={v => setValue('industry', v)}
                  options={INDUSTRIES}
                  placeholder="Search industry…"
                />
              </Field>
              <Field label="Company size">
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {COMPANY_SIZES.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setValue('companySize', s)}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-full border transition-colors',
                        watch('companySize') === s
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface border-border text-muted-foreground hover:border-primary/50',
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </Section>

          {/* ── Company overview ── */}
          <Section id="emp-overview" title="Company overview" icon={FileText}>
            <Field label="Short description">
              <textarea
                {...register('companyDescription')}
                rows={2}
                placeholder="One or two sentences — shown in search results and job cards."
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-1 focus:ring-primary/50 resize-none"
              />
            </Field>
            <Field label="About the company">
              <div className="relative">
                <textarea
                  {...register('aboutCompany')}
                  rows={6}
                  placeholder="Tell your story — mission, values, culture, what makes you a great place to work…"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                />
                <span className="absolute bottom-2 right-3 text-[11px] text-muted-foreground">
                  {(watch('aboutCompany') ?? '').length} chars
                </span>
              </div>
              {(watch('aboutCompany') ?? '').length < 50 && (watch('aboutCompany') ?? '').length > 0 && (
                <p className="text-[11px] text-warning mt-1">At least 50 characters recommended for a compelling overview.</p>
              )}
            </Field>
          </Section>

          {/* ── Location ── */}
          <Section id="emp-location" title="Location" icon={MapPin}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Country" required>
                <Combobox
                  value={watch('country')}
                  onChange={v => setValue('country', v)}
                  options={COUNTRIES}
                  placeholder="Search country…"
                />
              </Field>
              <Field label="State / Province">
                <Input placeholder="Lagos State" {...register('state')} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City"><Input placeholder="Lagos" {...register('city')} /></Field>
              <Field label="Website"><Input placeholder="https://company.com" {...register('companyWebsite')} /></Field>
            </div>
            <Field label="Office address">
              <Input placeholder="123 Victoria Island, Lagos" {...register('companyAddress')} />
            </Field>
          </Section>

          {/* ── Contact ── */}
          <Section id="emp-contact" title="Contact information" icon={QrCode}>
            <p className="text-xs text-muted-foreground">Shown to candidates and used for platform communications.</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company phone">
                <Input type="tel" placeholder="+234 800 000 0000" {...register('companyPhone')} />
              </Field>
              <Field label="Hiring manager name">
                <Input placeholder="Jane Smith" {...register('managerName')} />
              </Field>
              <Field label="Hiring manager role">
                <Input placeholder="Head of Talent" {...register('managerRole')} />
              </Field>
              <Field label="Hiring manager email">
                <Input type="email" placeholder="hiring@company.com" {...register('managerEmail')} />
              </Field>
              <Field label="Hiring manager phone">
                <Input type="tel" placeholder="+234 800 000 0000" {...register('managerPhoneNumber')} />
              </Field>
            </div>
          </Section>

          {/* ── Branding & visual identity ── */}
          <Section id="emp-branding" title="Branding & visual identity" icon={Camera}>
            <p className="text-xs text-muted-foreground">Upload your company logo, banner, cover image, and other brand assets.</p>

            {/* Existing assets */}
            {brandAssets.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {brandAssets.map((asset, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border border-border aspect-video bg-surface-raised">
                    <img src={asset.url} alt={asset.type} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => window.open(asset.url, '_blank')}
                        className="h-6 w-6 rounded-full bg-white/90 flex items-center justify-center"
                      >
                        <FolderOpen className="h-3 w-3 text-foreground" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrandAssets(prev => prev.filter((_, j) => j !== i))}
                        className="h-6 w-6 rounded-full bg-white/90 flex items-center justify-center"
                      >
                        <X className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                    <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                      {BRAND_ASSET_TYPES.find(t => t.value === asset.type)?.label ?? asset.type}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Upload area */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Asset type</label>
                  <select
                    value={assetType}
                    onChange={e => setAssetType(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    {BRAND_ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="pt-5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => brandInputRef.current?.click()}
                    className="gap-1.5"
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    {uploading ? 'Uploading…' : 'Upload file'}
                  </Button>
                  <input
                    ref={brandInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleBrandUpload(f); e.target.value = ''; }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">PNG, JPG, WebP, SVG · max 5 MB · Logo: use PNG with transparent background</p>
            </div>
          </Section>

          {/* ── Social media ── */}
          <Section id="emp-social" title="Social media" icon={Link}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="LinkedIn"><Input placeholder="linkedin.com/company/acme" {...register('linkedInProfile')} /></Field>
              <Field label="Twitter / X"><Input placeholder="twitter.com/acme" {...register('twitterProfile')} /></Field>
              <Field label="Facebook"><Input placeholder="facebook.com/acme" {...register('facebookProfile')} /></Field>
              <Field label="Instagram"><Input placeholder="instagram.com/acme" {...register('instagramProfile')} /></Field>
              <Field label="GitHub"><Input placeholder="github.com/acme" {...register('githubProfile')} /></Field>
            </div>
          </Section>

          {/* ── Legal & compliance ── */}
          <Section id="emp-legal" title="Legal & compliance" icon={Gavel}>
            <p className="text-xs text-muted-foreground">Stored securely · used for verification and regulatory compliance only.</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Business registration number">
                <Input placeholder="RC 000000 / CAC number" {...register('registrationNumber')} />
              </Field>
              <Field label="Tax identification number">
                <Input placeholder="TIN / EIN / VAT number" {...register('taxId')} />
              </Field>
            </div>
          </Section>

          <div className="pb-10">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save all changes
            </Button>
          </div>

        </div>
      </div>
    </form>
  );
}

// ─── Security tab ──────────────────────────────────────────────────────────────

function pwStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 8)           s++;
  if (pw.length >= 12)          s++;
  if (/[A-Z]/.test(pw))        s++;
  if (/[0-9]/.test(pw))        s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const PW_LABELS = ['', 'Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
const PW_COLORS = ['', 'bg-destructive', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-500', 'bg-success'];

function SecurityTab() {
  const { user, clearAuth } = useAuthStore();
  const qc = useQueryClient();
  const [show, setShow]                 = useState({ current: false, next: false, confirm: false });
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrSecret, setQrSecret]         = useState<{ qrCode: string; secret: string } | null>(null);
  const [totpCode, setTotpCode]         = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm]       = useState('');

  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm({ resolver: zodResolver(passwordSchema) });
  const newPw    = (watch('newPassword') as string) ?? '';
  const strength = pwStrength(newPw);

  // Sessions
  const { data: sessionsRaw, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => authApi.getSessions().then(r => r.data.data ?? r.data),
    retry: false,
  });
  const sessions: Array<{ deviceId: string; device: string; location: string; lastActive: string; current?: boolean }> =
    Array.isArray(sessionsRaw) ? sessionsRaw : [];

  const changePassword = useMutation({
    mutationFn: (data: any) => authApi.changePassword(data),
    onSuccess: () => { toast.success('Password changed successfully'); reset(); },
    onError:   (err: any) => toast.error(err.response?.data?.message ?? 'Failed to change password'),
  });
  const setup2FA  = useMutation({
    mutationFn: () => authApi.generateTwoFactorSecret(),
    onSuccess:  (res) => { setQrSecret(res.data.data ?? res.data); setShow2FASetup(true); },
  });
  const enable2FA = useMutation({
    mutationFn: ({ secret, token }: { secret: string; token: string }) => authApi.enableTwoFactor(secret, token),
    onSuccess:  () => { toast.success('2FA enabled!'); setShow2FASetup(false); setTotpCode(''); },
    onError:    () => toast.error('Invalid code — try again'),
  });
  const disable2FA = useMutation({
    mutationFn: () => authApi.disableTwoFactor(),
    onSuccess:  () => toast.success('2FA disabled'),
  });
  const revokeSession = useMutation({
    mutationFn: (deviceId: string) => authApi.revokeSession(deviceId),
    onSuccess: () => { toast.success('Session revoked'); qc.invalidateQueries({ queryKey: ['sessions'] }); },
  });
  const revokeAll = useMutation({
    mutationFn: () => authApi.revokeAllSessions(),
    onSuccess: () => { toast.success('All other sessions signed out'); qc.invalidateQueries({ queryKey: ['sessions'] }); },
  });
  const deleteAccount = useMutation({
    mutationFn: () => authApi.deleteAccount(),
    onSuccess: () => { toast.success('Account deleted'); clearAuth(); },
    onError: () => toast.error('Failed to delete account'),
  });

  const EyeBtn = ({ field }: { field: 'current' | 'next' | 'confirm' }) => (
    <button type="button" onClick={() => setShow(s => ({ ...s, [field]: !s[field] }))}
      className="text-muted-foreground hover:text-foreground transition-colors">
      {show[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="space-y-6 flex-1 min-w-0">

      {/* ── Change password ── */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Change Password</h3>
        </div>

        <form onSubmit={handleSubmit(d => changePassword.mutate(d))} className="space-y-3">
          <Field label="Current password" required>
            <Input
              type={show.current ? 'text' : 'password'}
              placeholder="Enter your current password"
              {...register('currentPassword')}
              suffix={<EyeBtn field="current" />}
            />
            {errors.currentPassword && <p className="text-xs text-destructive mt-1">{errors.currentPassword.message as string}</p>}
          </Field>

          <Field label="New password" required>
            <Input
              type={show.next ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              {...register('newPassword')}
              suffix={<EyeBtn field="next" />}
            />
            {newPw.length > 0 && (
              <div className="mt-1.5 space-y-1">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className={cn('h-1 flex-1 rounded-full transition-all', i <= strength ? PW_COLORS[strength] : 'bg-muted')} />
                  ))}
                </div>
                <p className={cn('text-[11px]', strength >= 4 ? 'text-success' : 'text-muted-foreground')}>
                  {PW_LABELS[strength]}
                </p>
              </div>
            )}
            {errors.newPassword && <p className="text-xs text-destructive mt-1">{errors.newPassword.message as string}</p>}
          </Field>

          <Field label="Confirm new password" required>
            <Input
              type={show.confirm ? 'text' : 'password'}
              placeholder="Repeat your new password"
              {...register('confirm')}
              suffix={<EyeBtn field="confirm" />}
            />
            {errors.confirm && <p className="text-xs text-destructive mt-1">{errors.confirm.message as string}</p>}
          </Field>

          <Button type="submit" size="sm" disabled={changePassword.isPending}>
            {changePassword.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
            Update password
          </Button>
        </form>
      </div>

      {/* ── Two-factor auth ── */}
      <div className="glass rounded-2xl border border-border/50 p-6 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/40">
          <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Smartphone className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-['Outfit',sans-serif]">Two-Factor Authentication</h3>
            <p className="text-[11px] text-muted-foreground">Add extra security to prevent unauthorized access.</p>
          </div>
        </div>

        <div className={cn(
          'flex items-start gap-3 rounded-xl p-3.5 border transition-colors',
          user?.twoFactorEnabled ? 'bg-success/10 border-success/30' : 'bg-surface-raised/60 border-border/50',
        )}>
          {user?.twoFactorEnabled
            ? <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
            : <XCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          }
          <div>
            <p className="text-xs font-bold font-['Outfit',sans-serif]">
              {user?.twoFactorEnabled ? '2FA is currently enabled' : '2FA is not enabled'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              {user?.twoFactorEnabled
                ? 'Your account is secured with a TOTP authenticator app.'
                : "Add an extra layer of security — you'll need a code from your authenticator app to log in."}
            </p>
          </div>
        </div>

        {user?.twoFactorEnabled ? (
          <Button variant="outline" size="sm" onClick={() => disable2FA.mutate()} disabled={disable2FA.isPending}
            className="text-destructive border-destructive/30 hover:bg-destructive/5">
            {disable2FA.isPending
              ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              : <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />}
            Disable 2FA
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setup2FA.mutate()} disabled={setup2FA.isPending}>
            {setup2FA.isPending
              ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              : <QrCode className="h-3.5 w-3.5 mr-1.5" />}
            Set up 2FA
          </Button>
        )}
      </div>

      {/* 2FA setup dialog */}
      <Dialog open={show2FASetup} onOpenChange={v => { if (!v) { setShow2FASetup(false); setTotpCode(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Enable Two-Factor Authentication</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            {qrSecret?.qrCode && (
              <div className="flex justify-center">
                <img src={qrSecret.qrCode} alt="QR code" className="rounded-xl border border-border w-44 h-44" />
              </div>
            )}
            <div className="rounded-lg bg-surface-raised border border-border p-3 space-y-1">
              <p className="text-xs font-medium">Steps</p>
              <ol className="text-[11px] text-muted-foreground space-y-0.5 list-decimal list-inside">
                <li>Open Google Authenticator, Authy, or any TOTP app</li>
                <li>Tap "+" and scan the QR code above</li>
                <li>Enter the 6-digit code shown in the app below</li>
              </ol>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Verification code</label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000 000"
                className="text-center text-xl tracking-[0.5em] font-mono h-12"
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShow2FASetup(false); setTotpCode(''); }}>Cancel</Button>
            <Button
              onClick={() => enable2FA.mutate({ secret: qrSecret?.secret ?? '', token: totpCode })}
              disabled={totpCode.length < 6 || enable2FA.isPending}
            >
              {enable2FA.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Verify & enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Active sessions ── */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Active Sessions</h3>
          </div>
          {sessions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => revokeAll.mutate()}
              disabled={revokeAll.isPending}
              className="text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              {revokeAll.isPending
                ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                : <LogOut className="h-3 w-3 mr-1" />}
              Sign out all other devices
            </Button>
          )}
        </div>

        {sessionsLoading ? (
          <div className="space-y-2">
            {[1,2].map(i => <div key={i} className="h-14 rounded-lg bg-surface-raised animate-pulse" />)}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No session data available.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.deviceId} className={cn(
                'flex items-center justify-between rounded-lg border px-3 py-2.5 gap-3',
                s.current ? 'border-primary/30 bg-primary/5' : 'border-border bg-surface-raised',
              )}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">
                      {s.device || 'Unknown device'}
                      {s.current && <span className="ml-1.5 text-[10px] text-primary font-semibold">· This device</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {s.location || 'Unknown location'} · {s.lastActive || 'Unknown time'}
                    </p>
                  </div>
                </div>
                {!s.current && (
                  <button
                    type="button"
                    onClick={() => revokeSession.mutate(s.deviceId)}
                    disabled={revokeSession.isPending}
                    className="shrink-0 text-xs text-destructive hover:underline disabled:opacity-50"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Danger zone ── */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          className="text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Delete my account
        </Button>
      </div>

      {/* Delete account confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={v => { if (!v) { setShowDeleteDialog(false); setDeleteConfirm(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-destructive/5 border border-destructive/20 p-3">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                This will permanently delete your account, all your data, applications, and messages. <strong className="text-foreground">This cannot be undone.</strong>
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                Type <span className="font-mono font-semibold text-foreground">DELETE</span> to confirm
              </label>
              <Input
                placeholder="DELETE"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                className="font-mono"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeleteConfirm(''); }}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteAccount.mutate()}
              disabled={deleteConfirm !== 'DELETE' || deleteAccount.isPending}
            >
              {deleteAccount.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Privacy tab ───────────────────────────────────────────────────────────────

interface PrivacySettings {
  publicProfile: boolean;
  onlyEmployers: boolean;
  onlyMyNetwork: boolean;
  onlyMe: boolean;
}

const PRIVACY_OPTIONS: Array<{
  key: keyof PrivacySettings;
  label: string;
  icon: React.ElementType;
  description: string;
  risk: 'high' | 'medium' | 'low';
}> = [
  { key: 'publicProfile', label: 'Public Profile',    icon: Globe,      description: 'Anyone can view your profile and contact information', risk: 'high'   },
  { key: 'onlyEmployers', label: 'Employers Only',    icon: UserCheck,  description: 'Only verified employers can view your profile',         risk: 'medium' },
  { key: 'onlyMyNetwork', label: 'My Network Only',   icon: Network,    description: 'Only people in your network can view your profile',     risk: 'low'    },
  { key: 'onlyMe',        label: 'Private Profile',   icon: Lock,       description: 'Only you can see your profile information',            risk: 'low'    },
];

const RISK_BADGE: Record<string, React.ReactNode> = {
  high:   <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">High visibility</span>,
  medium: <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">Medium visibility</span>,
  low:    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success border border-success/20">Low visibility</span>,
};

const PRIVACY_DEFAULTS: PrivacySettings = {
  publicProfile: false,
  onlyEmployers: true,
  onlyMyNetwork: false,
  onlyMe:        false,
};

function PrivacyTab() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isEmployer = user?.userType === 'employer';
  const userType = user?.userType ?? 'applicant';

  const { data: settingsData } = useQuery({
    queryKey: ['user-settings', userType],
    queryFn: () => settingsApi.get(userType).then(r => r.data.data ?? r.data),
    retry: false,
  });

  const [prefs, setPrefs] = useState<PrivacySettings>(() => ({ ...PRIVACY_DEFAULTS }));

  // Sync from server
  useEffect(() => {
    const privacy = settingsData?.privacy;
    if (privacy) setPrefs(p => ({ ...p, ...privacy }));
  }, [settingsData]);

  const save = useMutation({
    mutationFn: () => settingsApi.updatePrivacy(prefs),
    onSuccess: () => {
      toast.success('Privacy settings saved');
      qc.invalidateQueries({ queryKey: ['user-settings', userType] });
    },
  });

  const selectOption = (key: keyof PrivacySettings) => {
    setPrefs({
      publicProfile: key === 'publicProfile',
      onlyEmployers: key === 'onlyEmployers',
      onlyMyNetwork: key === 'onlyMyNetwork',
      onlyMe:        key === 'onlyMe',
    });
  };

  if (isEmployer) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Eye className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground">Privacy settings are for applicants only</p>
        <p className="text-xs text-muted-foreground mt-1">Employer profiles are always visible to applicants.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Privacy Settings</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Control who can view your profile.</p>
        </div>
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
          Save
        </Button>
      </div>

      {/* Notice */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 flex items-start gap-2.5">
        <Shield className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-blue-300">Privacy Protection</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose your visibility level. More restrictive settings may limit job opportunities.
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2.5">
        {PRIVACY_OPTIONS.map(opt => {
          const isActive = prefs[opt.key];
          return (
            <div
              key={opt.key}
              className={cn(
                'rounded-xl border-2 p-4 transition-all cursor-pointer select-none',
                isActive
                  ? opt.risk === 'high'   ? 'border-destructive/30 bg-destructive/5'
                  : opt.risk === 'medium' ? 'border-warning/30 bg-warning/5'
                  :                         'border-success/30 bg-success/5'
                  : 'border-border hover:border-border/80 hover:bg-surface-raised',
              )}
              onClick={() => selectOption(opt.key)}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                  isActive
                    ? opt.risk === 'high'   ? 'bg-destructive/10 text-destructive'
                    : opt.risk === 'medium' ? 'bg-warning/10 text-warning'
                    :                         'bg-success/10 text-success'
                    : 'bg-surface-raised text-muted-foreground',
                )}>
                  <opt.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    {RISK_BADGE[opt.risk]}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
                <div className="pointer-events-none">
                  <Switch checked={isActive} onCheckedChange={() => selectOption(opt.key)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Notes */}
      <div className="rounded-xl bg-surface-raised border border-border p-4">
        <p className="text-xs font-medium text-foreground mb-2">Important notes</p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>• You can change these settings at any time</li>
          <li>• Employers you've applied to can always view your application details</li>
          <li>• Platform admins may still access your information for support purposes</li>
          <li>• More restrictive settings may reduce job match opportunities</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Notifications tab ─────────────────────────────────────────────────────────

/** Map server notification settings to a flat key→boolean record */
function flattenApplicantNotifs(s: any): Record<string, boolean> {
  if (!s?.notifications?.options) return {};
  const o = s.notifications.options;
  return {
    // applicationStatus
    appStatusAll:          !!o.applicationStatus?.option?.all,
    appStatusSubmitted:    !!o.applicationStatus?.option?.submitted,
    appStatusShortlisted:  !!o.applicationStatus?.option?.shortlisted,
    appStatusRejected:     !!o.applicationStatus?.option?.rejected,
    appStatusInterview:    !!o.applicationStatus?.option?.scheduledForInterview,
    appStatusEmail:        !!o.applicationStatus?.notificationType?.emailNotification,
    appStatusPush:         !!o.applicationStatus?.notificationType?.pushNotification,
    // jobRecommendations
    recProfilePrefs:       !!o.jobRecommendations?.option?.profilePreferences,
    recSavedSearch:        !!o.jobRecommendations?.option?.savedJobSearch,
    recJobMatch:           !!o.jobRecommendations?.option?.jobMatchFound,
    recEmail:              !!o.jobRecommendations?.notificationType?.emailNotification,
    recPush:               !!o.jobRecommendations?.notificationType?.pushNotification,
    recDaily:              !!o.jobRecommendations?.frequency?.daily,
    recWeekly:             !!o.jobRecommendations?.frequency?.weekly,
    // interviewInvitation
    ivCancelled:           !!o.interviewInvitation?.option?.scheduleCancelled,
    ivRescheduled:         !!o.interviewInvitation?.option?.scheduleRescheduled,
    ivUpcoming:            !!o.interviewInvitation?.option?.notifyForUpcomingInterviews,
    ivConfirmation:        !!o.interviewInvitation?.option?.notifyForInterviewConfirmation,
    ivEmail:               !!o.interviewInvitation?.notificationType?.emailNotification,
    ivPush:                !!o.interviewInvitation?.notificationType?.pushNotification,
    // savedJob
    savedExpire:           !!o.savedJob?.option?.aboutToExpire,
    savedExpired:          !!o.savedJob?.option?.expired,
    savedClosed:           !!o.savedJob?.option?.closed,
    savedUpdated:          !!o.savedJob?.option?.updatedByEmployer,
    savedEmail:            !!o.savedJob?.notificationType?.emailNotification,
    // employerAction
    eaViewed:              !!o.employerAction?.option?.viewedMyProfile,
    eaDownloaded:          !!o.employerAction?.option?.downloadedMyResume,
    eaMessage:             !!o.employerAction?.option?.sentDirectMessage,
    eaEmail:               !!o.employerAction?.notificationType?.emailNotification,
    // platform
    platProduct:           !!o.platform?.option?.newProductOrUpdate,
    platMaint:             !!o.platform?.option?.maintenanceDowntime,
    platEmail:             !!o.platform?.notificationType?.emailNotification,
    platPush:              !!o.platform?.notificationType?.pushNotification,
    // generalSettings
    gen2fa:                !!o.generalSettings?.option?.enableTwoFactorAuth,
    genPwChange:           !!o.generalSettings?.option?.passwordChange,
    genPwReset:            !!o.generalSettings?.option?.passwordReset,
    genNewDevice:          !!o.generalSettings?.option?.loginFromNewDevice,
    genLogin:              !!o.generalSettings?.option?.login,
    genEmail:              !!o.generalSettings?.notificationType?.emailNotification,
    genPush:               !!o.generalSettings?.notificationType?.pushNotification,
    // communication
    comPromo:              !!o.communication?.option?.promotionalOffers,
    comPlatform:           !!o.communication?.option?.fromPlatform,
    comEmail:              !!o.communication?.notificationType?.emailNotification,
    // paymentAndBilling
    bilDue:                !!o.paymentAndBilling?.option?.subscriptionDue,
    bilCancelled:          !!o.paymentAndBilling?.option?.subscriptionCancelled,
    bilExpired:            !!o.paymentAndBilling?.option?.subscriptionExpired,
    bilSuccess:            !!o.paymentAndBilling?.option?.subscriptionSuccessful,
    bilEmail:              !!o.paymentAndBilling?.notificationType?.emailNotification,
    bilPush:               !!o.paymentAndBilling?.notificationType?.pushNotification,
  };
}

function flattenEmployerNotifs(s: any): Record<string, boolean> {
  if (!s?.notifications?.options) return {};
  const o = s.notifications.options;
  return {
    // manageJobApplications
    mjaApplies:    !!o.manageJobApplications?.option?.applicantApplies,
    mjaStatus:     !!o.manageJobApplications?.option?.applicationStatusUpdated,
    mjaInterview:  !!o.manageJobApplications?.option?.interviewScheduled,
    mjaEmail:      !!o.manageJobApplications?.notificationType?.emailNotification,
    mjaPush:       !!o.manageJobApplications?.notificationType?.pushNotification,
    // jobPostingStatus
    jpsNew:        !!o.jobPostingStatus?.option?.newJobPosting,
    jpsDraft:      !!o.jobPostingStatus?.option?.draftSaved,
    jpsUpdated:    !!o.jobPostingStatus?.option?.jobUpdated,
    jpsPublished:  !!o.jobPostingStatus?.option?.jobPublished,
    jpsFailed:     !!o.jobPostingStatus?.option?.jobFailed,
    jpsExpired:    !!o.jobPostingStatus?.option?.jobExpired,
    jpsDeleted:    !!o.jobPostingStatus?.option?.jobDeleted,
    jpsEmail:      !!o.jobPostingStatus?.notificationType?.emailNotification,
    jpsPush:       !!o.jobPostingStatus?.notificationType?.pushNotification,
    // interviewInvitation (same as applicant)
    ivCancelled:   !!o.interviewInvitation?.option?.scheduleCancelled,
    ivRescheduled: !!o.interviewInvitation?.option?.scheduleRescheduled,
    ivUpcoming:    !!o.interviewInvitation?.option?.notifyForUpcomingInterviews,
    ivConfirmation:!!o.interviewInvitation?.option?.notifyForInterviewConfirmation,
    ivEmail:       !!o.interviewInvitation?.notificationType?.emailNotification,
    // paymentAndBilling
    bilDue:        !!o.paymentAndBilling?.option?.subscriptionDue,
    bilCancelled:  !!o.paymentAndBilling?.option?.subscriptionCancelled,
    bilExpired:    !!o.paymentAndBilling?.option?.subscriptionExpired,
    bilSuccess:    !!o.paymentAndBilling?.option?.subscriptionSuccessful,
    bilEmail:      !!o.paymentAndBilling?.notificationType?.emailNotification,
    // platform & general
    platProduct:   !!o.platform?.option?.newProductOrUpdate,
    platMaint:     !!o.platform?.option?.maintenanceDowntime,
    platEmail:     !!o.platform?.notificationType?.emailNotification,
    genNewDevice:  !!o.generalSettings?.option?.loginFromNewDevice,
    genLogin:      !!o.generalSettings?.option?.login,
    genEmail:      !!o.generalSettings?.notificationType?.emailNotification,
  };
}

const APPLICANT_NOTIF_GROUPS = [
  {
    id: 'applicationStatus', group: 'Application Status', icon: Briefcase,
    items: [
      { key: 'appStatusAll',         label: 'All updates',              desc: 'Any change to your application status' },
      { key: 'appStatusSubmitted',   label: 'Submitted',                desc: 'Confirmation when you submit an application' },
      { key: 'appStatusShortlisted', label: 'Shortlisted',              desc: 'When an employer shortlists your application' },
      { key: 'appStatusRejected',    label: 'Rejected',                 desc: 'When your application is rejected' },
      { key: 'appStatusInterview',   label: 'Scheduled for interview',  desc: 'When you are scheduled for an interview' },
    ],
    channels: [{ key: 'appStatusEmail', label: 'Email' }, { key: 'appStatusPush', label: 'Push' }],
  },
  {
    id: 'jobRecommendations', group: 'Job Recommendations', icon: Zap,
    items: [
      { key: 'recProfilePrefs', label: 'Based on profile preferences', desc: 'Jobs matching your profile preferences' },
      { key: 'recSavedSearch',  label: 'Saved job search matches',     desc: 'New matches for your saved searches' },
      { key: 'recJobMatch',     label: 'Job match found',              desc: 'When we find a strong job match for you' },
    ],
    channels: [{ key: 'recEmail', label: 'Email' }, { key: 'recPush', label: 'Push' }],
    frequency: [{ key: 'recDaily', label: 'Daily digest' }, { key: 'recWeekly', label: 'Weekly digest' }],
  },
  {
    id: 'interviewInvitation', group: 'Interview Invitations', icon: Monitor,
    items: [
      { key: 'ivCancelled',    label: 'Interview cancelled',    desc: 'When a scheduled interview is cancelled' },
      { key: 'ivRescheduled',  label: 'Interview rescheduled',  desc: 'When your interview time changes' },
      { key: 'ivUpcoming',     label: 'Upcoming interview',     desc: 'Reminder before a scheduled interview' },
      { key: 'ivConfirmation', label: 'Interview confirmed',    desc: 'Confirmation of a newly scheduled interview' },
    ],
    channels: [{ key: 'ivEmail', label: 'Email' }, { key: 'ivPush', label: 'Push' }],
  },
  {
    id: 'savedJob', group: 'Saved Jobs', icon: Star,
    items: [
      { key: 'savedExpire',  label: 'About to expire', desc: 'When a saved job is expiring soon' },
      { key: 'savedExpired', label: 'Expired',         desc: 'When a saved job has expired' },
      { key: 'savedClosed',  label: 'Closed',          desc: 'When a saved job is closed by the employer' },
      { key: 'savedUpdated', label: 'Updated',         desc: 'When the employer updates a saved job' },
    ],
    channels: [{ key: 'savedEmail', label: 'Email' }],
  },
  {
    id: 'employerAction', group: 'Employer Actions', icon: Users,
    items: [
      { key: 'eaViewed',     label: 'Viewed my profile',    desc: 'When an employer views your profile' },
      { key: 'eaDownloaded', label: 'Downloaded my resume', desc: 'When an employer downloads your resume' },
      { key: 'eaMessage',    label: 'Sent me a message',    desc: 'When an employer sends you a direct message' },
    ],
    channels: [{ key: 'eaEmail', label: 'Email' }],
  },
  {
    id: 'platform', group: 'Platform', icon: Bell,
    items: [
      { key: 'platProduct', label: 'Product updates', desc: 'New features and announcements from Mune Work' },
      { key: 'platMaint',   label: 'Maintenance',     desc: 'Scheduled maintenance and downtime alerts' },
    ],
    channels: [{ key: 'platEmail', label: 'Email' }, { key: 'platPush', label: 'Push' }],
  },
  {
    id: 'generalSettings', group: 'Security Alerts', icon: Shield,
    items: [
      { key: 'gen2fa',      label: '2FA activity',       desc: 'Changes to two-factor authentication' },
      { key: 'genPwChange', label: 'Password changed',   desc: 'When your password is changed' },
      { key: 'genPwReset',  label: 'Password reset',     desc: 'When a password reset is requested' },
      { key: 'genNewDevice', label: 'New device login',  desc: 'When you log in from a new device' },
      { key: 'genLogin',    label: 'Login alert',        desc: 'Every time you log in' },
    ],
    channels: [{ key: 'genEmail', label: 'Email' }, { key: 'genPush', label: 'Push' }],
  },
  {
    id: 'communication', group: 'Communication', icon: Mail,
    items: [
      { key: 'comPromo',    label: 'Promotional offers', desc: 'Special offers and promotions from Mune Work' },
      { key: 'comPlatform', label: 'Platform updates',   desc: 'Updates and news from the platform' },
    ],
    channels: [{ key: 'comEmail', label: 'Email' }],
  },
  {
    id: 'paymentAndBilling', group: 'Payment & Billing', icon: CreditCard,
    items: [
      { key: 'bilDue',       label: 'Subscription due',        desc: 'Reminder when your subscription is due' },
      { key: 'bilCancelled', label: 'Subscription cancelled',  desc: 'Confirmation when subscription is cancelled' },
      { key: 'bilExpired',   label: 'Subscription expired',    desc: 'Alert when your subscription expires' },
      { key: 'bilSuccess',   label: 'Payment successful',      desc: 'Confirmation of successful payment' },
    ],
    channels: [{ key: 'bilEmail', label: 'Email' }, { key: 'bilPush', label: 'Push' }],
  },
];

const EMPLOYER_NOTIF_GROUPS = [
  {
    id: 'manageJobApplications', group: 'Manage Job Applications', icon: Users,
    items: [
      { key: 'mjaApplies',   label: 'Applicant applies',           desc: 'When a candidate applies to your job' },
      { key: 'mjaStatus',    label: 'Application status updated',  desc: 'When you update an application status' },
      { key: 'mjaInterview', label: 'Interview scheduled',         desc: 'When an interview is scheduled' },
    ],
    channels: [{ key: 'mjaEmail', label: 'Email' }, { key: 'mjaPush', label: 'Push' }],
  },
  {
    id: 'jobPostingStatus', group: 'Job Posting Status', icon: Briefcase,
    items: [
      { key: 'jpsNew',       label: 'New job posting',  desc: 'When a new job is posted' },
      { key: 'jpsDraft',     label: 'Draft saved',      desc: 'When a job draft is saved' },
      { key: 'jpsUpdated',   label: 'Job updated',      desc: 'When a job posting is updated' },
      { key: 'jpsPublished', label: 'Job published',    desc: 'When a job goes live' },
      { key: 'jpsFailed',    label: 'Job failed',       desc: 'When a job fails to publish' },
      { key: 'jpsExpired',   label: 'Job expired',      desc: 'When a job listing expires' },
      { key: 'jpsDeleted',   label: 'Job deleted',      desc: 'When a job is deleted' },
    ],
    channels: [{ key: 'jpsEmail', label: 'Email' }, { key: 'jpsPush', label: 'Push' }],
  },
  {
    id: 'interviewInvitation', group: 'Interview Reminders', icon: Monitor,
    items: [
      { key: 'ivCancelled',    label: 'Interview cancelled',   desc: 'When a candidate cancels an interview' },
      { key: 'ivRescheduled',  label: 'Rescheduled',           desc: 'When an interview time changes' },
      { key: 'ivUpcoming',     label: 'Upcoming interview',    desc: 'Reminder before a scheduled interview' },
      { key: 'ivConfirmation', label: 'Interview confirmed',   desc: 'When a candidate confirms their interview' },
    ],
    channels: [{ key: 'ivEmail', label: 'Email' }],
  },
  {
    id: 'paymentAndBilling', group: 'Payment & Billing', icon: CreditCard,
    items: [
      { key: 'bilDue',       label: 'Subscription due',       desc: 'Reminder when subscription is due' },
      { key: 'bilCancelled', label: 'Subscription cancelled', desc: 'When subscription is cancelled' },
      { key: 'bilExpired',   label: 'Subscription expired',   desc: 'When subscription expires' },
      { key: 'bilSuccess',   label: 'Payment successful',     desc: 'Successful payment confirmation' },
    ],
    channels: [{ key: 'bilEmail', label: 'Email' }],
  },
  {
    id: 'platform', group: 'Platform', icon: Bell,
    items: [
      { key: 'platProduct', label: 'Product updates', desc: 'New features and announcements' },
      { key: 'platMaint',   label: 'Maintenance',     desc: 'Scheduled downtime alerts' },
    ],
    channels: [{ key: 'platEmail', label: 'Email' }],
  },
  {
    id: 'generalSettings', group: 'Security Alerts', icon: Shield,
    items: [
      { key: 'genNewDevice', label: 'New device login', desc: 'When you log in from a new device' },
      { key: 'genLogin',     label: 'Login alert',      desc: 'Every time you log in' },
    ],
    channels: [{ key: 'genEmail', label: 'Email' }],
  },
];

function NotificationsTab() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isEmployer = user?.userType === 'employer';
  const userType = user?.userType ?? 'applicant';
  const GROUPS = isEmployer ? EMPLOYER_NOTIF_GROUPS : APPLICANT_NOTIF_GROUPS;

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['user-settings', userType],
    queryFn: () => settingsApi.get(userType).then(r => r.data.data ?? r.data),
  });

  const [prefs, setPrefs] = useState<Record<string, boolean>>({});

  // Sync server data to flat prefs
  useEffect(() => {
    if (!settingsData) return;
    const flat = isEmployer
      ? flattenEmployerNotifs(settingsData)
      : flattenApplicantNotifs(settingsData);
    setPrefs(flat);
  }, [settingsData, isEmployer]);

  const toggle = (key: string) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const save = useMutation({
    mutationFn: async () => {
      await settingsApi.update({
        userType,
        ...(isEmployer ? { employer: settingsData } : { applicant: settingsData }),
      });
    },
    onSuccess: () => {
      toast.success('Notification preferences saved');
      qc.invalidateQueries({ queryKey: ['user-settings', userType] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1,2,3,4].map(i => <div key={i} className="h-32 rounded-xl bg-surface-raised animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5 flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Notification Preferences</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Choose what you hear about and how.</p>
        </div>
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
          Save
        </Button>
      </div>

      <WhatsAppPanel />

      {GROUPS.map(group => (
        <div key={group.group} className="rounded-xl border border-border bg-surface overflow-hidden">
          {/* Group header */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-raised border-b border-border">
            <group.icon className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.group}</span>
          </div>

          {/* Individual toggles */}
          <div className="divide-y divide-border/50">
            {group.items.map(item => (
              <div key={item.key} className="flex items-center justify-between px-4 py-3 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <Switch checked={!!prefs[item.key]} onCheckedChange={() => toggle(item.key)} />
              </div>
            ))}
          </div>

          {/* Channel toggles */}
          {group.channels && group.channels.length > 0 && (
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border bg-surface-raised/50">
              <span className="text-[11px] text-muted-foreground font-medium">Channels:</span>
              {group.channels.map(ch => (
                <label key={ch.key} className="flex items-center gap-1.5 cursor-pointer">
                  <Switch
                    checked={!!prefs[ch.key]}
                    onCheckedChange={() => toggle(ch.key)}
                    className="scale-75"
                  />
                  <span className="text-[11px] text-muted-foreground">{ch.label}</span>
                </label>
              ))}
              {(group as any).frequency?.map((f: any) => (
                <label key={f.key} className="flex items-center gap-1.5 cursor-pointer">
                  <Switch
                    checked={!!prefs[f.key]}
                    onCheckedChange={() => toggle(f.key)}
                    className="scale-75"
                  />
                  <span className="text-[11px] text-muted-foreground">{f.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Auto Apply tab ────────────────────────────────────────────────────────────

const TIMEZONES = [
  'UTC', 'Africa/Lagos', 'Africa/Nairobi', 'Africa/Accra', 'Africa/Johannesburg',
  'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Denver',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Dubai',
  'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
];

function AutoApplyTab() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: rawSettings, isLoading } = useQuery({
    queryKey: ['auto-apply-settings'],
    queryFn: () => autoApplyApi.getSettings().then(r => r.data.data ?? r.data),
  });

  const DEFAULT_SETTINGS = {
    minimumMatchPercentage: 75,
    enableAutoApply: false,
    pauseAutoApply: false,
    applyImmediately: false,
    batchApplyTime: '09:00',
    timezone: 'Africa/Lagos',
    applyOnWeekends: false,
    skipAlreadyApplied: true,
    blacklistedCompanies: [] as string[],
    blacklistedKeywords: [] as string[],
  };

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [newCompany, setNewCompany] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    if (rawSettings) setSettings(s => ({ ...s, ...rawSettings }));
  }, [rawSettings]);

  const update = useMutation({
    mutationFn: (data: typeof settings) => autoApplyApi.updateSettings(data),
    onSuccess: () => {
      toast.success('Auto Apply settings saved');
      qc.invalidateQueries({ queryKey: ['auto-apply-settings'] });
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const set = (key: string, value: any) => setSettings(s => ({ ...s, [key]: value }));

  const addCompany = () => {
    const v = newCompany.trim();
    if (v && !settings.blacklistedCompanies.includes(v)) {
      set('blacklistedCompanies', [...settings.blacklistedCompanies, v]);
    }
    setNewCompany('');
  };
  const addKeyword = () => {
    const v = newKeyword.trim();
    if (v && !settings.blacklistedKeywords.includes(v)) {
      set('blacklistedKeywords', [...settings.blacklistedKeywords, v]);
    }
    setNewKeyword('');
  };

  if (user?.userType === 'employer') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Bot className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">Auto Apply is for applicants only</p>
      </div>
    );
  }

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-surface-raised animate-pulse" />)}</div>;

  return (
    <div className="space-y-5 flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Auto Apply Settings</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Configure your automated job application rules.</p>
        </div>
        <Button size="sm" onClick={() => update.mutate(settings)} disabled={update.isPending}>
          {update.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
          Save
        </Button>
      </div>

      {/* Enable / Pause */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-raised border-b border-border">
          <Bot className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
        </div>
        <div className="divide-y divide-border/50">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Enable Auto Apply</p>
              <p className="text-xs text-muted-foreground mt-0.5">Automatically apply to matching jobs</p>
            </div>
            <Switch checked={settings.enableAutoApply} onCheckedChange={v => set('enableAutoApply', v)} />
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Pause Auto Apply</p>
              <p className="text-xs text-muted-foreground mt-0.5">Temporarily pause without disabling</p>
            </div>
            <Switch checked={settings.pauseAutoApply} onCheckedChange={v => set('pauseAutoApply', v)} />
          </div>
        </div>
      </div>

      {/* Match threshold */}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sliders className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Match Threshold</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm">Minimum match percentage</p>
            <span className="text-sm font-bold text-primary">{settings.minimumMatchPercentage}%</span>
          </div>
          <input
            type="range" min={0} max={100} step={5}
            value={settings.minimumMatchPercentage}
            onChange={e => set('minimumMatchPercentage', Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0% – All jobs</span>
            <span>50% – Moderate</span>
            <span>100% – Perfect only</span>
          </div>
        </div>
      </div>

      {/* Scheduling */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-raised border-b border-border">
          <Target className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scheduling</span>
        </div>
        <div className="divide-y divide-border/50">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Apply immediately</p>
              <p className="text-xs text-muted-foreground mt-0.5">Apply as soon as a match is found</p>
            </div>
            <Switch checked={settings.applyImmediately} onCheckedChange={v => set('applyImmediately', v)} />
          </div>
          {!settings.applyImmediately && (
            <div className="px-4 py-3 space-y-2">
              <p className="text-sm font-medium">Batch apply time</p>
              <input
                type="time"
                value={settings.batchApplyTime}
                onChange={e => set('batchApplyTime', e.target.value)}
                className="h-9 rounded-lg border border-border bg-surface-raised px-3 text-sm w-full"
              />
            </div>
          )}
          <div className="px-4 py-3 space-y-2">
            <p className="text-sm font-medium">Timezone</p>
            <select
              value={settings.timezone}
              onChange={e => set('timezone', e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-surface-raised px-3 text-xs"
            >
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Apply on weekends</p>
              <p className="text-xs text-muted-foreground mt-0.5">Include Sat & Sun in auto-apply schedule</p>
            </div>
            <Switch checked={settings.applyOnWeekends} onCheckedChange={v => set('applyOnWeekends', v)} />
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Skip already applied</p>
              <p className="text-xs text-muted-foreground mt-0.5">Don't re-apply to jobs you've applied to</p>
            </div>
            <Switch checked={settings.skipAlreadyApplied} onCheckedChange={v => set('skipAlreadyApplied', v)} />
          </div>
        </div>
      </div>

      {/* Blacklisted companies */}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Blacklisted Companies</p>
        <p className="text-xs text-muted-foreground">Auto Apply will skip jobs at these companies.</p>
        <div className="flex gap-2">
          <Input
            value={newCompany}
            onChange={e => setNewCompany(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCompany(); } }}
            placeholder="Company name…"
            className="flex-1 h-9 text-xs"
          />
          <Button size="sm" variant="outline" onClick={addCompany} type="button">Add</Button>
        </div>
        {settings.blacklistedCompanies.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {settings.blacklistedCompanies.map(c => (
              <span key={c} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                {c}
                <button type="button" onClick={() => set('blacklistedCompanies', settings.blacklistedCompanies.filter(x => x !== c))}>
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Blacklisted keywords */}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Blacklisted Keywords</p>
        <p className="text-xs text-muted-foreground">Skip jobs whose title or description contains these words.</p>
        <div className="flex gap-2">
          <Input
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
            placeholder="Keyword…"
            className="flex-1 h-9 text-xs"
          />
          <Button size="sm" variant="outline" onClick={addKeyword} type="button">Add</Button>
        </div>
        {settings.blacklistedKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {settings.blacklistedKeywords.map(k => (
              <span key={k} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">
                {k}
                <button type="button" onClick={() => set('blacklistedKeywords', settings.blacklistedKeywords.filter(x => x !== k))}>
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Billing tab ───────────────────────────────────────────────────────────────

function BillingTab() {
  const qc = useQueryClient();
  const [gatewayModal, setGatewayModal] = useState<{ planId: string } | null>(null);
  const [selGateway, setSelGateway]     = useState<'PAYSTACK' | 'STRIPE' | 'FLUTTERWAVE'>('PAYSTACK');

  const { data: sub,      isLoading: subLoading     } = useQuery({ queryKey: ['subscription'], queryFn: () => subscriptionsApi.getMySubscription().then(r => r.data.data ?? r.data) });
  const { data: plans,    isLoading: plansLoading   } = useQuery({ queryKey: ['plans'],        queryFn: () => subscriptionsApi.getPlans().then(r => r.data.data ?? r.data) });
  const { data: invoices, isLoading: invoicesLoading } = useQuery({ queryKey: ['invoices'],    queryFn: () => subscriptionsApi.getInvoices().then(r => r.data.data ?? r.data), retry: false });

  const subscribe = useMutation({
    mutationFn: ({ planId, gateway }: { planId: string; gateway: string }) =>
      subscriptionsApi.initialize({ planId, gateway }),
    onSuccess: (res) => {
      const url = res.data.data?.authorizationUrl ?? res.data?.authorizationUrl ?? res.data?.url;
      if (url) window.location.href = url;
      else { qc.invalidateQueries({ queryKey: ['subscription'] }); toast.success('Subscription initialized!'); }
    },
    onError: () => toast.error('Failed to start checkout'),
  });

  const cancel = useMutation({
    mutationFn: () => subscriptionsApi.cancel(),
    onSuccess: () => { toast.success('Subscription cancelled'); qc.invalidateQueries({ queryKey: ['subscription'] }); },
    onError: () => toast.error('Cancellation failed'),
  });

  const toggleRenew = useMutation({
    mutationFn: (val: boolean) => subscriptionsApi.toggleAutoRenew(val),
    onSuccess: (_, val) => { toast.success(val ? 'Auto-renew enabled' : 'Auto-renew disabled'); qc.invalidateQueries({ queryKey: ['subscription'] }); },
    onError: () => toast.error('Failed to update auto-renew'),
  });

  const activePlanId    = sub?.plan?.id ?? sub?.planId;
  const activePlanPrice = sub?.plan?.monthlyPrice ?? sub?.plan?.price ?? 0;
  const trialEndsAt     = sub?.status === 'trial' ? new Date(sub.endsAt) : null;
  const trialDaysLeft   = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000)) : null;

  function handleUpgrade(planId: string) { setGatewayModal({ planId }); }
  function confirmGateway() {
    if (!gatewayModal) return;
    subscribe.mutate({ planId: gatewayModal.planId, gateway: selGateway });
    setGatewayModal(null);
  }

  return (
    <div className="space-y-5 flex-1 min-w-0">
      <h3 className="text-sm font-semibold">Billing & Subscription</h3>

      {/* Trial countdown */}
      {trialDaysLeft !== null && (
        <div className={cn(
          'flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-medium',
          trialDaysLeft <= 1 ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-amber-500/10 border-amber-500/30 text-amber-600',
        )}>
          <span>⏳ {trialDaysLeft === 0 ? 'Trial expires today' : `${trialDaysLeft} days left on free trial`}</span>
          <button className="underline" onClick={() => setGatewayModal({ planId: activePlanId ?? '' })}>Subscribe now</button>
        </div>
      )}

      {/* Current plan card */}
      {subLoading ? (
        <div className="h-24 rounded-xl bg-surface-raised animate-pulse" />
      ) : sub ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">{sub.plan?.name ?? 'Pro'} Plan</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success border border-success/20 font-medium">Active</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Renews on {new Date(sub.endsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
              className="text-destructive border-destructive/30 hover:bg-destructive/5 shrink-0"
            >
              {cancel.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Cancel
            </Button>
          </div>
          {/* Auto-renew toggle */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            <div>
              <p className="text-xs font-medium text-foreground">Auto-renew</p>
              <p className="text-[11px] text-muted-foreground">Automatically renew when subscription expires</p>
            </div>
            <button
              onClick={() => toggleRenew.mutate(!sub.autoRenew)}
              disabled={toggleRenew.isPending}
              className={cn(
                'relative h-5 w-9 rounded-full transition-colors shrink-0',
                sub.autoRenew ? 'bg-primary' : 'bg-border',
              )}
            >
              <span className={cn(
                'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                sub.autoRenew ? 'translate-x-4' : 'translate-x-0.5',
              )} />
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface p-5 text-center space-y-2">
          <CreditCard className="h-6 w-6 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium">No active subscription</p>
          <p className="text-xs text-muted-foreground">Choose a plan below to unlock premium features.</p>
        </div>
      )}


      {/* Plans */}
      {plansLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-28 rounded-xl bg-surface-raised animate-pulse" />)}
        </div>
      ) : plans && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available plans</p>
            <a href="/plans" className="text-xs text-primary hover:underline">View all plans →</a>
          </div>
          {(plans as any[]).map(plan => {
            const isActive  = plan.id === activePlanId;
            const planPrice = plan.price ?? plan.monthlyPrice ?? 0;
            const isUpgrade = !isActive && activePlanId && planPrice > activePlanPrice;
            const features: string[] = Array.isArray(plan.features) ? plan.features : [];
            return (
              <div
                key={plan.id}
                className={cn(
                  'rounded-xl border p-4 transition-colors',
                  isActive ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold">{plan.name}</p>
                      {isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">Current</span>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-xs text-muted-foreground mb-2">{plan.description}</p>
                    )}
                    {features.length > 0 && (
                      <ul className="space-y-0.5">
                        {features.slice(0, 4).map((f: string) => (
                          <li key={f} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Check className="h-3 w-3 text-success shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold">
                      {plan.currency ?? '₦'}{Number(plan.price ?? plan.monthlyPrice ?? 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-muted-foreground">/{plan.interval ?? 'mo'}</p>
                    {!isActive && (
                      <Button
                        size="sm"
                        variant={isUpgrade ? 'default' : 'outline'}
                        className="mt-2 text-xs gap-1"
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={subscribe.isPending}
                      >
                        {subscribe.isPending && (subscribe.variables as any)?.planId === plan.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Zap className="h-3 w-3" />}
                        {activePlanId ? (isUpgrade ? 'Upgrade' : 'Downgrade') : 'Get started'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Invoice history ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ReceiptText className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice history</p>
        </div>

        {invoicesLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-surface-raised animate-pulse" />)}
          </div>
        ) : Array.isArray(invoices) && invoices.length > 0 ? (
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="divide-y divide-border/50">
              {(invoices as any[]).map((inv: any, i: number) => {
                const payStatus = inv.paymentStatus ?? inv.status;
                const statusColor = payStatus === 'success'
                  ? 'text-success bg-success/10 border-success/20'
                  : payStatus === 'pending'
                  ? 'text-warning bg-warning/10 border-warning/20'
                  : 'text-destructive bg-destructive/10 border-destructive/20';
                return (
                  <div key={i} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{inv.planName ?? inv.fileName ?? `Invoice #${i + 1}`}</p>
                        <p className="text-[11px] text-muted-foreground">{inv.startsAt?.slice(0, 10) ?? inv.createdAt?.slice(0, 10)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {inv.amount && <span className="text-xs font-semibold">{inv.currency ?? '₦'}{Number(inv.amount).toLocaleString()}</span>}
                      {payStatus && (
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium capitalize', statusColor)}>
                          {payStatus}
                        </span>
                      )}
                      {inv.downloadUrl && (
                        <a href={inv.downloadUrl} target="_blank" rel="noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors">
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {inv.viewUrl && (
                        <a href={inv.viewUrl} target="_blank" rel="noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No invoices yet.</p>
        )}
      </div>

      {/* ── Gateway selector modal ── */}
      {gatewayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="text-sm font-semibold">Choose payment method</p>
              <button onClick={() => setGatewayModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {(['PAYSTACK', 'STRIPE', 'FLUTTERWAVE'] as const).map(gw => (
                <button key={gw}
                  onClick={() => setSelGateway(gw)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all',
                    selGateway === gw ? 'border-primary/40 bg-primary/5 text-primary font-medium' : 'border-border bg-surface hover:bg-surface-raised text-foreground',
                  )}
                >
                  <span className="flex-1">{gw === 'PAYSTACK' ? '🇳🇬 Paystack — Cards, bank, USSD' : gw === 'STRIPE' ? '🌍 Stripe — International cards' : '🦋 Flutterwave — Cards, mobile money'}</span>
                  {selGateway === gw && <CheckCircle2 className="h-4 w-4 text-success" />}
                </button>
              ))}
              <Button className="w-full mt-2 gap-1.5" onClick={confirmGateway} disabled={subscribe.isPending}>
                {subscribe.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Continue to payment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
