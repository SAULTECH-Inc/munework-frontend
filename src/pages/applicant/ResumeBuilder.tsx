import { useState, useCallback, useId } from 'react';
import {
  FileText, Wand2, Download, Share2, ArrowLeft, ArrowRight,
  Plus, Trash2, CheckCircle2, Loader2, User, Briefcase,
  GraduationCap, Wrench, Award, Mail, Phone, MapPin,
  Linkedin, Github, Globe, Sparkles, Save, Eye, Import,
  X, RotateCcw,
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TopBar } from '@/components/common/TopBar';
import { usersApi, cvsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'method' | 'template' | 'edit' | 'preview' | 'export';
type BuildMethod = 'manual' | 'ai' | 'import';
type Template = 'modern' | 'classic' | 'minimal' | 'creative';

interface Exp {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  achievements: string[];
}

interface Edu {
  id: string;
  degree: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
  gpa: string;
}

interface CVData {
  personalInfo: { name: string; title: string; email: string; phone: string; location: string; linkedin: string; github: string; website: string };
  summary: string;
  experience: Exp[];
  education: Edu[];
  skills: string[];
  certifications: string[];
}

const BLANK: CVData = {
  personalInfo: { name: '', title: '', email: '', phone: '', location: '', linkedin: '', github: '', website: '' },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  certifications: [],
};

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'method', label: 'Method' },
  { id: 'template', label: 'Template' },
  { id: 'edit', label: 'Edit' },
  { id: 'preview', label: 'Preview' },
  { id: 'export', label: 'Export' },
];

const TEMPLATES: Array<{ id: Template; label: string; desc: string; accent: string }> = [
  { id: 'modern',   label: 'Modern',   desc: 'Sidebar layout with primary accent', accent: 'from-violet-600 to-purple-700' },
  { id: 'classic',  label: 'Classic',  desc: 'Traditional full-width chronological', accent: 'from-slate-700 to-slate-900' },
  { id: 'minimal',  label: 'Minimal',  desc: 'Clean and spacious with subtle lines', accent: 'from-zinc-500 to-zinc-700' },
  { id: 'creative', label: 'Creative', desc: 'Bold header with striking visuals',    accent: 'from-pink-600 to-violet-700' },
];

const SECTIONS = [
  { id: 'personal',       label: 'Personal Info',   icon: User },
  { id: 'summary',        label: 'Summary',         icon: FileText },
  { id: 'experience',     label: 'Experience',      icon: Briefcase },
  { id: 'education',      label: 'Education',       icon: GraduationCap },
  { id: 'skills',         label: 'Skills',          icon: Wrench },
  { id: 'certifications', label: 'Certifications',  icon: Award },
];

function uid() { return String(Date.now() + Math.random()); }

// ── Map API profile → CVData ───────────────────────────────────────────────

function mapProfile(p: any): CVData {
  const skills = (p.skills ?? p.ProfileSkill ?? []).map(
    (s: any) => typeof s === 'string' ? s : s?.skill?.name ?? s?.skill ?? s?.name ?? '',
  ).filter(Boolean);
  const certs = (p.ProfileCertification ?? p.certifications ?? []).map(
    (c: any) => typeof c === 'string' ? c : c?.certification?.name ?? c?.certification ?? c?.name ?? '',
  ).filter(Boolean);

  return {
    personalInfo: {
      name: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
      title: p.professionalTitle ?? p.headline ?? '',
      email: p.email ?? '',
      phone: p.phoneNumber ?? '',
      location: [p.city, p.state, p.country].filter(Boolean).join(', '),
      linkedin: p.linkedInProfile ?? '',
      github: p.githubProfile ?? '',
      website: p.website ?? '',
    },
    summary: p.professionalSummary ?? '',
    experience: (p.workExperience ?? []).map((e: any) => ({
      id: String(e.id ?? uid()),
      title: e.position ?? '',
      company: e.company ?? '',
      location: e.location ?? '',
      startDate: e.startDate ? e.startDate.slice(0, 7) : '',
      endDate: e.endDate ? e.endDate.slice(0, 7) : '',
      current: e.isCurrent ?? !e.endDate,
      achievements: e.description ? [e.description] : [],
    })),
    education: (p.education ?? []).map((e: any) => ({
      id: String(e.id ?? uid()),
      degree: e.degree ?? '',
      institution: e.institution ?? '',
      location: [e.city, e.country].filter(Boolean).join(', '),
      startDate: e.startDate ? e.startDate.slice(0, 7) : '',
      endDate: e.endDate ? e.endDate.slice(0, 7) : '',
      gpa: e.grade ?? '',
    })),
    skills,
    certifications: certs,
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ResumeBuilderPage() {
  const [step, setStep]         = useState<Step>('method');
  const [method, setMethod]     = useState<BuildMethod | null>(null);
  const [template, setTemplate] = useState<Template>('modern');
  const [cv, setCv]             = useState<CVData>(BLANK);
  const [aiText, setAiText]     = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');

  const profileQ = useQuery({
    queryKey: ['applicant-profile-for-builder'],
    queryFn: () => usersApi.getApplicantProfile().then(r => r.data),
    enabled: false,
  });

  const saveMut = useMutation({
    mutationFn: (data: any) => usersApi.updateApplicantProfile(data),
    onSuccess: () => toast.success('Saved to your profile'),
    onError: () => toast.error('Failed to save'),
  });

  const handleMethod = async (m: BuildMethod) => {
    setMethod(m);
    if (m === 'manual') {
      setCv(BLANK);
      setStep('template');
    } else if (m === 'import') {
      try {
        const r = await profileQ.refetch();
        if (r.data) setCv(mapProfile(r.data?.data ?? r.data));
        toast.success('Profile imported');
        setStep('template');
      } catch {
        toast.error('Failed to import profile');
      }
    } else {
      setStep('template');
    }
  };

  const handleAIGenerate = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    // Pre-fill a skeleton from the text (backend would parse this)
    setCv(prev => ({ ...prev, summary: aiText.trim() }));
    setAiLoading(false);
    toast.success('AI generated summary — fill in the remaining fields');
    setStep('edit');
  };

  const goTo = (s: Step) => setStep(s);

  const stepIdx = STEPS.findIndex(s => s.id === step);

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="CV Builder"
        actions={
          step !== 'method' ? (
            <Button size="sm" variant="ghost" onClick={() => setStep('method')} className="gap-1.5 text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" /> Start over
            </Button>
          ) : undefined
        }
      />

      {/* Step progress */}
      <div className="border-b border-border bg-surface px-6 py-3">
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-0">
              <button
                onClick={() => i < stepIdx && goTo(s.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  s.id === step
                    ? 'bg-primary text-primary-foreground'
                    : i < stepIdx
                    ? 'text-primary cursor-pointer hover:bg-primary/10'
                    : 'text-muted-foreground cursor-default',
                )}
              >
                {i < stepIdx ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <span className="h-4 w-4 rounded-full border text-[10px] flex items-center justify-center">
                    {i + 1}
                  </span>
                )}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn('h-px w-6 mx-1', i < stepIdx ? 'bg-primary' : 'bg-border')} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        {step === 'method'   && <MethodStep   onSelect={handleMethod} aiText={aiText} setAiText={setAiText} onAI={handleAIGenerate} aiLoading={aiLoading} />}
        {step === 'template' && <TemplateStep selected={template} onSelect={setTemplate} onBack={() => goTo('method')} onNext={() => goTo('edit')} />}
        {step === 'edit'     && <EditStep cv={cv} setCv={setCv} activeSection={activeSection} setActiveSection={setActiveSection} onBack={() => goTo('template')} onNext={() => goTo('preview')} />}
        {step === 'preview'  && <PreviewStep cv={cv} template={template} onBack={() => goTo('edit')} onNext={() => goTo('export')} />}
        {step === 'export'   && <ExportStep  cv={cv} template={template} onBack={() => goTo('preview')} onSave={() => saveMut.mutate({ ...cv.personalInfo, professionalSummary: cv.summary })} saving={saveMut.isPending} />}
      </div>
    </div>
  );
}

// ── Step 1: Method ────────────────────────────────────────────────────────────

function MethodStep({ onSelect, aiText, setAiText, onAI, aiLoading }: {
  onSelect: (m: BuildMethod) => void;
  aiText: string;
  setAiText: (v: string) => void;
  onAI: () => void;
  aiLoading: boolean;
}) {
  const [showAI, setShowAI] = useState(false);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">How would you like to create your CV?</h2>
        <p className="text-sm text-muted-foreground">Choose a method to get started</p>
      </div>

      <div className="grid gap-4">
        {[
          { m: 'manual' as BuildMethod, icon: User, label: 'Start from scratch', desc: 'Fill in all sections manually at your own pace' },
          { m: 'ai' as BuildMethod, icon: Sparkles, label: 'Generate with AI', desc: 'Describe your background and let AI structure your CV' },
          { m: 'import' as BuildMethod, icon: Import, label: 'Import from profile', desc: 'Pull data from your existing Mune Work profile' },
        ].map(({ m, icon: Icon, label, desc }) => (
          <button
            key={m}
            onClick={() => m === 'ai' ? setShowAI(true) : onSelect(m)}
            className="flex items-start gap-4 p-5 bg-surface border border-border rounded-xl text-left hover:border-primary/50 hover:bg-surface-raised transition-colors group"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      {showAI && (
        <div className="space-y-3 bg-surface-raised border border-border rounded-xl p-4">
          <p className="text-xs font-medium text-foreground">Describe your background, experience, and skills:</p>
          <textarea
            value={aiText}
            onChange={e => setAiText(e.target.value)}
            placeholder="e.g. I'm a software engineer with 5 years of experience in React and Node.js, previously worked at Acme Corp as Senior Dev, holds BSc in Computer Science from University of Lagos..."
            rows={5}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setShowAI(false)}>Cancel</Button>
            <Button size="sm" onClick={onAI} disabled={!aiText.trim() || aiLoading} className="gap-1.5">
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 2: Template ──────────────────────────────────────────────────────────

function TemplateStep({ selected, onSelect, onBack, onNext }: {
  selected: Template; onSelect: (t: Template) => void; onBack: () => void; onNext: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Choose a template</h2>
        <p className="text-sm text-muted-foreground">Pick a visual style for your CV</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={cn(
              'rounded-xl border-2 overflow-hidden text-left transition-all',
              selected === t.id ? 'border-primary shadow-lg shadow-primary/20' : 'border-border hover:border-primary/40',
            )}
          >
            {/* Thumbnail */}
            <div className={cn('h-36 bg-gradient-to-br', t.accent, 'relative p-3 overflow-hidden')}>
              <TemplateThumbnail id={t.id} />
              {selected === t.id && (
                <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
            {/* Info */}
            <div className="p-3 bg-surface">
              <p className="text-sm font-semibold text-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <Button onClick={onNext} className="gap-1.5">
          Continue <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function TemplateThumbnail({ id }: { id: Template }) {
  if (id === 'modern') return (
    <div className="flex gap-1.5 h-full">
      <div className="w-[35%] bg-white/10 rounded space-y-1 p-1.5">
        <div className="h-5 w-5 rounded-full bg-white/30 mx-auto" />
        <div className="h-1 bg-white/50 rounded mx-auto w-full" />
        <div className="h-1 bg-white/30 rounded mx-auto w-3/4" />
        <div className="mt-1 space-y-0.5">{[60,50,70,40].map((w,i)=><div key={i} className="h-1 bg-white/20 rounded" style={{width:`${w}%`}} />)}</div>
      </div>
      <div className="flex-1 space-y-2 p-1">
        <div className="h-1 bg-white/50 rounded" />
        <div className="space-y-0.5">{[80,60,70].map((w,i)=><div key={i} className="h-1 bg-white/20 rounded" style={{width:`${w}%`}} />)}</div>
        <div className="h-1 bg-white/50 rounded mt-2" />
        <div className="space-y-0.5">{[90,65].map((w,i)=><div key={i} className="h-1 bg-white/20 rounded" style={{width:`${w}%`}} />)}</div>
      </div>
    </div>
  );
  if (id === 'classic') return (
    <div className="p-2 space-y-1.5">
      <div className="text-center space-y-0.5 border-b border-white/20 pb-1.5">
        <div className="h-2 bg-white/70 rounded w-1/2 mx-auto" />
        <div className="h-1 bg-white/40 rounded w-1/3 mx-auto" />
        <div className="flex justify-center gap-1">{[30,25,35].map((w,i)=><div key={i} className="h-1 bg-white/20 rounded" style={{width:`${w}px`}} />)}</div>
      </div>
      {['EXP','EDU','SKILLS'].map(s=>(
        <div key={s} className="space-y-0.5">
          <div className="h-1 bg-white/50 rounded w-1/4" />
          <div className="space-y-0.5">{[80,60].map((w,i)=><div key={i} className="h-1 bg-white/20 rounded" style={{width:`${w}%`}} />)}</div>
        </div>
      ))}
    </div>
  );
  if (id === 'minimal') return (
    <div className="p-3 space-y-2">
      <div className="space-y-0.5">
        <div className="h-2 bg-white/70 rounded w-2/5" />
        <div className="h-1 bg-white/40 rounded w-1/3" />
      </div>
      <div className="h-px bg-white/20" />
      {[1,2,3].map(i=>(
        <div key={i} className="space-y-0.5">
          <div className="h-1 bg-white/40 rounded w-1/5" />
          <div className="space-y-0.5">{[90,70,50].map((w,j)=><div key={j} className="h-0.5 bg-white/20 rounded" style={{width:`${w}%`}} />)}</div>
        </div>
      ))}
    </div>
  );
  return (
    <div>
      <div className="h-16 bg-white/20 flex items-end p-2">
        <div>
          <div className="h-2.5 bg-white rounded w-20 mb-0.5" />
          <div className="h-1 bg-white/60 rounded w-14" />
        </div>
      </div>
      <div className="p-2 grid grid-cols-2 gap-1.5">
        {[1,2].map(col=>(
          <div key={col} className="space-y-0.5">
            <div className="h-1 bg-white/50 rounded w-2/3" />
            {[80,60,70].map((w,i)=><div key={i} className="h-0.5 bg-white/20 rounded" style={{width:`${w}%`}} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 3: Edit ──────────────────────────────────────────────────────────────

function EditStep({ cv, setCv, activeSection, setActiveSection, onBack, onNext }: {
  cv: CVData; setCv: (cv: CVData) => void;
  activeSection: string; setActiveSection: (s: string) => void;
  onBack: () => void; onNext: () => void;
}) {
  const set = useCallback((patch: Partial<CVData>) => setCv({ ...cv, ...patch }), [cv, setCv]);
  const setPI = (patch: Partial<CVData['personalInfo']>) => set({ personalInfo: { ...cv.personalInfo, ...patch } });

  const addExp = () => set({ experience: [...cv.experience, { id: uid(), title: '', company: '', location: '', startDate: '', endDate: '', current: false, achievements: [''] }] });
  const setExp = (id: string, patch: Partial<Exp>) => set({ experience: cv.experience.map(e => e.id === id ? { ...e, ...patch } : e) });
  const delExp = (id: string) => set({ experience: cv.experience.filter(e => e.id !== id) });

  const addEdu = () => set({ education: [...cv.education, { id: uid(), degree: '', institution: '', location: '', startDate: '', endDate: '', gpa: '' }] });
  const setEdu = (id: string, patch: Partial<Edu>) => set({ education: cv.education.map(e => e.id === id ? { ...e, ...patch } : e) });
  const delEdu = (id: string) => set({ education: cv.education.filter(e => e.id !== id) });

  const [skillInput, setSkillInput] = useState('');
  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !cv.skills.includes(s)) { set({ skills: [...cv.skills, s] }); }
    setSkillInput('');
  };

  const [certInput, setCertInput] = useState('');
  const addCert = () => {
    const c = certInput.trim();
    if (c && !cv.certifications.includes(c)) { set({ certifications: [...cv.certifications, c] }); }
    setCertInput('');
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-44 shrink-0 border-r border-border bg-surface py-4 px-2 space-y-0.5">
        {SECTIONS.map(s => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => {
                setActiveSection(s.id);
                document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={cn(
                'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors',
                activeSection === s.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-surface-raised hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-8">

          {/* Personal Info */}
          <section id="sec-personal">
            <SectionHead icon={User} label="Personal Information" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name"><Input value={cv.personalInfo.name} onChange={e => setPI({ name: e.target.value })} placeholder="John Doe" /></Field>
              <Field label="Professional Title"><Input value={cv.personalInfo.title} onChange={e => setPI({ title: e.target.value })} placeholder="Software Engineer" /></Field>
              <Field label="Email"><Input value={cv.personalInfo.email} onChange={e => setPI({ email: e.target.value })} placeholder="john@example.com" /></Field>
              <Field label="Phone"><Input value={cv.personalInfo.phone} onChange={e => setPI({ phone: e.target.value })} placeholder="+234 801 234 5678" /></Field>
              <Field label="Location" className="col-span-2"><Input value={cv.personalInfo.location} onChange={e => setPI({ location: e.target.value })} placeholder="Lagos, Nigeria" /></Field>
              <Field label="LinkedIn URL"><Input value={cv.personalInfo.linkedin} onChange={e => setPI({ linkedin: e.target.value })} placeholder="linkedin.com/in/johndoe" /></Field>
              <Field label="GitHub URL"><Input value={cv.personalInfo.github} onChange={e => setPI({ github: e.target.value })} placeholder="github.com/johndoe" /></Field>
              <Field label="Website / Portfolio" className="col-span-2"><Input value={cv.personalInfo.website} onChange={e => setPI({ website: e.target.value })} placeholder="https://johndoe.dev" /></Field>
            </div>
          </section>

          {/* Summary */}
          <section id="sec-summary">
            <SectionHead icon={FileText} label="Professional Summary" />
            <textarea
              value={cv.summary}
              onChange={e => set({ summary: e.target.value })}
              rows={4}
              placeholder="A brief overview of your professional background, key skills, and career goals..."
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </section>

          {/* Experience */}
          <section id="sec-experience">
            <SectionHead icon={Briefcase} label="Work Experience" action={<Button size="sm" variant="outline" onClick={addExp} className="gap-1"><Plus className="h-3.5 w-3.5" />Add</Button>} />
            {cv.experience.length === 0 && <EmptyState label="No experience added yet" />}
            {cv.experience.map(exp => (
              <div key={exp.id} className="bg-surface-raised border border-border rounded-xl p-4 mb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">{exp.title || 'New Experience'}</p>
                  <button onClick={() => delExp(exp.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Job Title"><Input value={exp.title} onChange={e => setExp(exp.id, { title: e.target.value })} placeholder="Senior Developer" /></Field>
                  <Field label="Company"><Input value={exp.company} onChange={e => setExp(exp.id, { company: e.target.value })} placeholder="Acme Corp" /></Field>
                  <Field label="Location"><Input value={exp.location} onChange={e => setExp(exp.id, { location: e.target.value })} placeholder="Lagos, Nigeria" /></Field>
                  <div />
                  <Field label="Start Date"><Input type="month" value={exp.startDate} onChange={e => setExp(exp.id, { startDate: e.target.value })} /></Field>
                  {!exp.current && <Field label="End Date"><Input type="month" value={exp.endDate} onChange={e => setExp(exp.id, { endDate: e.target.value })} /></Field>}
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={exp.current} onChange={e => setExp(exp.id, { current: e.target.checked })} className="accent-primary" />
                  Currently working here
                </label>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Key Achievements</p>
                  {exp.achievements.map((a, i) => (
                    <div key={i} className="flex gap-2 mb-1.5">
                      <Input
                        value={a}
                        onChange={e => {
                          const next = [...exp.achievements];
                          next[i] = e.target.value;
                          setExp(exp.id, { achievements: next });
                        }}
                        placeholder="Describe an achievement or responsibility..."
                        className="text-xs"
                      />
                      <button onClick={() => setExp(exp.id, { achievements: exp.achievements.filter((_,j) => j !== i) })}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => setExp(exp.id, { achievements: [...exp.achievements, ''] })} className="gap-1 text-xs">
                    <Plus className="h-3 w-3" /> Add achievement
                  </Button>
                </div>
              </div>
            ))}
          </section>

          {/* Education */}
          <section id="sec-education">
            <SectionHead icon={GraduationCap} label="Education" action={<Button size="sm" variant="outline" onClick={addEdu} className="gap-1"><Plus className="h-3.5 w-3.5" />Add</Button>} />
            {cv.education.length === 0 && <EmptyState label="No education added yet" />}
            {cv.education.map(edu => (
              <div key={edu.id} className="bg-surface-raised border border-border rounded-xl p-4 mb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">{edu.degree || 'New Education'}</p>
                  <button onClick={() => delEdu(edu.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Degree / Qualification"><Input value={edu.degree} onChange={e => setEdu(edu.id, { degree: e.target.value })} placeholder="B.Sc Computer Science" /></Field>
                  <Field label="Institution"><Input value={edu.institution} onChange={e => setEdu(edu.id, { institution: e.target.value })} placeholder="University of Lagos" /></Field>
                  <Field label="Location"><Input value={edu.location} onChange={e => setEdu(edu.id, { location: e.target.value })} placeholder="Lagos, Nigeria" /></Field>
                  <Field label="GPA / Grade (optional)"><Input value={edu.gpa} onChange={e => setEdu(edu.id, { gpa: e.target.value })} placeholder="3.8 / 4.0" /></Field>
                  <Field label="Start Date"><Input type="month" value={edu.startDate} onChange={e => setEdu(edu.id, { startDate: e.target.value })} /></Field>
                  <Field label="End Date"><Input type="month" value={edu.endDate} onChange={e => setEdu(edu.id, { endDate: e.target.value })} /></Field>
                </div>
              </div>
            ))}
          </section>

          {/* Skills */}
          <section id="sec-skills">
            <SectionHead icon={Wrench} label="Skills" />
            <div className="flex gap-2 mb-3">
              <Input
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="Type a skill and press Enter..."
              />
              <Button size="sm" variant="outline" onClick={addSkill} disabled={!skillInput.trim()}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {cv.skills.map(s => (
                <span key={s} className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  {s}
                  <button onClick={() => set({ skills: cv.skills.filter(x => x !== s) })} className="hover:text-destructive transition-colors"><X className="h-3 w-3" /></button>
                </span>
              ))}
              {cv.skills.length === 0 && <p className="text-xs text-muted-foreground">No skills added yet</p>}
            </div>
          </section>

          {/* Certifications */}
          <section id="sec-certifications">
            <SectionHead icon={Award} label="Certifications" />
            <div className="flex gap-2 mb-3">
              <Input
                value={certInput}
                onChange={e => setCertInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCert())}
                placeholder="Type a certification and press Enter..."
              />
              <Button size="sm" variant="outline" onClick={addCert} disabled={!certInput.trim()}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {cv.certifications.map(c => (
                <span key={c} className="flex items-center gap-1 px-2.5 py-1 bg-success/10 text-success rounded-full text-xs font-medium">
                  {c}
                  <button onClick={() => set({ certifications: cv.certifications.filter(x => x !== c) })} className="hover:text-destructive transition-colors"><X className="h-3 w-3" /></button>
                </span>
              ))}
              {cv.certifications.length === 0 && <p className="text-xs text-muted-foreground">No certifications added yet</p>}
            </div>
          </section>

          <div className="flex justify-between pt-4 pb-2">
            <Button variant="ghost" onClick={onBack} className="gap-1.5"><ArrowLeft className="h-3.5 w-3.5" /> Back</Button>
            <Button onClick={onNext} className="gap-1.5">Preview <ArrowRight className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Preview ───────────────────────────────────────────────────────────

function PreviewStep({ cv, template, onBack, onNext }: { cv: CVData; template: Template; onBack: () => void; onNext: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface shrink-0">
        <p className="text-sm font-medium text-foreground">Preview — <span className="text-muted-foreground capitalize">{template} template</span></p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onBack} size="sm" className="gap-1.5"><ArrowLeft className="h-3.5 w-3.5" /> Back</Button>
          <Button onClick={onNext} size="sm" className="gap-1.5">Export <ArrowRight className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-background p-6">
        <div className="max-w-3xl mx-auto shadow-xl rounded-lg overflow-hidden">
          <CVTemplate cv={cv} template={template} />
        </div>
      </div>
    </div>
  );
}

// ── Step 5: Export ────────────────────────────────────────────────────────────

function ExportStep({ cv, template, onBack, onSave, saving }: { cv: CVData; template: Template; onBack: () => void; onSave: () => void; saving: boolean }) {
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [title, setTitle] = useState(cv.personalInfo.title ? `${cv.personalInfo.title} Resume` : 'My Built Resume');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [savingCv, setSavingCv] = useState(false);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${cv.personalInfo.name} — CV</title><style>body{margin:0;font-family:sans-serif}</style></head><body>`);
    win.document.write(`<p style="text-align:center;padding:20px;font-family:sans-serif;font-size:13px;color:#666">Use your browser's Print function (Ctrl/Cmd+P) and choose "Save as PDF"</p>`);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const handleSaveToAccount = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSavingCv(true);
    try {
      const cvPayload = {
        title,
        description,
        isDefault,
        professionalTitle: cv.personalInfo.title,
        professionalSummary: cv.summary,
        skills: cv.skills.map(s => ({ name: s })),
        experience: cv.experience.map(e => ({
          company: e.company,
          title: e.title,
          location: e.location,
          startDate: e.startDate,
          endDate: e.endDate,
          isCurrent: e.current,
          description: e.achievements.join('\n'),
        })),
        education: cv.education.map(e => ({
          institution: e.institution,
          degree: e.degree,
          field: e.location,
          startDate: e.startDate,
          endDate: e.endDate,
        })),
        parsedData: {
          name: cv.personalInfo.name,
          email: cv.personalInfo.email,
          phone: cv.personalInfo.phone,
          skills: cv.skills,
          summary: cv.summary,
        },
      };
      await cvsApi.create(cvPayload);
      toast.success('CV saved to your account!');
      setSaveModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to save CV');
    } finally {
      setSavingCv(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-10 space-y-6">
      <div className="text-center space-y-2">
        <div className="h-14 w-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-7 w-7 text-success" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Your CV is ready!</h2>
        <p className="text-sm text-muted-foreground">Choose how to save or share your resume</p>
      </div>

      <div className="space-y-3">
        <Button variant="default" className="w-full justify-start gap-3 h-auto py-3.5 px-4" onClick={() => setSaveModalOpen(true)}>
          <div className="h-8 w-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center shrink-0">
            <Save className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">Save to My CVs (with Tag)</p>
            <p className="text-xs opacity-90">Save as a reusable CV for job applications</p>
          </div>
        </Button>

        {[
          { icon: Download, label: 'Download as PDF', desc: 'Opens browser print dialog — save as PDF', action: handlePrint, variant: 'outline' as const },
          { icon: User, label: 'Update Applicant Profile', desc: 'Auto-fill your live profile fields with this CV data', action: onSave, variant: 'outline' as const, loading: saving },
          { icon: Share2, label: 'Copy Share Link', desc: 'Share a link to this builder session', action: handleShare, variant: 'outline' as const },
          { icon: Eye, label: 'Preview CV', desc: 'Go back and review your CV', action: onBack, variant: 'ghost' as const },
        ].map(({ icon: Icon, label, desc, action, variant, loading }) => (
          <Button key={label} variant={variant} className="w-full justify-start gap-3 h-auto py-3.5 px-4" onClick={action} disabled={loading}>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {loading ? <Loader2 className="h-4 w-4 text-primary animate-spin" /> : <Icon className="h-4 w-4 text-primary" />}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </Button>
        ))}
      </div>

      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-semibold">Tag & Save CV to Account</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">CV Title / Role Tag *</label>
                <Input
                  placeholder="e.g. Senior Frontend Engineer CV"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Description (Optional)</label>
                <Input
                  placeholder="e.g. Tailored for React & TypeScript jobs"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={e => setIsDefault(e.target.checked)}
                  className="accent-primary h-4 w-4 rounded"
                />
                Set as Default CV (used by Auto-Apply)
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSaveModalOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveToAccount} disabled={savingCv || !title.trim()}>
                {savingCv && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Save CV
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CV Template Renderer ──────────────────────────────────────────────────────

function CVTemplate({ cv, template }: { cv: CVData; template: Template }) {
  const p = cv.personalInfo;
  const initials = p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'CV';

  if (template === 'modern') return (
    <div className="flex bg-white text-gray-800 min-h-[297mm]" style={{ fontFamily: 'Georgia, serif' }}>
      <div className="w-[33%] bg-violet-700 text-white p-6 space-y-5">
        <div className="text-center">
          <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold mx-auto mb-2">{initials}</div>
          <p className="font-bold text-base">{p.name || 'Your Name'}</p>
          <p className="text-xs opacity-80 mt-0.5">{p.title || 'Professional Title'}</p>
        </div>
        <CVSection color="white" label="Contact">
          {p.email && <CVLine icon="✉" v={p.email} />}
          {p.phone && <CVLine icon="📞" v={p.phone} />}
          {p.location && <CVLine icon="📍" v={p.location} />}
          {p.linkedin && <CVLine icon="in" v="LinkedIn" />}
          {p.github && <CVLine icon="⌨" v="GitHub" />}
          {p.website && <CVLine icon="🌐" v="Portfolio" />}
        </CVSection>
        {cv.skills.length > 0 && (
          <CVSection color="white" label="Skills">
            {cv.skills.map(s => <p key={s} className="text-xs opacity-90 py-0.5">{s}</p>)}
          </CVSection>
        )}
        {cv.certifications.length > 0 && (
          <CVSection color="white" label="Certifications">
            {cv.certifications.map(c => <p key={c} className="text-xs opacity-90 py-0.5">• {c}</p>)}
          </CVSection>
        )}
      </div>
      <div className="flex-1 p-6 space-y-5">
        {cv.summary && <CVSection color="violet" label="Summary"><p className="text-sm text-gray-600 leading-relaxed">{cv.summary}</p></CVSection>}
        {cv.experience.length > 0 && (
          <CVSection color="violet" label="Experience">
            {cv.experience.map(e => (
              <div key={e.id} className="mb-3">
                <p className="text-sm font-semibold">{e.title}</p>
                <p className="text-xs text-gray-500">{e.company}{e.location ? ` · ${e.location}` : ''} | {e.startDate} – {e.current ? 'Present' : e.endDate}</p>
                {e.achievements.filter(Boolean).map((a,i) => <p key={i} className="text-xs text-gray-600 mt-0.5">• {a}</p>)}
              </div>
            ))}
          </CVSection>
        )}
        {cv.education.length > 0 && (
          <CVSection color="violet" label="Education">
            {cv.education.map(e => (
              <div key={e.id} className="mb-2">
                <p className="text-sm font-semibold">{e.degree}</p>
                <p className="text-xs text-gray-500">{e.institution}{e.location ? ` · ${e.location}` : ''} | {e.startDate} – {e.endDate}</p>
                {e.gpa && <p className="text-xs text-gray-500">GPA: {e.gpa}</p>}
              </div>
            ))}
          </CVSection>
        )}
      </div>
    </div>
  );

  if (template === 'classic') return (
    <div className="bg-white text-gray-900 p-8 min-h-[297mm]" style={{ fontFamily: 'Times New Roman, serif' }}>
      <div className="text-center border-b-2 border-gray-900 pb-4 mb-5">
        <h1 className="text-2xl font-bold uppercase tracking-widest">{p.name || 'Your Name'}</h1>
        <p className="text-sm text-gray-600 mt-1">{p.title}</p>
        <div className="flex justify-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
          {p.email && <span>✉ {p.email}</span>}
          {p.phone && <span>📞 {p.phone}</span>}
          {p.location && <span>📍 {p.location}</span>}
          {p.linkedin && <span>in LinkedIn</span>}
        </div>
      </div>
      {cv.summary && <ClassicSection label="PROFESSIONAL SUMMARY"><p className="text-sm text-gray-700 leading-relaxed">{cv.summary}</p></ClassicSection>}
      {cv.experience.length > 0 && (
        <ClassicSection label="EXPERIENCE">
          {cv.experience.map(e => (
            <div key={e.id} className="mb-4">
              <div className="flex justify-between items-baseline">
                <p className="text-sm font-bold">{e.title}</p>
                <p className="text-xs text-gray-500">{e.startDate} – {e.current ? 'Present' : e.endDate}</p>
              </div>
              <p className="text-xs text-gray-500 italic">{e.company}{e.location ? `, ${e.location}` : ''}</p>
              {e.achievements.filter(Boolean).map((a,i) => <p key={i} className="text-sm text-gray-700 mt-0.5 pl-3 before:content-['•'] before:mr-2">• {a}</p>)}
            </div>
          ))}
        </ClassicSection>
      )}
      {cv.education.length > 0 && (
        <ClassicSection label="EDUCATION">
          {cv.education.map(e => (
            <div key={e.id} className="mb-2 flex justify-between items-baseline">
              <div>
                <p className="text-sm font-bold">{e.degree}</p>
                <p className="text-xs text-gray-500">{e.institution}{e.location ? `, ${e.location}` : ''}</p>
              </div>
              <p className="text-xs text-gray-500">{e.startDate} – {e.endDate}</p>
            </div>
          ))}
        </ClassicSection>
      )}
      {cv.skills.length > 0 && (
        <ClassicSection label="SKILLS">
          <p className="text-sm text-gray-700">{cv.skills.join(' · ')}</p>
        </ClassicSection>
      )}
    </div>
  );

  if (template === 'minimal') return (
    <div className="bg-white text-gray-800 p-8 min-h-[297mm]" style={{ fontFamily: 'Helvetica Neue, sans-serif' }}>
      <div className="mb-6">
        <h1 className="text-3xl font-light tracking-tight text-gray-900">{p.name || 'Your Name'}</h1>
        <p className="text-sm text-gray-500 mt-1">{p.title}</p>
        <div className="flex gap-4 mt-2 text-xs text-gray-400 flex-wrap">
          {p.email && <span>{p.email}</span>}
          {p.phone && <span>{p.phone}</span>}
          {p.location && <span>{p.location}</span>}
        </div>
      </div>
      {cv.summary && <><div className="h-px bg-gray-200 mb-4" /><p className="text-sm text-gray-600 leading-relaxed mb-6">{cv.summary}</p></>}
      {cv.experience.length > 0 && (
        <><div className="h-px bg-gray-200 mb-4" />
        <p className="text-[10px] font-semibold tracking-[0.15em] text-gray-400 uppercase mb-3">Experience</p>
        {cv.experience.map(e => (
          <div key={e.id} className="mb-4 grid grid-cols-[1fr_auto] gap-2">
            <div>
              <p className="text-sm font-semibold">{e.title}</p>
              <p className="text-xs text-gray-500">{e.company}{e.location ? `, ${e.location}` : ''}</p>
              {e.achievements.filter(Boolean).map((a,i) => <p key={i} className="text-xs text-gray-600 mt-0.5">— {a}</p>)}
            </div>
            <p className="text-xs text-gray-400 text-right whitespace-nowrap">{e.startDate} – {e.current ? 'Present' : e.endDate}</p>
          </div>
        ))}</>
      )}
      {cv.education.length > 0 && (
        <><div className="h-px bg-gray-200 mb-4 mt-2" />
        <p className="text-[10px] font-semibold tracking-[0.15em] text-gray-400 uppercase mb-3">Education</p>
        {cv.education.map(e => (
          <div key={e.id} className="mb-3 grid grid-cols-[1fr_auto] gap-2">
            <div>
              <p className="text-sm font-semibold">{e.degree}</p>
              <p className="text-xs text-gray-500">{e.institution}</p>
            </div>
            <p className="text-xs text-gray-400 text-right whitespace-nowrap">{e.startDate} – {e.endDate}</p>
          </div>
        ))}</>
      )}
      {cv.skills.length > 0 && (
        <><div className="h-px bg-gray-200 mb-4 mt-2" />
        <p className="text-[10px] font-semibold tracking-[0.15em] text-gray-400 uppercase mb-2">Skills</p>
        <div className="flex flex-wrap gap-1.5">
          {cv.skills.map(s => <span key={s} className="px-2 py-0.5 border border-gray-200 rounded text-xs text-gray-600">{s}</span>)}
        </div></>
      )}
    </div>
  );

  // Creative
  return (
    <div className="bg-white text-gray-800 min-h-[297mm]" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div className="bg-gradient-to-r from-pink-600 to-violet-700 text-white p-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-black">{p.name || 'Your Name'}</h1>
            <p className="text-lg font-light opacity-90 mt-1">{p.title}</p>
          </div>
          <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black">{initials}</div>
        </div>
        <div className="flex gap-5 mt-4 text-xs opacity-80 flex-wrap">
          {p.email && <span>✉ {p.email}</span>}
          {p.phone && <span>📞 {p.phone}</span>}
          {p.location && <span>📍 {p.location}</span>}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-0">
        <div className="p-6 space-y-5 border-r border-gray-100">
          {cv.summary && <div><p className="text-[10px] font-black uppercase tracking-widest text-pink-600 mb-2">About Me</p><p className="text-sm text-gray-600 leading-relaxed">{cv.summary}</p></div>}
          {cv.experience.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-pink-600 mb-3">Experience</p>
              {cv.experience.map(e => (
                <div key={e.id} className="mb-4 pl-3 border-l-2 border-pink-200">
                  <p className="text-sm font-bold">{e.title}</p>
                  <p className="text-xs text-gray-500">{e.company} · {e.startDate} – {e.current ? 'Present' : e.endDate}</p>
                  {e.achievements.filter(Boolean).map((a,i) => <p key={i} className="text-xs text-gray-600 mt-0.5">• {a}</p>)}
                </div>
              ))}
            </div>
          )}
          {cv.education.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-pink-600 mb-3">Education</p>
              {cv.education.map(e => (
                <div key={e.id} className="mb-2 pl-3 border-l-2 border-violet-200">
                  <p className="text-sm font-bold">{e.degree}</p>
                  <p className="text-xs text-gray-500">{e.institution} · {e.startDate} – {e.endDate}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="w-40 p-4 space-y-4 bg-gray-50">
          {cv.skills.length > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-violet-600 mb-2">Skills</p>
              {cv.skills.map(s => <div key={s} className="text-xs text-gray-600 py-0.5">{s}</div>)}
            </div>
          )}
          {cv.certifications.length > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-violet-600 mb-2">Certs</p>
              {cv.certifications.map(c => <div key={c} className="text-xs text-gray-600 py-0.5">• {c}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function CVSection({ label, children, color }: { label: string; children: React.ReactNode; color: 'white' | 'violet' }) {
  return (
    <div>
      <p className={cn('text-[9px] font-bold uppercase tracking-wider mb-1', color === 'white' ? 'opacity-60' : 'text-violet-700 border-b border-violet-200 pb-0.5')}>{label}</p>
      {children}
    </div>
  );
}

function ClassicSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-bold uppercase tracking-wider border-b border-gray-900 pb-0.5 mb-2">{label}</p>
      {children}
    </div>
  );
}

function CVLine({ icon, v }: { icon: string; v: string }) {
  return <p className="text-[10px] opacity-90 flex items-center gap-1">{icon} {v}</p>;
}

function SectionHead({ icon: Icon, label, action }: { icon: React.ElementType; label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      </div>
      {action}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-xs text-muted-foreground py-4 text-center">{label}</p>;
}
