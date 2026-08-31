import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Briefcase, GraduationCap, Star, Globe, Award, Link2,
  MapPin, Phone, Languages, Users, ChevronDown, ChevronUp,
  Plus, Trash2, Edit2, Check, Loader2, Camera, BookOpen,
  Heart, FileText, Target, Search, X, Sparkles,
} from 'lucide-react';
import { TopBar } from '@/components/common/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { usersApi, cvsApi } from '@/lib/api';
import { cn, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { COUNTRIES, SKILLS, CERTIFICATIONS } from '@/lib/profile-data';
import type {
  ApplicantProfile, ProfileExperience, ProfileEducation,
  ProfileSkill, ProfileLanguage, ProfileCertification, ProfileAward, ProfileReference, ProfileSalaryRange,
} from '@/types';
import toast from 'react-hot-toast';

const SECTION_NAV = [
  { id: 'personal',     icon: User,         label: 'Personal Info' },
  { id: 'summary',      icon: BookOpen,     label: 'Summary' },
  { id: 'experience',   icon: Briefcase,    label: 'Work Experience' },
  { id: 'education',    icon: GraduationCap,label: 'Education' },
  { id: 'skills',       icon: Star,         label: 'Skills' },
  { id: 'languages',    icon: Languages,    label: 'Languages' },
  { id: 'certs',        icon: Award,        label: 'Certifications' },
  { id: 'awards',       icon: Award,        label: 'Awards' },
  { id: 'portfolio',    icon: Link2,        label: 'Portfolio' },
  { id: 'socials',      icon: Globe,        label: 'Social Links' },
  { id: 'preferences',  icon: Target,       label: 'Job Preferences' },
  { id: 'references',   icon: Users,        label: 'References' },
];

const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const LANG_LEVELS  = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native'];
const JOB_TYPES    = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE'];
const SALARY_FREQS = ['yearly', 'monthly', 'daily', 'weekly', 'hourly'];

export default function ApplicantProfilePage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState('personal');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const { data: profile, isLoading } = useQuery<ApplicantProfile>({
    queryKey: ['applicant-profile-me'],
    queryFn: () => usersApi.getApplicantProfile().then(r => r.data.data ?? r.data),
  });

  const update = useMutation({
    mutationFn: (data: any) => usersApi.updateApplicantProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applicant-profile-me'] });
      toast.success('Saved');
    },
    onError: () => toast.error('Failed to save'),
  });

  const uploadPicture = useMutation({
    mutationFn: (form: FormData) => usersApi.updateApplicantPicture(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applicant-profile-me'] }); toast.success('Photo updated'); },
  });

  const scrollTo = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  };

  const { data: completeness } = useQuery<{ score: number }>({
    queryKey: ['applicant-profile-completeness'],
    queryFn: () => usersApi.getProfileCompleteness().then(r => r.data.data ?? r.data),
  });

  const displayName = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();
  const save = (data: Partial<ApplicantProfile>) => update.mutate(data);

  if (isLoading) {
    return (
      <>
        <TopBar title="My Profile" />
        <div className="p-6 grid lg:grid-cols-[220px_1fr] gap-6 max-w-5xl mx-auto">
          <Skeleton className="h-96 rounded-xl" />
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="My Profile" />
      <div className="p-6 grid lg:grid-cols-[220px_1fr] gap-6 max-w-5xl mx-auto items-start">

        {/* Sidebar */}
        <div className="lg:sticky lg:top-4 space-y-3">
          {/* Avatar card */}
          <div className="bg-surface border border-border rounded-xl p-4 flex flex-col items-center gap-3 text-center">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.profilePicture} />
                <AvatarFallback className="text-lg">{getInitials(displayName || 'U')}</AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                <Camera className="h-3 w-3 text-primary-foreground" />
                <input type="file" accept="image/*" className="sr-only" onChange={e => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const form = new FormData(); form.append('file', f);
                  uploadPicture.mutate(form);
                }} />
              </label>
            </div>
            <div>
              <p className="font-semibold text-sm">{displayName || 'Anonymous User'}</p>
              {profile?.professionalTitle && <p className="text-xs text-muted-foreground mt-0.5">{profile.professionalTitle}</p>}
            </div>

            {completeness?.score != null && (
              <div className="w-full space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Completeness</span>
                  <span className="text-primary font-bold">{completeness.score}%</span>
                </div>
                <div className="h-2 w-full bg-surface-raised rounded-full overflow-hidden border border-border">
                  <div
                    className="h-full bg-primary transition-all duration-500 rounded-full"
                    style={{ width: `${completeness.score}%` }}
                  />
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/5 mt-1"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,.doc,.docx,.txt,.png,.jpg';
                input.onchange = async (e: any) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  toast.loading('AI is parsing your CV & filling your profile...', { id: 'autofill' });
                  try {
                    const form = new FormData();
                    form.append('file', file);
                    form.append('autoFillProfile', 'true');
                    form.append('title', file.name.replace(/\.[^.]+$/, ''));
                    await cvsApi.upload(form);
                    qc.invalidateQueries({ queryKey: ['applicant-profile-me'] });
                    qc.invalidateQueries({ queryKey: ['applicant-profile-completeness'] });
                    toast.success('Profile auto-filled from CV!', { id: 'autofill' });
                  } catch (err: any) {
                    toast.error(err.response?.data?.message ?? 'Failed to parse CV', { id: 'autofill' });
                  }
                };
                input.click();
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Auto-Fill Profile from CV
            </Button>
          </div>

          {/* Section nav */}
          <div className="bg-surface border border-border rounded-xl p-2 space-y-0.5">
            {SECTION_NAV.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => scrollTo(id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors',
                  activeSection === id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-surface-raised',
                )}>
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-5 min-w-0">

          {/* Personal Info */}
          <ProfileSection id="personal" label="Personal Information" icon={User} sectionRefs={sectionRefs} setActive={setActiveSection}>
            <PersonalInfoForm profile={profile!} onSave={save} saving={update.isPending} />
          </ProfileSection>

          {/* Professional Summary */}
          <ProfileSection id="summary" label="Professional Summary" icon={BookOpen} sectionRefs={sectionRefs} setActive={setActiveSection}>
            <SummaryForm profile={profile!} onSave={save} saving={update.isPending} />
          </ProfileSection>

          {/* Work Experience */}
          <ProfileSection id="experience" label="Work Experience" icon={Briefcase} sectionRefs={sectionRefs} setActive={setActiveSection}>
            <ArraySection
              items={profile?.workExperience ?? []}
              onSave={items => save({ workExperience: items })}
              saving={update.isPending}
              renderItem={(exp: ProfileExperience, onEdit, onDelete) => (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Briefcase className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{exp.position}</p>
                    <p className="text-xs text-muted-foreground">{exp.company} {exp.location ? `· ${exp.location}` : ''}</p>
                    <p className="text-xs text-muted-foreground">{exp.startDate} — {exp.isCurrent ? 'Present' : exp.endDate ?? ''}</p>
                    {exp.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{exp.description}</p>}
                  </div>
                  <ItemActions onEdit={onEdit} onDelete={onDelete} />
                </div>
              )}
              renderForm={(item, onChange) => <ExperienceForm item={item} onChange={onChange} />}
              emptyItem={{ company: '', position: '', startDate: '', endDate: '', isCurrent: false, description: '', location: '' }}
              emptyLabel="No work experience added yet"
            />
          </ProfileSection>

          {/* Education */}
          <ProfileSection id="education" label="Education" icon={GraduationCap} sectionRefs={sectionRefs} setActive={setActiveSection}>
            <ArraySection
              items={profile?.education ?? []}
              onSave={items => save({ education: items })}
              saving={update.isPending}
              renderItem={(edu: ProfileEducation, onEdit, onDelete) => (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <GraduationCap className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}</p>
                    <p className="text-xs text-muted-foreground">{edu.institution} {edu.country ? `· ${edu.country}` : ''}</p>
                    <p className="text-xs text-muted-foreground">{edu.startDate ?? ''} — {edu.endDate ?? 'Present'}</p>
                    {edu.grade && <p className="text-xs text-muted-foreground">Grade: {edu.grade}</p>}
                  </div>
                  <ItemActions onEdit={onEdit} onDelete={onDelete} />
                </div>
              )}
              renderForm={(item, onChange) => <EducationForm item={item} onChange={onChange} />}
              emptyItem={{ institution: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', grade: '', country: '', description: '' }}
              emptyLabel="No education history added yet"
            />
          </ProfileSection>

          {/* Skills */}
          <ProfileSection id="skills" label="Skills" icon={Star} sectionRefs={sectionRefs} setActive={setActiveSection}>
            <SkillsForm skills={profile?.skills ?? []} onSave={skills => save({ skills })} saving={update.isPending} />
          </ProfileSection>

          {/* Languages */}
          <ProfileSection id="languages" label="Languages" icon={Languages} sectionRefs={sectionRefs} setActive={setActiveSection}>
            <LanguagesForm langs={profile?.languages ?? []} onSave={langs => save({ languages: langs })} saving={update.isPending} />
          </ProfileSection>

          {/* Certifications */}
          <ProfileSection id="certs" label="Certifications" icon={Award} sectionRefs={sectionRefs} setActive={setActiveSection}>
            <ArraySection
              items={profile?.certifications ?? []}
              onSave={items => save({ certifications: items })}
              saving={update.isPending}
              renderItem={(cert: ProfileCertification, onEdit, onDelete) => (
                <div className="flex items-start gap-3">
                  <Award className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{cert.certification}</p>
                    {cert.institution && <p className="text-xs text-muted-foreground">{cert.institution}</p>}
                    {cert.dateObtained && <p className="text-xs text-muted-foreground">{cert.dateObtained}</p>}
                  </div>
                  <ItemActions onEdit={onEdit} onDelete={onDelete} />
                </div>
              )}
              renderForm={(item, onChange) => (
                <div className="grid sm:grid-cols-2 gap-3">
                  <Combobox label="Certification name *" value={item.certification ?? ''} onChange={v => onChange({ ...item, certification: v })} options={CERTIFICATIONS} placeholder="Search certifications…" />
                  <LabeledInput label="Issuing institution" value={item.institution ?? ''} onChange={v => onChange({ ...item, institution: v })} placeholder="Amazon Web Services" />
                  <LabeledInput label="Date obtained" type="date" value={item.dateObtained ?? ''} onChange={v => onChange({ ...item, dateObtained: v })} />
                  <LabeledInput label="Description" value={item.description ?? ''} onChange={v => onChange({ ...item, description: v })} placeholder="Brief description" />
                </div>
              )}
              emptyItem={{ certification: '', institution: '', dateObtained: '', description: '' }}
              emptyLabel="No certifications added yet"
            />
          </ProfileSection>

          {/* Awards */}
          <ProfileSection id="awards" label="Awards & Achievements" icon={Award} sectionRefs={sectionRefs} setActive={setActiveSection}>
            <ArraySection
              items={profile?.awards ?? []}
              onSave={items => save({ awards: items })}
              saving={update.isPending}
              renderItem={(award: ProfileAward, onEdit, onDelete) => (
                <div className="flex items-start gap-3">
                  <Star className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{award.title}</p>
                    {award.recipient && <p className="text-xs text-muted-foreground">Recipient: {award.recipient}</p>}
                    {award.date && <p className="text-xs text-muted-foreground">{award.date}</p>}
                    {award.description && <p className="text-xs text-muted-foreground line-clamp-2">{award.description}</p>}
                  </div>
                  <ItemActions onEdit={onEdit} onDelete={onDelete} />
                </div>
              )}
              renderForm={(item, onChange) => (
                <div className="grid sm:grid-cols-2 gap-3">
                  <LabeledInput label="Award title *" value={item.title ?? ''} onChange={v => onChange({ ...item, title: v })} placeholder="Employee of the Year" />
                  <LabeledInput label="Recipient" value={item.recipient ?? ''} onChange={v => onChange({ ...item, recipient: v })} placeholder="Your name / team" />
                  <LabeledInput label="Date" type="date" value={item.date ?? ''} onChange={v => onChange({ ...item, date: v })} />
                  <LabeledInput label="Description" value={item.description ?? ''} onChange={v => onChange({ ...item, description: v })} placeholder="Brief description" />
                </div>
              )}
              emptyItem={{ title: '', recipient: '', date: '', description: '' }}
              emptyLabel="No awards added yet"
            />
          </ProfileSection>

          {/* Portfolio */}
          <ProfileSection id="portfolio" label="Portfolio Links" icon={Link2} sectionRefs={sectionRefs} setActive={setActiveSection}>
            <PortfolioForm links={profile?.portfolioLinks ?? []} onSave={links => save({ portfolioLinks: links })} saving={update.isPending} />
          </ProfileSection>

          {/* Social Links */}
          <ProfileSection id="socials" label="Social Links" icon={Globe} sectionRefs={sectionRefs} setActive={setActiveSection}>
            <SocialLinksForm profile={profile!} onSave={save} saving={update.isPending} />
          </ProfileSection>

          {/* Job Preferences */}
          <ProfileSection id="preferences" label="Job Preferences" icon={Target} sectionRefs={sectionRefs} setActive={setActiveSection}>
            <PreferencesForm profile={profile!} onSave={save} saving={update.isPending} />
          </ProfileSection>

          {/* References */}
          <ProfileSection id="references" label="References" icon={Users} sectionRefs={sectionRefs} setActive={setActiveSection}>
            <ArraySection
              items={profile?.references ?? []}
              onSave={items => save({ references: items })}
              saving={update.isPending}
              renderItem={(ref: ProfileReference, onEdit, onDelete) => (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-surface-raised flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{ref.name}</p>
                    <p className="text-xs text-muted-foreground">{ref.title ?? ''} {ref.company ? `at ${ref.company}` : ''}</p>
                    {ref.email && <p className="text-xs text-muted-foreground">{ref.email}</p>}
                    {ref.phone && <p className="text-xs text-muted-foreground">{ref.phone}</p>}
                  </div>
                  <ItemActions onEdit={onEdit} onDelete={onDelete} />
                </div>
              )}
              renderForm={(item, onChange) => (
                <div className="grid sm:grid-cols-2 gap-3">
                  <LabeledInput label="Full name *" value={item.name ?? ''} onChange={v => onChange({ ...item, name: v })} placeholder="Jane Doe" />
                  <LabeledInput label="Job title" value={item.title ?? ''} onChange={v => onChange({ ...item, title: v })} placeholder="Senior Manager" />
                  <LabeledInput label="Company" value={item.company ?? ''} onChange={v => onChange({ ...item, company: v })} placeholder="Acme Corp" />
                  <LabeledInput label="Relationship" value={item.relationship ?? ''} onChange={v => onChange({ ...item, relationship: v })} placeholder="Former manager" />
                  <LabeledInput label="Email" type="email" value={item.email ?? ''} onChange={v => onChange({ ...item, email: v })} placeholder="jane@example.com" />
                  <LabeledInput label="Phone" value={item.phone ?? ''} onChange={v => onChange({ ...item, phone: v })} placeholder="+1 555 0000" />
                </div>
              )}
              emptyItem={{ name: '', title: '', company: '', email: '', phone: '', relationship: '' }}
              emptyLabel="No references added yet"
            />
          </ProfileSection>
        </div>
      </div>
    </>
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────────────

function ProfileSection({ id, label, icon: Icon, sectionRefs, setActive, children }: {
  id: string; label: string; icon: React.ElementType;
  sectionRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  setActive: (id: string) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sectionRefs.current[id] = ref.current;
  }, [id, sectionRefs]);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setActive(id);
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [id, setActive]);

  return (
    <div ref={ref} className="bg-surface border border-border rounded-xl overflow-hidden" id={id}>
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Reusable helpers ──────────────────────────────────────────────────────────

function LabeledInput({ label, value, onChange, type = 'text', placeholder, className }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; className?: string;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className="h-8 text-sm" />
    </div>
  );
}

/** Searchable combobox with predefined list + free-form entry */
function Combobox({ label, value, onChange, options, placeholder, className }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string; className?: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = q
    ? options.filter(o => o.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
    : options.slice(0, 8);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={cn('space-y-1 relative', className)} ref={ref}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={value || q}
          onChange={e => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full h-8 pl-8 pr-3 rounded-md border border-border bg-surface text-sm outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setQ(''); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              className="w-full text-left px-3 py-2 text-xs hover:bg-surface-raised transition-colors"
              onMouseDown={e => { e.preventDefault(); onChange(opt); setQ(''); setOpen(false); }}
            >
              {opt}
            </button>
          ))}
          {q && !options.some(o => o.toLowerCase() === q.toLowerCase()) && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-xs text-primary hover:bg-primary/5 transition-colors border-t border-border"
              onMouseDown={e => { e.preventDefault(); onChange(q); setQ(''); setOpen(false); }}
            >
              Add "{q}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SaveBar({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end pt-3 border-t border-border mt-4">
      <Button size="sm" onClick={onSave} disabled={saving} className="gap-1.5">
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        Save
      </Button>
    </div>
  );
}

function ItemActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button onClick={onEdit} className="p-1.5 rounded hover:bg-surface-raised text-muted-foreground hover:text-foreground transition-colors">
        <Edit2 className="h-3.5 w-3.5" />
      </button>
      <button onClick={onDelete} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Generic array section ─────────────────────────────────────────────────────

function ArraySection<T extends Record<string, any>>({
  items, onSave, saving, renderItem, renderForm, emptyItem, emptyLabel,
}: {
  items: T[];
  onSave: (items: T[]) => void;
  saving: boolean;
  renderItem: (item: T, onEdit: () => void, onDelete: () => void) => React.ReactNode;
  renderForm: (item: T, onChange: (item: T) => void) => React.ReactNode;
  emptyItem: T;
  emptyLabel: string;
}) {
  const [list, setList] = useState<T[]>(items);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [draft, setDraft] = useState<T>(emptyItem);

  useEffect(() => { setList(items); }, [items]);

  const saveEdit = () => {
    if (editIdx === null) return;
    const updated = list.map((it, i) => i === editIdx ? draft : it);
    setList(updated);
    onSave(updated);
    setEditIdx(null);
  };

  const saveNew = () => {
    const updated = [...list, draft];
    setList(updated);
    onSave(updated);
    setDraft(emptyItem);
    setAddingNew(false);
  };

  const deleteItem = (idx: number) => {
    const updated = list.filter((_, i) => i !== idx);
    setList(updated);
    onSave(updated);
  };

  return (
    <div className="space-y-3">
      {list.length === 0 && !addingNew && (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      )}

      {list.map((item, idx) => (
        <div key={idx} className="border border-border rounded-lg p-3">
          {editIdx === idx ? (
            <div className="space-y-3">
              {renderForm(draft, setDraft)}
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} disabled={saving} className="gap-1 h-7 text-xs">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditIdx(null)} className="h-7 text-xs">Cancel</Button>
              </div>
            </div>
          ) : (
            renderItem(item, () => { setDraft({ ...item }); setEditIdx(idx); }, () => deleteItem(idx))
          )}
        </div>
      ))}

      {addingNew && (
        <div className="border border-primary/30 rounded-lg p-3 space-y-3 bg-primary/5">
          {renderForm(draft, setDraft)}
          <div className="flex gap-2">
            <Button size="sm" onClick={saveNew} disabled={saving} className="gap-1 h-7 text-xs">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAddingNew(false); setDraft(emptyItem); }} className="h-7 text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {!addingNew && (
        <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs"
          onClick={() => { setDraft(emptyItem); setAddingNew(true); }}>
          <Plus className="h-3 w-3" /> Add
        </Button>
      )}
    </div>
  );
}

// ─── Section-specific forms ────────────────────────────────────────────────────

function PersonalInfoForm({ profile, onSave, saving }: { profile: ApplicantProfile; onSave: (d: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    middleName: profile?.middleName ?? '',
    phoneNumber: profile?.phoneNumber ?? '',
    dateOfBirth: profile?.dateOfBirth ?? '',
    headline: profile?.headline ?? '',
    professionalTitle: profile?.professionalTitle ?? '',
    yearsOfExperience: profile?.yearsOfExperience ?? '',
    country: profile?.country ?? '',
    state: profile?.state ?? '',
    city: profile?.city ?? '',
    zipCode: profile?.zipCode ?? '',
    address: profile?.address ?? '',
  });

  useEffect(() => {
    if (profile) setForm({
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      middleName: profile.middleName ?? '',
      phoneNumber: profile.phoneNumber ?? '',
      dateOfBirth: profile.dateOfBirth ?? '',
      headline: profile.headline ?? '',
      professionalTitle: profile.professionalTitle ?? '',
      yearsOfExperience: profile.yearsOfExperience ?? '',
      country: profile.country ?? '',
      state: profile.state ?? '',
      city: profile.city ?? '',
      zipCode: profile.zipCode ?? '',
      address: profile.address ?? '',
    });
  }, [profile]);

  const f = (field: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [field]: v }));

  return (
    <>
      <div className="grid sm:grid-cols-3 gap-3">
        <LabeledInput label="First name *" value={form.firstName} onChange={f('firstName')} placeholder="John" />
        <LabeledInput label="Middle name" value={form.middleName} onChange={f('middleName')} placeholder="M." />
        <LabeledInput label="Last name *" value={form.lastName} onChange={f('lastName')} placeholder="Doe" />
        <LabeledInput label="Phone number" value={form.phoneNumber} onChange={f('phoneNumber')} placeholder="+1 555 000 0000" type="tel" />
        <LabeledInput label="Date of birth" value={form.dateOfBirth} onChange={f('dateOfBirth')} type="date" />
        <LabeledInput label="Professional title" value={form.professionalTitle} onChange={f('professionalTitle')} placeholder="Senior Software Engineer" />
        <LabeledInput label="Headline" value={form.headline} onChange={f('headline')} placeholder="Building the future of tech" className="sm:col-span-2" />
        <LabeledInput label="Years of experience" value={form.yearsOfExperience} onChange={f('yearsOfExperience')} placeholder="5" />
        <Combobox label="Country" value={form.country} onChange={f('country')} options={COUNTRIES} placeholder="Search country…" />
        <LabeledInput label="State / Region" value={form.state} onChange={f('state')} placeholder="California" />
        <LabeledInput label="City" value={form.city} onChange={f('city')} placeholder="San Francisco" />
        <LabeledInput label="Zip code" value={form.zipCode} onChange={f('zipCode')} placeholder="94105" />
        <LabeledInput label="Address" value={form.address} onChange={f('address')} placeholder="123 Main St" className="sm:col-span-2" />
      </div>
      <SaveBar onSave={() => onSave(form)} saving={saving} />
    </>
  );
}

function SummaryForm({ profile, onSave, saving }: { profile: ApplicantProfile; onSave: (d: any) => void; saving: boolean }) {
  const [text, setText] = useState(profile?.professionalSummary ?? '');
  useEffect(() => { if (profile) setText(profile.professionalSummary ?? ''); }, [profile]);
  return (
    <>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Professional Summary</label>
        <textarea
          rows={6}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Write a compelling summary about your professional background, skills, and goals…"
          className="w-full resize-none bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <p className="text-[11px] text-muted-foreground text-right">{text.length} chars</p>
      </div>
      <SaveBar onSave={() => onSave({ professionalSummary: text })} saving={saving} />
    </>
  );
}

function ExperienceForm({ item, onChange }: { item: ProfileExperience; onChange: (v: ProfileExperience) => void }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <LabeledInput label="Company *" value={item.company} onChange={v => onChange({ ...item, company: v })} placeholder="Acme Corp" />
      <LabeledInput label="Position / Title *" value={item.position} onChange={v => onChange({ ...item, position: v })} placeholder="Software Engineer" />
      <LabeledInput label="Location" value={item.location ?? ''} onChange={v => onChange({ ...item, location: v })} placeholder="San Francisco, CA" />
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Currently working here</label>
        <label className="flex items-center gap-2 cursor-pointer mt-2">
          <input type="checkbox" checked={!!item.isCurrent} onChange={e => onChange({ ...item, isCurrent: e.target.checked, endDate: e.target.checked ? undefined : item.endDate })}
            className="rounded border-border" />
          <span className="text-xs text-foreground">Yes, I currently work here</span>
        </label>
      </div>
      <LabeledInput label="Start date *" type="date" value={item.startDate} onChange={v => onChange({ ...item, startDate: v })} />
      {!item.isCurrent && (
        <LabeledInput label="End date" type="date" value={item.endDate ?? ''} onChange={v => onChange({ ...item, endDate: v })} />
      )}
      <div className="sm:col-span-2 space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Description</label>
        <textarea rows={3} value={item.description ?? ''} onChange={e => onChange({ ...item, description: e.target.value })}
          placeholder="Describe your responsibilities and achievements…"
          className="w-full resize-none bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
    </div>
  );
}

function EducationForm({ item, onChange }: { item: ProfileEducation; onChange: (v: ProfileEducation) => void }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <LabeledInput label="Institution *" value={item.institution} onChange={v => onChange({ ...item, institution: v })} placeholder="MIT" className="sm:col-span-2" />
      <LabeledInput label="Degree *" value={item.degree} onChange={v => onChange({ ...item, degree: v })} placeholder="Bachelor of Science" />
      <LabeledInput label="Field of study" value={item.fieldOfStudy ?? ''} onChange={v => onChange({ ...item, fieldOfStudy: v })} placeholder="Computer Science" />
      <LabeledInput label="Country" value={item.country ?? ''} onChange={v => onChange({ ...item, country: v })} placeholder="United States" />
      <LabeledInput label="City" value={item.city ?? ''} onChange={v => onChange({ ...item, city: v })} placeholder="Cambridge, MA" />
      <LabeledInput label="Start date" type="date" value={item.startDate ?? ''} onChange={v => onChange({ ...item, startDate: v })} />
      <LabeledInput label="End date" type="date" value={item.endDate ?? ''} onChange={v => onChange({ ...item, endDate: v })} />
      <LabeledInput label="Grade / GPA" value={item.grade ?? ''} onChange={v => onChange({ ...item, grade: v })} placeholder="3.8 / 4.0" />
    </div>
  );
}

function SkillsForm({ skills, onSave, saving }: { skills: ProfileSkill[]; onSave: (s: ProfileSkill[]) => void; saving: boolean }) {
  const [list, setList] = useState<ProfileSkill[]>(skills);
  const [newSkill, setNewSkill] = useState('');
  const [newLevel, setNewLevel] = useState('Intermediate');
  useEffect(() => { setList(skills); }, [skills]);

  const add = (skillName?: string) => {
    const name = (skillName ?? newSkill).trim();
    if (!name || list.some(s => s.skill.toLowerCase() === name.toLowerCase())) return;
    setList(prev => [...prev, { skill: name, level: newLevel }]);
    setNewSkill('');
  };
  const remove = (i: number) => setList(list.filter((_, j) => j !== i));

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-3">
        {list.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20">
            {s.skill}
            {s.level && <span className="text-[10px] opacity-70">· {s.level}</span>}
            <button onClick={() => remove(i)} className="hover:text-destructive transition-colors"><Trash2 className="h-2.5 w-2.5" /></button>
          </span>
        ))}
        {list.length === 0 && <p className="text-xs text-muted-foreground">No skills added yet</p>}
      </div>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <SkillCombobox
            value={newSkill}
            onChange={setNewSkill}
            onSelect={add}
            existing={list.map(s => s.skill)}
          />
        </div>
        <select value={newLevel} onChange={e => setNewLevel(e.target.value)}
          className="h-8 text-xs bg-surface-raised border border-border rounded-md px-2 text-foreground shrink-0">
          {SKILL_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <Button size="sm" variant="outline" onClick={() => add()} className="h-8 shrink-0"><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      <SaveBar onSave={() => onSave(list)} saving={saving} />
    </>
  );
}

function SkillCombobox({ value, onChange, onSelect, existing }: {
  value: string; onChange: (v: string) => void; onSelect: (v: string) => void; existing: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const suggestions = SKILLS.filter(s =>
    s.toLowerCase().includes(value.toLowerCase()) &&
    !existing.some(e => e.toLowerCase() === s.toLowerCase())
  ).slice(0, 8);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === 'Enter') { onSelect(value); setOpen(false); } }}
          placeholder="Search or type a skill…"
          className="w-full h-8 pl-8 pr-3 rounded-md border border-border bg-surface text-sm outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
        />
      </div>
      {open && (suggestions.length > 0 || value.trim()) && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map(s => (
            <button key={s} type="button"
              className="w-full text-left px-3 py-2 text-xs hover:bg-surface-raised transition-colors"
              onMouseDown={e => { e.preventDefault(); onSelect(s); onChange(''); setOpen(false); }}>
              {s}
            </button>
          ))}
          {value.trim() && !SKILLS.some(s => s.toLowerCase() === value.toLowerCase()) && (
            <button type="button"
              className="w-full text-left px-3 py-2 text-xs text-primary hover:bg-primary/5 transition-colors border-t border-border"
              onMouseDown={e => { e.preventDefault(); onSelect(value); onChange(''); setOpen(false); }}>
              Add "{value}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LanguagesForm({ langs, onSave, saving }: { langs: ProfileLanguage[]; onSave: (l: ProfileLanguage[]) => void; saving: boolean }) {
  const [list, setList] = useState<ProfileLanguage[]>(langs);
  const [newLang, setNewLang] = useState('');
  const [newLevel, setNewLevel] = useState('B2');
  useEffect(() => { setList(langs); }, [langs]);

  const add = () => {
    if (!newLang.trim()) return;
    setList(prev => [...prev, { language: newLang.trim(), level: newLevel }]);
    setNewLang('');
  };
  const remove = (i: number) => setList(list.filter((_, j) => j !== i));

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-3">
        {list.map((l, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-raised text-foreground text-xs rounded-full border border-border">
            {l.language}
            <Badge variant="outline" className="text-[10px] px-1">{l.level}</Badge>
            <button onClick={() => remove(i)} className="hover:text-destructive transition-colors"><Trash2 className="h-2.5 w-2.5" /></button>
          </span>
        ))}
        {list.length === 0 && <p className="text-xs text-muted-foreground">No languages added yet</p>}
      </div>
      <div className="flex gap-2">
        <Input value={newLang} onChange={e => setNewLang(e.target.value)} placeholder="Language…" className="h-8 text-sm"
          onKeyDown={e => e.key === 'Enter' && add()} />
        <select value={newLevel} onChange={e => setNewLevel(e.target.value)}
          className="h-8 text-xs bg-surface-raised border border-border rounded-md px-2 text-foreground">
          {LANG_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <Button size="sm" variant="outline" onClick={add} className="h-8"><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      <SaveBar onSave={() => onSave(list)} saving={saving} />
    </>
  );
}

function PortfolioForm({ links, onSave, saving }: { links: string[]; onSave: (l: string[]) => void; saving: boolean }) {
  const [list, setList] = useState<string[]>(links);
  const [newLink, setNewLink] = useState('');
  useEffect(() => { setList(links); }, [links]);

  const add = () => {
    if (!newLink.trim()) return;
    setList(prev => [...prev, newLink.trim()]);
    setNewLink('');
  };
  const remove = (i: number) => setList(list.filter((_, j) => j !== i));

  return (
    <>
      <div className="space-y-2 mb-3">
        {list.map((link, i) => (
          <div key={i} className="flex items-center gap-2 bg-surface-raised border border-border rounded-lg px-3 py-2">
            <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
            <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate flex-1">{link}</a>
            <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        {list.length === 0 && <p className="text-xs text-muted-foreground">No portfolio links added yet</p>}
      </div>
      <div className="flex gap-2">
        <Input value={newLink} onChange={e => setNewLink(e.target.value)} placeholder="https://github.com/you/project" className="h-8 text-sm"
          onKeyDown={e => e.key === 'Enter' && add()} />
        <Button size="sm" variant="outline" onClick={add} className="h-8"><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      <SaveBar onSave={() => onSave(list)} saving={saving} />
    </>
  );
}

function SocialLinksForm({ profile, onSave, saving }: { profile: ApplicantProfile; onSave: (d: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    linkedInProfile: profile?.linkedInProfile ?? '',
    githubProfile: profile?.githubProfile ?? '',
    twitterProfile: profile?.twitterProfile ?? '',
    instagramProfile: profile?.instagramProfile ?? '',
    facebookProfile: profile?.facebookProfile ?? '',
    youtubeProfile: profile?.youtubeProfile ?? '',
  });
  useEffect(() => {
    if (profile) setForm({
      linkedInProfile: profile.linkedInProfile ?? '',
      githubProfile: profile.githubProfile ?? '',
      twitterProfile: profile.twitterProfile ?? '',
      instagramProfile: profile.instagramProfile ?? '',
      facebookProfile: profile.facebookProfile ?? '',
      youtubeProfile: profile.youtubeProfile ?? '',
    });
  }, [profile]);

  const f = (field: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [field]: v }));
  const SOCIALS = [
    { field: 'linkedInProfile' as const, label: 'LinkedIn', placeholder: 'https://linkedin.com/in/you' },
    { field: 'githubProfile' as const, label: 'GitHub', placeholder: 'https://github.com/you' },
    { field: 'twitterProfile' as const, label: 'Twitter / X', placeholder: 'https://x.com/you' },
    { field: 'instagramProfile' as const, label: 'Instagram', placeholder: 'https://instagram.com/you' },
    { field: 'facebookProfile' as const, label: 'Facebook', placeholder: 'https://facebook.com/you' },
    { field: 'youtubeProfile' as const, label: 'YouTube', placeholder: 'https://youtube.com/@you' },
  ];

  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3">
        {SOCIALS.map(({ field, label, placeholder }) => (
          <LabeledInput key={field} label={label} value={form[field]} onChange={f(field)} placeholder={placeholder} />
        ))}
      </div>
      <SaveBar onSave={() => onSave(form)} saving={saving} />
    </>
  );
}

const WORK_TYPES = ['REMOTE', 'ONSITE', 'HYBRID'];
const COMMON_BENEFITS = ['HMO / Health Insurance', 'Housing Allowance', 'Travel Allowance', 'Equity / Stock Options', 'Relocation Assistance', 'Flexible Hours', 'Remote Work Stipend', 'Learning & Development', 'Parental Leave'];

function PreferencesForm({ profile, onSave, saving }: { profile: ApplicantProfile; onSave: (d: any) => void; saving: boolean }) {
  const [desiredTitles, setDesiredTitles] = useState<string[]>(profile?.desiredJobTitles ?? []);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>(profile?.jobTypes ?? []);
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<string[]>(profile?.workTypes ?? []);
  const [openToRelocation, setOpenToRelocation] = useState(profile?.openToRelocation ?? false);
  const [preferredCountries, setPreferredCountries] = useState<string[]>(profile?.preferredCountries ?? []);
  const [preferredCompanies, setPreferredCompanies] = useState<string[]>(profile?.preferredCompanies ?? []);
  const [preferredBenefits, setPreferredBenefits] = useState<string[]>(profile?.preferredBenefits ?? []);
  const [expectedSalaries, setExpectedSalaries] = useState<ProfileSalaryRange[]>(
    profile?.expectedSalaries?.length ? profile.expectedSalaries : (profile?.salaryRanges ?? [])
  );

  const [newTitle, setNewTitle] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newBenefit, setNewBenefit] = useState('');

  // Salary draft
  const [salCurrency, setSalCurrency] = useState('USD');
  const [salMin, setSalMin] = useState('');
  const [salMax, setSalMax] = useState('');
  const [salFreq, setSalFreq] = useState<string>('yearly');
  const [showAddSalary, setShowAddSalary] = useState(false);

  useEffect(() => {
    if (profile) {
      setDesiredTitles(profile.desiredJobTitles ?? []);
      setSelectedJobTypes(profile.jobTypes ?? []);
      setSelectedWorkTypes(profile.workTypes ?? []);
      setOpenToRelocation(profile.openToRelocation ?? false);
      setPreferredCountries(profile.preferredCountries ?? []);
      setPreferredCompanies(profile.preferredCompanies ?? []);
      setPreferredBenefits(profile.preferredBenefits ?? []);
      setExpectedSalaries(profile.expectedSalaries?.length ? profile.expectedSalaries : (profile.salaryRanges ?? []));
    }
  }, [profile]);

  const addTitle = () => {
    if (!newTitle.trim()) return;
    setDesiredTitles(prev => [...prev, newTitle.trim()]);
    setNewTitle('');
  };

  const addCountry = () => {
    if (!newCountry.trim() || preferredCountries.includes(newCountry.trim())) return;
    setPreferredCountries(prev => [...prev, newCountry.trim()]);
    setNewCountry('');
  };

  const addCompany = () => {
    if (!newCompany.trim() || preferredCompanies.includes(newCompany.trim())) return;
    setPreferredCompanies(prev => [...prev, newCompany.trim()]);
    setNewCompany('');
  };

  const toggleBenefit = (b: string) => {
    setPreferredBenefits(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  };

  const addCustomBenefit = () => {
    if (!newBenefit.trim() || preferredBenefits.includes(newBenefit.trim())) return;
    setPreferredBenefits(prev => [...prev, newBenefit.trim()]);
    setNewBenefit('');
  };

  const addSalaryRange = () => {
    if (!salMin && !salMax) return;
    const cleanCurr = salCurrency.toUpperCase().trim() || 'USD';
    const cleanFreq = salFreq.toLowerCase().trim();
    const duplicate = expectedSalaries.find(
      s => (s.currency || '').toUpperCase() === cleanCurr && (s.frequency || '').toLowerCase() === cleanFreq
    );
    if (duplicate) {
      toast.error(`An expected salary for ${cleanCurr} (${cleanFreq}) already exists. Duplicate frequency for the same currency is not allowed.`);
      return;
    }
    const item: ProfileSalaryRange = {
      currency: cleanCurr,
      minAmount: Number(salMin) || 0,
      maxAmount: Number(salMax) || 0,
      frequency: cleanFreq as any,
    };
    setExpectedSalaries(prev => [...prev, item]);
    setSalMin('');
    setSalMax('');
    setShowAddSalary(false);
  };

  const removeSalaryRange = (idx: number) => {
    setExpectedSalaries(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleJobType = (t: string) =>
    setSelectedJobTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const toggleWorkType = (t: string) =>
    setSelectedWorkTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handleSave = () => {
    onSave({
      desiredJobTitles: desiredTitles,
      jobTypes: selectedJobTypes,
      workTypes: selectedWorkTypes,
      openToRelocation,
      preferredCountries: openToRelocation ? preferredCountries : [],
      preferredCompanies,
      preferredBenefits,
      expectedSalaries,
      salaryRanges: expectedSalaries,
    });
  };

  return (
    <>
      <div className="space-y-6">

        {/* Work Types (Remote, Onsite, Hybrid) */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Preferred Work Types</p>
          <div className="flex flex-wrap gap-2">
            {WORK_TYPES.map(w => (
              <button
                type="button"
                key={w}
                onClick={() => toggleWorkType(w)}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all',
                  selectedWorkTypes.includes(w)
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'border-border bg-surface-raised text-muted-foreground hover:text-foreground'
                )}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Job Types */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Employment Types</p>
          <div className="flex flex-wrap gap-2">
            {JOB_TYPES.map(t => (
              <button
                type="button"
                key={t}
                onClick={() => toggleJobType(t)}
                className={cn(
                  'px-3 py-1 text-xs rounded-full border transition-colors',
                  selectedJobTypes.includes(t)
                    ? 'bg-surface-raised border-primary text-primary font-medium'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {t.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Desired Titles */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Desired Job Titles</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {desiredTitles.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-raised text-foreground text-xs rounded-full border border-border">
                {t}
                <button type="button" onClick={() => setDesiredTitles(prev => prev.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="e.g. Senior Fullstack Engineer"
              className="h-8 text-sm"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTitle(); } }}
            />
            <Button size="sm" variant="outline" onClick={addTitle} className="h-8"><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
          </div>
        </div>

        {/* Relocation & Most Preferred Countries */}
        <div className="space-y-3 rounded-xl border border-border bg-surface-raised/40 p-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={openToRelocation}
              onChange={e => setOpenToRelocation(e.target.checked)}
              className="rounded border-border accent-primary h-4 w-4"
            />
            <div>
              <span className="text-xs font-bold text-foreground block">Open to Relocation</span>
              <span className="text-[11px] text-muted-foreground block">Check if you are willing to relocate for the right job opportunity</span>
            </div>
          </label>

          {openToRelocation && (
            <div className="pt-2 border-t border-border/50 space-y-2">
              <p className="text-xs font-medium text-foreground">Most Preferred Countries for Relocation</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {preferredCountries.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/20 text-xs rounded-full font-medium">
                    {c}
                    <button type="button" onClick={() => setPreferredCountries(prev => prev.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3 text-primary/70 hover:text-primary" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newCountry}
                  onChange={e => setNewCountry(e.target.value)}
                  placeholder="e.g. Canada, Germany, United Kingdom"
                  className="h-8 text-sm"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCountry(); } }}
                />
                <Button size="sm" variant="outline" onClick={addCountry} className="h-8"><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
              </div>
            </div>
          )}
        </div>

        {/* Most Preferred Companies */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Most Preferred Companies</p>
          <p className="text-[11px] text-muted-foreground">List top companies you dream or prefer to work with</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {preferredCompanies.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-raised text-foreground text-xs rounded-full border border-border font-medium">
                {c}
                <button type="button" onClick={() => setPreferredCompanies(prev => prev.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newCompany}
              onChange={e => setNewCompany(e.target.value)}
              placeholder="e.g. Google, Stripe, Microsoft"
              className="h-8 text-sm"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCompany(); } }}
            />
            <Button size="sm" variant="outline" onClick={addCompany} className="h-8"><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
          </div>
        </div>

        {/* Expected Salary (Multiple currencies supported) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-foreground">Expected Salary (Multiple Currencies)</p>
              <p className="text-[11px] text-muted-foreground">Add your expected salary for each currency option</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowAddSalary(!showAddSalary)} className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add Currency Range
            </Button>
          </div>

          {/* List of defined salaries */}
          {expectedSalaries.length > 0 && (
            <div className="space-y-2">
              {expectedSalaries.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface-raised/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase">{s.currency}</span>
                    <span className="font-semibold text-foreground">
                      {s.minAmount ? s.minAmount.toLocaleString() : '0'} – {s.maxAmount ? s.maxAmount.toLocaleString() : 'Any'}
                    </span>
                    <span className="text-muted-foreground">/ {s.frequency}</span>
                  </div>
                  <button type="button" onClick={() => removeSalaryRange(idx)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add salary inline card */}
          {showAddSalary && (
            <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
              <p className="text-xs font-semibold text-foreground">Add Expected Salary</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Input value={salMin} onChange={e => setSalMin(e.target.value)} placeholder="Min Amount" className="h-8 text-xs bg-surface" type="number" />
                <Input value={salMax} onChange={e => setSalMax(e.target.value)} placeholder="Max Amount" className="h-8 text-xs bg-surface" type="number" />
                <Input value={salCurrency} onChange={e => setSalCurrency(e.target.value.toUpperCase())} placeholder="Currency (USD, NGN, GBP)" className="h-8 text-xs bg-surface" />
                <select
                  value={salFreq}
                  onChange={e => setSalFreq(e.target.value)}
                  className="h-8 text-xs bg-surface border border-border rounded-md px-2 text-foreground font-medium"
                >
                  {SALARY_FREQS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowAddSalary(false)} className="h-7 text-xs">Cancel</Button>
                <Button size="sm" onClick={addSalaryRange} className="h-7 text-xs">Save Currency Range</Button>
              </div>
            </div>
          )}
        </div>

        {/* Most Preferred Benefits */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Most Preferred Benefits</p>
          <p className="text-[11px] text-muted-foreground">Select or type benefits that matter most to you</p>
          
          <div className="flex flex-wrap gap-2">
            {COMMON_BENEFITS.map(b => (
              <button
                type="button"
                key={b}
                onClick={() => toggleBenefit(b)}
                className={cn(
                  'px-3 py-1 text-xs rounded-full border transition-all',
                  preferredBenefits.includes(b)
                    ? 'bg-primary text-primary-foreground border-primary font-medium'
                    : 'border-border bg-surface-raised text-muted-foreground hover:text-foreground'
                )}
              >
                {b}
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <Input
              value={newBenefit}
              onChange={e => setNewBenefit(e.target.value)}
              placeholder="Custom benefit e.g. Annual Gym Membership"
              className="h-8 text-sm"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomBenefit(); } }}
            />
            <Button size="sm" variant="outline" onClick={addCustomBenefit} className="h-8"><Plus className="h-3.5 w-3.5 mr-1" /> Add Custom</Button>
          </div>
        </div>

      </div>
      <SaveBar onSave={handleSave} saving={saving} />
    </>
  );
}
