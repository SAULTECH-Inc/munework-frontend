import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2, Plus, Trash2, Check, ChevronRight, ChevronLeft,
  FileText, SlidersHorizontal, Wrench, Bot, X, CheckCircle2, ArrowRight, Users, Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import Checkbox from '@/components/ui/checkbox';
import DatePicker from '@/components/ui/date-picker';
import RichTextEditor from '@/components/ui/rich-text-editor';
import MultiSelect, { type SelectOption } from '@/components/ui/multi-select';
import SearchableSelect from '@/components/ui/searchable-select';
import SearchableSelectWithAdd from '@/components/ui/searchable-select-with-add';
import { SKILLS, COUNTRIES, CURRENCIES, DEPARTMENTS } from '@/lib/profile-data';
import { jobsApi, aiApi } from '@/lib/api';
import type { Job } from '@/types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { FlierImport, type FlierDraft } from './FlierImport';

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestionType = 'short_text' | 'long_text' | 'yes_no' | 'multiple_choice' | 'dropdown';

interface ScreeningQuestion {
  id: string;
  question: string;
  type: QuestionType;
  required: boolean;
  options: string[];
  expectedAnswer: string | string[];
  aiWeight: number;
  scoringCriteria: string;
}

interface AppMethods {
  byCv: boolean;
  byProfile: boolean;
  byPortfolio: boolean;
  byCoverLetter: boolean;
  byVideo: boolean;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(3, 'Job title must be at least 3 characters'),
  description: z.string().min(1, 'Description is required'),
  responsibilities: z.string().optional(),
  requirements: z.string().optional(),
  department: z.string().optional(),
  hiringManager: z.string().optional(),
  location: z.string().min(1, 'Location is required'),
  jobType: z.enum(['full_time', 'part_time', 'contract', 'freelance', 'internship', 'temporary', 'volunteer']),
  workMode: z.enum(['remote', 'hybrid', 'onsite']),
  experienceLevel: z.enum(['intern', 'junior', 'mid', 'senior', 'lead', 'manager', 'executive']).optional(),
  experienceYears: z.coerce.number().min(0).optional(),
  applicationDeadline: z.string().optional(),
  salaryMin: z.coerce.number().optional(),
  salaryMax: z.coerce.number().optional(),
  salaryCurrency: z.string().default('USD'),
  salaryFrequency: z.string().default('yearly'),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  aiAutoScreen: z.boolean().default(false),
  aiMatchThreshold: z.coerce.number().min(0).max(1).default(0.6),
  aiAutoAccept: z.boolean().default(false),
  aiStrictSkillMatch: z.boolean().default(false),
  aiAutoReject: z.boolean().default(false),
  aiAutoRejectThreshold: z.coerce.number().min(0).max(1).default(0.3),
  aiSendRejectionEmail: z.boolean().default(true),
  aiCheckEmploymentGaps: z.boolean().default(false),
  aiAnalyzeCareerProgression: z.boolean().default(false),
});
type FormData = z.infer<typeof schema>;

// ─── Constants ────────────────────────────────────────────────────────────────

const SKILL_OPTIONS: SelectOption[] = SKILLS.map(s => ({ label: s, value: s }));
const COUNTRY_OPTIONS: SelectOption[] = COUNTRIES.map(c => ({ label: c, value: c }));
const DEPT_OPTIONS: SelectOption[] = DEPARTMENTS.map(d => ({ label: d, value: d }));

const QUALIFICATION_OPTIONS: SelectOption[] = [
  { label: 'BSc (Bachelor of Science)', value: 'BSC' },
  { label: 'BEng (Bachelor of Engineering)', value: 'BENG' },
  { label: 'BA (Bachelor of Arts)', value: 'BA' },
  { label: 'MSc (Master of Science)', value: 'MSC' },
  { label: 'PhD (Doctor of Philosophy)', value: 'PHD' },
  { label: 'HND (Higher National Diploma)', value: 'HND' },
  { label: 'OND (Ordinary National Diploma)', value: 'OND' },
  { label: 'MBA (Master of Business Administration)', value: 'MBA' },
  { label: 'LL.B (Bachelor of Laws)', value: 'LLB' },
];

const GRADE_OPTIONS: SelectOption[] = [
  { label: 'First Class Honors (1st Class)', value: 'First Class' },
  { label: 'Second Class Upper (2.1)', value: '2.1' },
  { label: 'Second Class Lower (2.2)', value: '2.2' },
  { label: 'Third Class (3rd Class)', value: 'Third Class' },
  { label: 'Distinction', value: 'Distinction' },
  { label: 'Merit', value: 'Merit' },
  { label: 'Pass', value: 'Pass' },
];

const STEPS = [
  { id: 1, label: 'Content', icon: FileText },
  { id: 2, label: 'Details', icon: SlidersHorizontal },
  { id: 3, label: 'Skills', icon: Wrench },
  { id: 4, label: 'AI Setup', icon: Bot },
];

const APP_METHODS: { id: keyof AppMethods; label: string; desc: string }[] = [
  { id: 'byCv', label: 'Apply With CV', desc: 'Allow candidates to submit a resume' },
  { id: 'byProfile', label: 'Apply With Profile', desc: 'Use Mune Work applicant profile' },
  { id: 'byPortfolio', label: 'Apply With Portfolio', desc: 'Request work samples' },
  { id: 'byCoverLetter', label: 'Apply With Cover Letter', desc: 'Require a cover letter' },
  { id: 'byVideo', label: 'Apply With Video', desc: 'Request video introduction' },
];

const DEFAULT_APP_METHODS: AppMethods = {
  byCv: true, byProfile: false, byPortfolio: false, byCoverLetter: false, byVideo: false,
};

function isRteEmpty(html: string): boolean {
  if (!html) return true;
  const stripped = html.replace(/<[^>]*>/g, '').trim();
  return stripped === '' || html === '<p><br></p>' || html === '<p></p>';
}

function newQuestion(): ScreeningQuestion {
  return {
    id: Date.now().toString(),
    question: '',
    type: 'short_text',
    required: true,
    options: [],
    expectedAnswer: '',
    aiWeight: 5,
    scoringCriteria: '',
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  editJob?: Job;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PostJobModal({ open, onClose, editJob }: Props) {
  const qc = useQueryClient();
  const isEdit = !!editJob;

  const [step, setStep] = useState(1);
  const [contentTab, setContentTab] = useState<'description' | 'responsibilities' | 'requirements'>('description');
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [salaryMode, setSalaryMode] = useState<'exact' | 'range' | 'hidden'>('hidden');
  const [skillItems, setSkillItems] = useState<SelectOption[]>([]);
  const [criticalSkills, setCriticalSkills] = useState<SelectOption[]>([]);
  const [preferredCountries, setPreferredCountries] = useState<SelectOption[]>([]);
  const [preferredUniversities, setPreferredUniversities] = useState<SelectOption[]>([]);
  const [preferredQualifications, setPreferredQualifications] = useState<SelectOption[]>([]);
  const [preferredGrades, setPreferredGrades] = useState<SelectOption[]>([]);
  const [appMethods, setAppMethods] = useState<AppMethods>(DEFAULT_APP_METHODS);
  const [screeningQuestions, setScreeningQuestions] = useState<ScreeningQuestion[]>([]);
  const [stepError, setStepError] = useState('');
  const [postedJob, setPostedJob] = useState<{ id: string; title: string } | null>(null);

  const navigate = useNavigate();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      jobType: 'full_time',
      workMode: 'onsite',
      salaryCurrency: 'USD',
      salaryFrequency: 'yearly',
      aiAutoScreen: false,
      aiMatchThreshold: 0.6,
      aiAutoAccept: false,
      aiStrictSkillMatch: false,
      aiAutoReject: false,
      aiAutoRejectThreshold: 0.3,
      aiSendRejectionEmail: true,
      aiCheckEmploymentGaps: false,
      aiAnalyzeCareerProgression: false,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editJob) {
      reset({
        title: editJob.title,
        description: editJob.description ?? '',
        responsibilities: (editJob as any).responsibilities ?? '',
        requirements: (editJob as any).requirements ?? '',
        department: (editJob as any).department ?? '',
        hiringManager: (editJob as any).hiringManager ?? '',
        location: editJob.location,
        jobType: editJob.jobType as any,
        workMode: (editJob.employmentType ?? (editJob as any).workMode) as any,
        experienceLevel: (editJob.level ?? (editJob as any).experienceLevel) as any,
        experienceYears: editJob.experienceYears ?? undefined,
        applicationDeadline: editJob.endDate ?? (editJob as any).applicationDeadline ?? '',
        salaryMin: editJob.salaryRange?.min,
        salaryMax: editJob.salaryRange?.max,
        salaryCurrency: editJob.salaryRange?.currency ?? 'USD',
        salaryFrequency: editJob.salaryRange?.frequency ?? 'yearly',
        priority: (editJob as any).priority ?? undefined,
        aiAutoScreen: editJob.aiSettings?.autoScreen ?? false,
        aiMatchThreshold: editJob.aiSettings?.matchThreshold ?? 0.6,
        aiAutoAccept: (editJob.aiSettings as any)?.autoAccept ?? false,
        aiStrictSkillMatch: (editJob.aiSettings as any)?.strictSkillMatch ?? false,
        aiAutoReject: (editJob.aiSettings as any)?.autoReject ?? false,
        aiAutoRejectThreshold: (editJob.aiSettings as any)?.autoRejectThreshold ?? 0.3,
        aiSendRejectionEmail: (editJob.aiSettings as any)?.sendRejectionEmail ?? true,
        aiCheckEmploymentGaps: (editJob.aiSettings as any)?.checkEmploymentGaps ?? false,
        aiAnalyzeCareerProgression: (editJob.aiSettings as any)?.analyzeCareerProgression ?? false,
      });
      setSkillItems((editJob.skillSet ?? (editJob as any).skills ?? []).map((s: string) => ({ label: s, value: s })));
      setCriticalSkills((editJob.aiSettings as any)?.criticalSkills?.map((s: string) => ({ label: s, value: s })) ?? []);
      setPreferredCountries((editJob as any).preferredCandidateCountry?.map((c: string) => ({ label: c, value: c })) ?? []);
      setPreferredUniversities((editJob as any).preferredCandidateUniversity?.map((u: string) => ({ label: u, value: u })) ?? []);
      setPreferredQualifications((editJob as any).preferredCandidateQualification?.map((q: string) => ({ label: q, value: q })) ?? []);
      setPreferredGrades((editJob as any).preferredCandidateGrade?.map((g: string) => ({ label: g, value: g })) ?? []);
      setAppMethods((editJob as any).applicationMethod ?? DEFAULT_APP_METHODS);
      setScreeningQuestions(editJob.screeningQuestions?.map((q: any) => ({
        id: q.id ?? Date.now().toString(),
        question: q.question,
        type: q.type ?? 'short_text',
        required: q.required ?? true,
        options: q.options ?? [],
        expectedAnswer: q.expectedAnswer ?? '',
        aiWeight: q.aiWeight ?? 5,
        scoringCriteria: q.scoringCriteria ?? '',
      })) ?? []);
      const min = editJob.salaryRange?.min;
      const max = editJob.salaryRange?.max;
      setSalaryMode(min != null && max != null ? (min === max || min === 0 ? 'exact' : 'range') : 'hidden');
    } else {
      reset();
      setStep(1);
      setContentTab('description');
      setSalaryMode('hidden');
      setSkillItems([]);
      setCriticalSkills([]);
      setPreferredCountries([]);
      setPreferredUniversities([]);
      setPreferredQualifications([]);
      setPreferredGrades([]);
      setAppMethods(DEFAULT_APP_METHODS);
      setScreeningQuestions([]);
      setStepError('');
      setPostedJob(null);
    }
  }, [open, editJob]);

  // ─── Step validation ────────────────────────────────────────────────────────

  const validateStep = (): boolean => {
    setStepError('');
    if (step === 1) {
      const title = watch('title') ?? '';
      if (title.trim().length < 3) { setStepError('Job title must be at least 3 characters'); return false; }
      const desc = watch('description') ?? '';
      if (isRteEmpty(desc)) { setStepError('Job description is required'); return false; }
    }
    if (step === 2) {
      const loc = watch('location') ?? '';
      if (!loc.trim()) { setStepError('Location is required'); return false; }
    }
    if (step === 3) {
      if (skillItems.length === 0) { setStepError('Please add at least one required skill'); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) setStep(s => s + 1);
  };

  // ─── AI Job Description ──────────────────────────────────────────────────────

  async function handleGenerateDescription() {
    const title = watch('title');
    if (!title) { toast.error('Enter a job title first'); return; }
    setGeneratingDesc(true);
    try {
      const { data } = await aiApi.generateJobDescription({
        title,
        department: watch('department' as any),
        level: watch('experienceLevel' as any),
        employmentType: watch('workMode' as any),
        skills: skillItems.map(s => s.value),
      });
      const result = data?.data?.result ?? data?.result ?? {};
      if (result.description) setValue('description' as any, result.description);
      if (result.responsibility) setValue('responsibilities' as any, result.responsibility);
      if (result.requirements) setValue('requirements' as any, result.requirements);
      if (result.suggestedSkills?.length) {
        const newSkills = (result.suggestedSkills as string[])
          .filter((s: string) => !skillItems.some(si => si.value === s))
          .map((s: string) => ({ label: s, value: s }));
        if (newSkills.length) setSkillItems(prev => [...prev, ...newSkills]);
      }
      toast.success('Job description generated! Review and edit as needed.');
    } catch {
      toast.error('AI generation failed. Check your API key configuration.');
    } finally {
      setGeneratingDesc(false);
    }
  }

  // ─── Flier import ───────────────────────────────────────────────────────────

  /**
   * Writes an extracted draft into the form. Only fields the flier actually
   * mentioned are touched, so an employer who has already typed something does
   * not lose it to a null.
   */
  function applyFlierDraft(draft: FlierDraft): number {
    let filled = 0;
    const set = (field: string, value: unknown) => {
      if (value === null || value === undefined || value === '') return;
      setValue(field as any, value as any, { shouldValidate: true });
      filled++;
    };

    set('title', draft.title);
    set('description', draft.description);
    set('responsibilities', draft.responsibilities);
    set('requirements', draft.requirements);
    set('department', draft.department);
    set('location', draft.location);
    set('jobType', draft.jobType);
    set('workMode', draft.workMode);
    set('experienceLevel', draft.experienceLevel);
    set('experienceYears', draft.experienceYears);
    set('applicationDeadline', draft.applicationDeadline);

    if (draft.salaryMin || draft.salaryMax) {
      set('salaryMin', draft.salaryMin);
      set('salaryMax', draft.salaryMax);
      set('salaryCurrency', draft.salaryCurrency);
      set('salaryFrequency', draft.salaryFrequency);
      setSalaryMode(draft.salaryMin && draft.salaryMax ? 'range' : 'exact');
    }

    if (draft.skills?.length) {
      const fresh = draft.skills
        .filter((skill) => !skillItems.some((s) => s.value.toLowerCase() === skill.toLowerCase()))
        .map((skill) => ({ label: skill, value: skill }));
      if (fresh.length) {
        setSkillItems((prev) => [...prev, ...fresh]);
        filled++;
      }
    }

    return filled;
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const save = useMutation({
    mutationFn: (data: FormData) => {
      const payload: any = {
        title: data.title,
        description: data.description,
        responsibilities: data.responsibilities,
        requirements: data.requirements,
        department: data.department,
        hiringManager: data.hiringManager,
        location: data.location,
        jobType: data.jobType,
        workMode: data.workMode,
        experienceLevel: data.experienceLevel,
        experienceYears: data.experienceYears,
        applicationDeadline: data.applicationDeadline,
        priority: data.priority,
        skills: skillItems.map(s => s.value),
        preferredCandidateCountry: preferredCountries.map(c => c.value),
        preferredCandidateUniversity: preferredUniversities.map(u => u.value),
        preferredCandidateQualification: preferredQualifications.map(q => q.value),
        preferredCandidateGrade: preferredGrades.map(g => g.value),
        applicationMethod: appMethods,
        salaryRange: salaryMode !== 'hidden' ? {
          min: salaryMode === 'exact' ? (data.salaryMax ?? 0) : (data.salaryMin ?? 0),
          max: data.salaryMax ?? 0,
          currency: data.salaryCurrency,
          frequency: data.salaryFrequency,
        } : undefined,
        aiSettings: {
          autoScreen: data.aiAutoScreen,
          matchThreshold: data.aiMatchThreshold,
          autoAccept: data.aiAutoAccept,
          strictSkillMatch: data.aiStrictSkillMatch,
          criticalSkills: criticalSkills.map(s => s.value),
          autoReject: data.aiAutoReject,
          autoRejectThreshold: data.aiAutoRejectThreshold,
          sendRejectionEmail: data.aiSendRejectionEmail,
          checkEmploymentGaps: data.aiCheckEmploymentGaps,
          analyzeCareerProgression: data.aiAnalyzeCareerProgression,
        },
        screeningQuestions: screeningQuestions.map(q => ({
          question: q.question,
          type: q.type,
          required: q.required,
          options: q.options.filter(Boolean),
          expectedAnswer: q.expectedAnswer,
          aiWeight: q.aiWeight,
          scoringCriteria: q.scoringCriteria,
        })),
      };
      return isEdit ? jobsApi.updateJob(editJob!.id, payload) : jobsApi.postJob(payload);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['employer-jobs'] });
      qc.invalidateQueries({ queryKey: ['employer-jobs-all'] });
      if (isEdit) {
        toast.success('Job updated successfully!');
        onClose();
      } else {
        const job = res?.data?.data ?? res?.data;
        setPostedJob({ id: job?.id ?? '', title: job?.title ?? watch('title') });
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to save job'),
  });

  // ─── Screening question helpers ─────────────────────────────────────────────

  const updateQuestion = (i: number, patch: Partial<ScreeningQuestion>) => {
    setScreeningQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  };
  const removeQuestion = (i: number) => setScreeningQuestions(prev => prev.filter((_, idx) => idx !== i));

  // ─── Success screen ─────────────────────────────────────────────────────────

  if (postedJob) {
    return (
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center text-center py-8 gap-5">
            {/* Animated check */}
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-success/15 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-primary-foreground" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-foreground">Job Posted Successfully! 🎉</h2>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                <strong className="text-foreground">{postedJob.title}</strong> is now live. Qualified candidates can start applying immediately.
              </p>
            </div>

            <div className="w-full space-y-2.5 pt-2">
              <Button
                className="w-full gap-2"
                onClick={() => { onClose(); navigate('/employer/jobs'); }}
              >
                <Users className="h-4 w-4" />
                Manage Candidates
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => { setPostedJob(null); setStep(1); reset(); }}
              >
                <FileText className="h-4 w-4" />
                Post Another Job
              </Button>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-0">
          <DialogTitle>{isEdit ? 'Edit Job' : 'Post a New Job'}</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center px-6 py-3 border-b border-border">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2 shrink-0">
                <div className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                  step === s.id ? 'bg-primary text-primary-foreground' :
                  step > s.id ? 'bg-primary/20 text-primary' :
                  'bg-surface-raised text-muted-foreground',
                )}>
                  {step > s.id ? <Check className="h-3.5 w-3.5" /> : s.id}
                </div>
                <span className={cn(
                  'text-xs font-medium hidden sm:block',
                  step === s.id ? 'text-foreground' : 'text-muted-foreground',
                )}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('flex-1 h-px mx-3', step > s.id ? 'bg-primary/40' : 'bg-border')} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(d => save.mutate(d))} className="flex-1 overflow-hidden flex flex-col min-h-0">
          <DialogBody className="overflow-y-auto flex-1">

            {/* ── Step 1: Job Content ── */}
            {step === 1 && (
              <div className="space-y-4">
                {!editJob && <FlierImport onExtracted={applyFlierDraft} />}

                <Field label="Job title" error={errors.title?.message} required>
                  <Input placeholder="e.g. Senior Software Engineer" {...register('title')} />
                </Field>

                {/* Content sub-tabs */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex rounded-lg bg-surface-raised p-1 gap-1 flex-1">
                    {(['description', 'responsibilities', 'requirements'] as const).map(tab => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setContentTab(tab)}
                        className={cn(
                          'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors capitalize',
                          contentTab === tab
                            ? 'bg-surface text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {tab === 'description' ? 'Description *' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1 shrink-0 border-primary/40 text-primary hover:bg-primary/5"
                      onClick={handleGenerateDescription}
                      disabled={generatingDesc}
                    >
                      {generatingDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
                      {generatingDesc ? 'Generating…' : 'AI Write'}
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {contentTab === 'description' && 'Describe the role and what the candidate will be doing day-to-day.'}
                      {contentTab === 'responsibilities' && 'List the key responsibilities and duties of this role.'}
                      {contentTab === 'requirements' && 'Specify required qualifications, skills and experience.'}
                    </p>
                    <RichTextEditor
                      key={contentTab}
                      value={watch(contentTab) ?? ''}
                      onChange={v => setValue(contentTab, v)}
                      placeholder={
                        contentTab === 'description'
                          ? 'Describe the role, team, and goals…'
                          : contentTab === 'responsibilities'
                          ? 'E.g. Lead engineering sprints, review PRs, mentor junior engineers…'
                          : 'E.g. 3+ years of React experience, strong communication skills…'
                      }
                      minHeight={180}
                    />
                    {contentTab === 'description' && errors.description && (
                      <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Job Details ── */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Department">
                    <SearchableSelectWithAdd
                      options={DEPT_OPTIONS}
                      value={watch('department')}
                      onChange={opt => setValue('department', opt.value)}
                      onAddOption={opt => setValue('department', opt.value)}
                      placeholder="Select or add department…"
                    />
                  </Field>
                  <Field label="Hiring manager">
                    <Input placeholder="Full name" {...register('hiringManager')} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Location" error={errors.location?.message} required>
                    <Input placeholder="e.g. Lagos, Nigeria" {...register('location')} />
                  </Field>
                  <Field label="Application deadline">
                    <DatePicker
                      selectedDate={watch('applicationDeadline') ? new Date(watch('applicationDeadline') as string) : null}
                      onDateChange={d => setValue('applicationDeadline', d ? d.toISOString().slice(0, 10) : '')}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Field label="Job type">
                    <select {...register('jobType')} className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-1 focus:ring-primary/50">
                      <option value="full_time">Full-time</option>
                      <option value="part_time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="freelance">Freelance</option>
                      <option value="internship">Internship</option>
                      <option value="temporary">Temporary</option>
                      <option value="volunteer">Volunteer</option>
                    </select>
                  </Field>
                  <Field label="Work mode">
                    <select {...register('workMode')} className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-1 focus:ring-primary/50">
                      <option value="onsite">On-site</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </Field>
                  <Field label="Priority">
                    <select {...register('priority')} className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-1 focus:ring-primary/50">
                      <option value="">No priority</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Years of experience">
                    <Input type="number" min="0" max="50" placeholder="e.g. 3" {...register('experienceYears')} />
                  </Field>
                  <Field label="Experience level">
                    <select {...register('experienceLevel')} className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-1 focus:ring-primary/50">
                      <option value="">Any level</option>
                      {['intern', 'junior', 'mid', 'senior', 'lead', 'manager', 'executive'].map(l => (
                        <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {/* Salary */}
                <div className="rounded-xl border border-border bg-surface-raised p-4 space-y-4">
                  <p className="text-xs font-semibold text-foreground">Salary / Compensation</p>
                  <div className="flex gap-4">
                    {(['exact', 'range', 'hidden'] as const).map(mode => (
                      <label key={mode} className="flex items-center gap-2 cursor-pointer">
                        <div
                          onClick={() => setSalaryMode(mode)}
                          className={cn(
                            'h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer',
                            salaryMode === mode ? 'border-primary' : 'border-border',
                          )}
                        >
                          {salaryMode === mode && <div className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                        <span className="text-xs text-foreground">
                          {mode === 'exact' ? 'Exact amount' : mode === 'range' ? 'Salary range' : 'Prefer not to say'}
                        </span>
                      </label>
                    ))}
                  </div>

                  {salaryMode === 'exact' && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Amount">
                        <Input type="number" min="0" placeholder="Enter amount" {...register('salaryMax')} />
                      </Field>
                      <Field label="Currency">
                        <SearchableSelect
                          options={CURRENCIES}
                          value={watch('salaryCurrency')}
                          onChange={opt => setValue('salaryCurrency', opt.value)}
                          placeholder="Currency"
                        />
                      </Field>
                    </div>
                  )}

                  {salaryMode === 'range' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <Field label="Minimum">
                          <Input type="number" min="0" placeholder="Min" {...register('salaryMin')} />
                        </Field>
                        <Field label="Maximum">
                          <Input type="number" min="0" placeholder="Max" {...register('salaryMax')} />
                        </Field>
                        <Field label="Currency">
                          <SearchableSelect
                            options={CURRENCIES}
                            value={watch('salaryCurrency')}
                            onChange={opt => setValue('salaryCurrency', opt.value)}
                            placeholder="Currency"
                          />
                        </Field>
                      </div>
                      <Field label="Pay frequency">
                        <select {...register('salaryFrequency')} className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-1 focus:ring-primary/50">
                          <option value="hourly">Per hour</option>
                          <option value="daily">Per day</option>
                          <option value="weekly">Per week</option>
                          <option value="monthly">Per month</option>
                          <option value="yearly">Per year</option>
                        </select>
                      </Field>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 3: Skills & Preferences ── */}
            {step === 3 && (
              <div className="space-y-6">
                <Field label="Required skills" required>
                  <MultiSelect
                    options={SKILL_OPTIONS}
                    selected={skillItems}
                    onChange={setSkillItems}
                    placeholder="Search and add required skills…"
                  />
                </Field>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-3">Application methods</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {APP_METHODS.map(method => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setAppMethods(prev => ({ ...prev, [method.id]: !prev[method.id] }))}
                        className={cn(
                          'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors',
                          appMethods[method.id]
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-surface hover:border-border/70',
                        )}
                      >
                        <Checkbox
                          checked={appMethods[method.id]}
                          onChange={checked => setAppMethods(prev => ({ ...prev, [method.id]: checked }))}
                          size={16}
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground leading-none mb-1">{method.label}</p>
                          <p className="text-xs text-muted-foreground">{method.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <Field label="Most preferred candidate countries (optional)">
                  <MultiSelect
                    options={COUNTRY_OPTIONS}
                    selected={preferredCountries}
                    onChange={setPreferredCountries}
                    placeholder="Search and add preferred countries…"
                  />
                </Field>

                <Field label="Most preferred universities / institutions (optional)">
                  <MultiSelect
                    options={[]}
                    selected={preferredUniversities}
                    onChange={setPreferredUniversities}
                    placeholder="Type or add target universities (e.g. Oxford, MIT, Covenant, Unilag)…"
                  />
                </Field>

                <Field label="Most preferred academic qualifications (optional)">
                  <MultiSelect
                    options={QUALIFICATION_OPTIONS}
                    selected={preferredQualifications}
                    onChange={setPreferredQualifications}
                    placeholder="Select target degrees (e.g. BSC, BENG, BA, MSC, PHD)…"
                  />
                </Field>

                <Field label="Most preferred school grade / degree class (optional)">
                  <MultiSelect
                    options={GRADE_OPTIONS}
                    selected={preferredGrades}
                    onChange={setPreferredGrades}
                    placeholder="Select minimum/preferred grades (e.g. First Class, 2.1, Distinction)…"
                  />
                </Field>
              </div>
            )}

            {/* ── Step 4: AI Screening & Questions ── */}
            {step === 4 && (
              <div className="space-y-6">
                {/* AI settings card */}
                <div className="rounded-xl border border-border bg-surface-raised p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">AI Auto-screening</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Automatically analyse and score candidate applications</p>
                    </div>
                    <Switch
                      checked={!!watch('aiAutoScreen')}
                      onCheckedChange={v => setValue('aiAutoScreen', v)}
                    />
                  </div>

                  {watch('aiAutoScreen') && (
                    <div className="space-y-4 border-t border-border pt-4">
                      {/* Match threshold */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-foreground">Minimum match threshold</p>
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {Math.round(watch('aiMatchThreshold') * 100)}%
                          </span>
                        </div>
                        <input
                          type="range" min="0.3" max="0.95" step="0.05"
                          {...register('aiMatchThreshold')}
                          className="w-full accent-primary"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Only surface candidates above this threshold</p>
                      </div>

                      {/* Auto-accept */}
                      <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
                        <div>
                          <p className="text-xs font-medium text-foreground">Auto-accept high matches</p>
                          <p className="text-xs text-muted-foreground">Move 90%+ matches to interview stage automatically</p>
                        </div>
                        <Switch checked={!!watch('aiAutoAccept')} onCheckedChange={v => setValue('aiAutoAccept', v)} />
                      </div>

                      {/* Strict skill matching */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
                          <div>
                            <p className="text-xs font-medium text-foreground">Strict skill matching</p>
                            <p className="text-xs text-muted-foreground">Require ALL critical skills to be present</p>
                          </div>
                          <Switch checked={!!watch('aiStrictSkillMatch')} onCheckedChange={v => setValue('aiStrictSkillMatch', v)} />
                        </div>
                        {watch('aiStrictSkillMatch') && (
                          <Field label="Critical skills (must-have)">
                            <MultiSelect
                              options={SKILL_OPTIONS}
                              selected={criticalSkills}
                              onChange={setCriticalSkills}
                              placeholder="Add must-have skills…"
                            />
                          </Field>
                        )}
                      </div>

                      {/* Auto-reject */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
                          <div>
                            <p className="text-xs font-medium text-foreground">Auto-reject low matches</p>
                            <p className="text-xs text-muted-foreground">Automatically reject candidates below threshold</p>
                          </div>
                          <Switch checked={!!watch('aiAutoReject')} onCheckedChange={v => setValue('aiAutoReject', v)} />
                        </div>
                        {watch('aiAutoReject') && (
                          <div className="space-y-3 pl-3 border-l-2 border-destructive/30">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-medium text-foreground">Reject threshold</p>
                                <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded">
                                  {Math.round(watch('aiAutoRejectThreshold') * 100)}%
                                </span>
                              </div>
                              <input
                                type="range" min="0.1" max="0.5" step="0.05"
                                {...register('aiAutoRejectThreshold')}
                                className="w-full accent-destructive"
                              />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
                              <p className="text-xs font-medium text-foreground">Send rejection email to candidates</p>
                              <Switch checked={!!watch('aiSendRejectionEmail')} onCheckedChange={v => setValue('aiSendRejectionEmail', v)} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Resume analysis */}
                      <div>
                        <p className="text-xs font-medium text-foreground mb-2">Resume analysis features</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            { key: 'aiCheckEmploymentGaps' as const, label: 'Check employment gaps' },
                            { key: 'aiAnalyzeCareerProgression' as const, label: 'Analyse career progression' },
                          ].map(({ key, label }) => (
                            <label key={key} className="flex items-center gap-2.5 rounded-lg bg-surface border border-border p-3 cursor-pointer">
                              <Checkbox
                                checked={!!watch(key)}
                                onChange={checked => setValue(key, checked)}
                                size={16}
                              />
                              <span className="text-xs text-foreground">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Screening questions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Screening questions</p>
                      <p className="text-xs text-muted-foreground">Ask candidates specific questions when they apply</p>
                    </div>
                    <Button
                      type="button" variant="outline" size="sm"
                      onClick={() => setScreeningQuestions(prev => [...prev, newQuestion()])}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add question
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {screeningQuestions.map((q, i) => (
                      <ScreeningQuestionCard
                        key={q.id}
                        question={q}
                        index={i}
                        onUpdate={patch => updateQuestion(i, patch)}
                        onRemove={() => removeQuestion(i)}
                        skillOptions={SKILL_OPTIONS}
                      />
                    ))}
                    {screeningQuestions.length === 0 && (
                      <div className="rounded-xl border border-dashed border-border py-10 text-center">
                        <p className="text-sm text-muted-foreground">No screening questions yet</p>
                        <button
                          type="button"
                          onClick={() => setScreeningQuestions(prev => [...prev, newQuestion()])}
                          className="mt-2 text-xs text-primary hover:underline"
                        >
                          Add your first question
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </DialogBody>

          <DialogFooter className="flex-col gap-2">
            {stepError && <p className="text-xs text-destructive w-full text-center">{stepError}</p>}
            <div className="flex items-center justify-between w-full gap-2">
              <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
              <div className="flex gap-2">
                {step > 1 && (
                  <Button variant="ghost" type="button" onClick={() => { setStepError(''); setStep(s => s - 1); }}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                )}
                {step < 4 ? (
                  <Button type="button" onClick={handleNext}>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={save.isPending}>
                    {save.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                    {isEdit ? 'Save changes' : 'Publish job'}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Screening question card ──────────────────────────────────────────────────

function ScreeningQuestionCard({
  question, index, onUpdate, onRemove, skillOptions,
}: {
  question: ScreeningQuestion;
  index: number;
  onUpdate: (patch: Partial<ScreeningQuestion>) => void;
  onRemove: () => void;
  skillOptions: SelectOption[];
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">Question {index + 1}</p>
        <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <textarea
        value={question.question}
        onChange={e => onUpdate({ question: e.target.value })}
        placeholder="Enter your screening question…"
        rows={2}
        className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
      />

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Answer type</label>
          <select
            value={question.type}
            onChange={e => onUpdate({
              type: e.target.value as QuestionType,
              options: ['multiple_choice', 'dropdown'].includes(e.target.value) ? ['', ''] : [],
              expectedAnswer: '',
            })}
            className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-xs outline-none focus:ring-1 focus:ring-primary/50"
          >
            <option value="short_text">Short text</option>
            <option value="long_text">Long text</option>
            <option value="yes_no">Yes / No</option>
            <option value="multiple_choice">Multiple choice</option>
            <option value="dropdown">Dropdown</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">AI weight (1–10)</label>
          <input
            type="number" min="1" max="10"
            value={question.aiWeight}
            onChange={e => onUpdate({ aiWeight: parseInt(e.target.value) || 5 })}
            className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-xs outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={question.required}
              onChange={checked => onUpdate({ required: checked })}
              size={15}
            />
            <span className="text-xs text-foreground">Required</span>
          </label>
        </div>
      </div>

      {/* Yes/No expected answer */}
      {question.type === 'yes_no' && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Expected answer</p>
          <div className="flex gap-4">
            {['yes', 'no'].map(v => (
              <label key={v} className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => onUpdate({ expectedAnswer: v })}
                  className={cn(
                    'h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer',
                    question.expectedAnswer === v ? 'border-primary' : 'border-border',
                  )}
                >
                  {question.expectedAnswer === v && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <span className="text-xs text-foreground capitalize">{v}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Multiple choice / dropdown options */}
      {(question.type === 'multiple_choice' || question.type === 'dropdown') && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Answer options</p>
          {question.options.map((opt, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <input
                type="text"
                value={opt}
                onChange={e => {
                  const opts = [...question.options];
                  opts[oi] = e.target.value;
                  onUpdate({ options: opts });
                }}
                placeholder={`Option ${oi + 1}`}
                className="flex-1 h-8 px-3 rounded-lg border border-border bg-surface text-xs outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button
                type="button"
                onClick={() => onUpdate({ options: question.options.filter((_, i) => i !== oi) })}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onUpdate({ options: [...question.options, ''] })}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="h-3 w-3" /> Add option
          </button>
        </div>
      )}

      {/* Text answer scoring criteria */}
      {(question.type === 'short_text' || question.type === 'long_text') && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Expected keywords / scoring guidance (optional)</label>
          <input
            type="text"
            value={typeof question.expectedAnswer === 'string' ? question.expectedAnswer : ''}
            onChange={e => onUpdate({ expectedAnswer: e.target.value })}
            placeholder="e.g. React, 5+ years, leadership (comma-separated)"
            className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-xs outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      )}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label, error, required, children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
