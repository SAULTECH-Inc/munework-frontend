import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle2, FileText, Sparkles, Video, Upload, AlertCircle } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import RichTextEditor from '@/components/ui/rich-text-editor';
import { cvsApi, jobsApi, aiApi, coverLettersApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Job, CV } from '@/types';
import toast from 'react-hot-toast';

const schema = z.object({
  cvId: z.string().min(1, 'Select a CV'),
  coverLetter: z.string().optional(),
  coverLetterId: z.string().optional(),
  screeningAnswers: z.record(z.union([z.string(), z.array(z.string())])).optional(),
});
type FormData = z.infer<typeof schema>;

interface Props { job: Job; open: boolean; onClose: () => void; }

export function QuickApplyModal({ job, open, onClose }: Props) {
  const qc = useQueryClient();
  const [applied, setApplied] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);

  // Safety net for every entry point: an external job has no in-app
  // application, so if this modal is opened for one, redirect and close rather
  // than showing an apply form that would submit nothing.
  useEffect(() => {
    if (open && job.applicationMethod?.external && job.applicationMethod.externalUrl) {
      window.open(job.applicationMethod.externalUrl, '_blank', 'noopener,noreferrer');
      onClose();
    }
  }, [open, job, onClose]);

  // Video application state
  const requiresVideo = !!job.applicationMethod?.byVideo;
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploaded, setVideoUploaded] = useState(false);
  const [useExistingVideoCv, setUseExistingVideoCv] = useState(false);

  const { data: cvs, isLoading: cvsLoading } = useQuery<CV[]>({
    queryKey: ['my-cvs'],
    queryFn: () => cvsApi.list().then(r => r.data.data ?? r.data),
    enabled: open,
  });

  const { data: coverLetters } = useQuery<any[]>({
    queryKey: ['my-cover-letters'],
    queryFn: () => coverLettersApi.list().then(r => r.data.data ?? r.data),
    enabled: open,
  });

  const existingVideoCv = cvs?.find(c => c.videoCv)?.videoCv;

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { cvId: '', screeningAnswers: {}, coverLetterId: '' },
  });

  // Auto-select default CV when CVs load
  useEffect(() => {
    if (cvs?.length) {
      const def = cvs.find(c => c.isDefault) ?? cvs[0];
      setValue('cvId', def.id);
    }
  }, [cvs, setValue]);

  // Auto-select default Cover Letter when loaded
  useEffect(() => {
    if (coverLetters?.length) {
      const defCl = coverLetters.find((c: any) => c.isDefault) ?? coverLetters[0];
      if (defCl?.content && !watch('coverLetter')) {
        setValue('coverLetter', defCl.content);
      }
    }
  }, [coverLetters, setValue, watch]);

  // Reset video state when modal closes
  useEffect(() => {
    if (!open) {
      setVideoFile(null);
      setVideoPreviewUrl(null);
      setVideoUploaded(false);
      setUseExistingVideoCv(false);
    }
  }, [open]);

  const selectedCvId = watch('cvId');

  // Video dropzone
  const onDropVideo = useCallback((accepted: File[]) => {
    if (!accepted.length) return;
    const f = accepted[0];
    setVideoFile(f);
    setVideoUploaded(false);
    setUseExistingVideoCv(false);
    const url = URL.createObjectURL(f);
    setVideoPreviewUrl(url);
  }, []);

  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps, isDragActive: isVideoDrag } = useDropzone({
    onDrop: onDropVideo,
    accept: { 'video/mp4': ['.mp4'], 'video/webm': ['.webm'], 'video/quicktime': ['.mov'] },
    maxFiles: 1,
    disabled: videoUploading || videoUploaded || useExistingVideoCv,
  });

  async function handleUploadVideoResponse() {
    if (!videoFile) return;
    setVideoUploading(true);
    try {
      const form = new FormData();
      form.append('file', videoFile);
      form.append('title', `Video Application – ${job.title}`);
      await cvsApi.uploadVideo(form);
      setVideoUploaded(true);
      qc.invalidateQueries({ queryKey: ['my-cvs'] });
      toast.success('Video response uploaded!');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Video upload failed');
    } finally {
      setVideoUploading(false);
    }
  }

  async function handleGenerateCoverLetter() {
    if (!selectedCvId) { toast.error('Select a CV first'); return; }
    setGeneratingCover(true);
    try {
      const { data } = await aiApi.generateCoverLetter({ jobId: job.id, cvId: selectedCvId });
      const letter = data?.data?.coverLetter ?? data?.coverLetter ?? '';
      if (letter) {
        setValue('coverLetter', `<p>${letter.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`);
        toast.success('Cover letter generated!');
      } else {
        toast.error('AI returned an empty response. Check API key configuration.');
      }
    } catch {
      toast.error('Failed to generate cover letter. AI service may be unavailable.');
    } finally {
      setGeneratingCover(false);
    }
  }

  useEffect(() => {
    if (!open) {
      setApplied(false);
    }
  }, [open]);

  const apply = useMutation({
    mutationFn: (data: FormData) => jobsApi.apply(job.id, data),
    onSuccess: () => {
      setApplied(true);
      toast.success('Application submitted!');
      // Mark job as applied locally
      job.hasApplied = true;
      // Invalidate all relevant job & application queries so lists reflect 'Applied' immediately
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['job-recommendations'] });
      qc.invalidateQueries({ queryKey: ['job', job.id] });
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['my-applications-all'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Application failed');
    },
  });

  // Validate video requirement before submit
  function onSubmit(data: FormData) {
    if (requiresVideo && !videoUploaded && !useExistingVideoCv) {
      toast.error('This job requires a video response. Please upload a video or use your saved Video CV.');
      return;
    }
    apply.mutate(data);
  }

  if (applied) {
    return (
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center text-center py-6 gap-3">
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <h3 className="font-semibold text-base">Application submitted!</h3>
            <p className="text-sm text-muted-foreground">
              Your application to <strong>{job.title}</strong> at <strong>{job.employer?.companyName}</strong> is under review.
            </p>
            <Button className="w-full mt-2" onClick={onClose}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply to {job.title}</DialogTitle>
          <p className="text-xs text-muted-foreground">{job.employer?.companyName}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className="space-y-5">
            {/* CV selector */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Select CV *</label>
              {cvsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 rounded-lg" />
                  <Skeleton className="h-14 rounded-lg" />
                </div>
              ) : !cvs?.length ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground">No CVs uploaded yet.</p>
                  <Button variant="link" size="sm" className="mt-1 text-xs" type="button"
                    onClick={() => { onClose(); window.location.href = '/resume'; }}>
                    Upload your CV →
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {cvs?.map(cv => (
                    <button
                      key={cv.id}
                      type="button"
                      onClick={() => setValue('cvId', cv.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                        selectedCvId === cv.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                      )}
                    >
                      <FileText className={cn('h-4 w-4 shrink-0', selectedCvId === cv.id ? 'text-primary' : 'text-muted-foreground')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{cv.title}</p>
                        {cv.description && <p className="text-[10px] text-muted-foreground line-clamp-1">{cv.description}</p>}
                        {cv.isDefault && <p className="text-[10px] text-primary font-semibold">Default CV (Auto-Apply)</p>}
                      </div>
                      {selectedCvId === cv.id && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
              {errors.cvId && <p className="text-xs text-destructive mt-1">{errors.cvId.message}</p>}
            </div>

            {/* Screening questions */}
            {job.screeningQuestions && job.screeningQuestions.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-3 block">
                  Screening questions ({job.screeningQuestions.length})
                </label>
                <div className="space-y-4">
                  {job.screeningQuestions.map((q) => (
                    <ScreeningAnswerField
                      key={q.id}
                      question={q}
                      control={control}
                      register={register}
                      watch={watch}
                      setValue={setValue}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Video application step (only when job requires it) ──────────── */}
            {requiresVideo && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />
                  <label className="text-xs font-semibold text-primary">
                    Video Response Required
                    <span className="text-destructive ml-0.5">*</span>
                  </label>
                </div>
                <p className="text-[11px] text-muted-foreground -mt-1">
                  This employer requires a short video introduction (1–3 min, MP4/WebM/MOV, max 50 MB).
                </p>

                {/* Use existing Video CV */}
                {existingVideoCv && !videoFile && (
                  <div className={cn(
                    'border rounded-xl overflow-hidden transition-all',
                    useExistingVideoCv ? 'border-primary ring-1 ring-primary/30' : 'border-border',
                  )}>
                    <video src={existingVideoCv} controls className="w-full max-h-[180px] object-contain bg-black" />
                    <div className="p-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setUseExistingVideoCv(v => !v)}
                        className={cn(
                          'flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all',
                          useExistingVideoCv
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {useExistingVideoCv ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                        {useExistingVideoCv ? 'Using my Video CV ✓' : 'Use my saved Video CV'}
                      </button>
                      <span className="text-[10px] text-muted-foreground ml-auto">or upload a new one below</span>
                    </div>
                  </div>
                )}

                {/* Video upload drop-zone */}
                {!useExistingVideoCv && (
                  <div
                    {...getVideoRootProps()}
                    className={cn(
                      'border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all',
                      isVideoDrag ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-surface-raised',
                      (videoUploading || videoUploaded) && 'opacity-70 cursor-not-allowed',
                    )}
                  >
                    <input {...getVideoInputProps()} />
                    <div className="flex flex-col items-center gap-2">
                      {videoUploaded
                        ? <CheckCircle2 className="h-6 w-6 text-success" />
                        : videoUploading
                        ? <Loader2 className="h-6 w-6 text-primary animate-spin" />
                        : <Upload className={cn('h-6 w-6', isVideoDrag ? 'text-primary' : 'text-muted-foreground')} />
                      }
                      <p className="text-xs font-medium">
                        {videoUploaded ? 'Video response uploaded ✓' :
                         videoUploading ? 'Uploading…' :
                         videoFile ? videoFile.name :
                         isVideoDrag ? 'Drop your video here' :
                         'Drag & drop or click to upload video response'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">MP4, WebM or MOV · Max 50 MB</p>
                    </div>
                  </div>
                )}

                {/* Preview + upload button */}
                {videoPreviewUrl && !videoUploaded && !useExistingVideoCv && (
                  <div className="space-y-2">
                    <video src={videoPreviewUrl} controls className="w-full max-h-[160px] object-contain bg-black rounded-xl border border-border" />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleUploadVideoResponse}
                      disabled={videoUploading}
                      className="w-full gap-2"
                    >
                      {videoUploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {videoUploading ? 'Uploading…' : 'Upload this video'}
                    </Button>
                  </div>
                )}

                {/* Warning if neither option selected */}
                {!videoUploaded && !useExistingVideoCv && !videoFile && (
                  <div className="flex items-center gap-2 text-[11px] text-amber-500">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Upload a video response to complete this application.
                  </div>
                )}
              </div>
            )}

            {/* Cover letter (optional) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Cover letter <span className="text-[11px] text-muted-foreground/60">(optional)</span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-[11px] gap-1 border-primary/40 text-primary hover:bg-primary/5"
                  onClick={handleGenerateCoverLetter}
                  disabled={generatingCover || !selectedCvId}
                >
                  {generatingCover
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Sparkles className="h-3 w-3" />}
                  {generatingCover ? 'Generating…' : 'Generate with AI'}
                </Button>
              </div>

              {coverLetters && coverLetters.length > 0 && (
                <div className="mb-2">
                  <select
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs"
                    onChange={(e) => {
                      const selectedCl = coverLetters.find(c => c.id === e.target.value);
                      if (selectedCl) {
                        setValue('coverLetterId', selectedCl.id);
                        if (selectedCl.content) setValue('coverLetter', selectedCl.content);
                      } else {
                        setValue('coverLetterId', '');
                      }
                    }}
                  >
                    <option value="">-- Select a saved Cover Letter --</option>
                    {coverLetters.map((cl: any) => (
                      <option key={cl.id} value={cl.id}>
                        {cl.title} {cl.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <RichTextEditor
                value={watch('coverLetter') ?? ''}
                onChange={v => setValue('coverLetter', v)}
                placeholder="Briefly explain why you're a great fit for this role…"
                minHeight={120}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={apply.isPending || !selectedCvId || (requiresVideo && !videoUploaded && !useExistingVideoCv)}
            >
              {apply.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Submit application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


// ─── Screening answer input by question type ──────────────────────────────────

function ScreeningAnswerField({ question, control, register, watch, setValue }: {
  question: any;
  control: any;
  register: any;
  watch: any;
  setValue: any;
}) {
  const fieldName = `screeningAnswers.${question.id}` as const;
  const type: string = question.type ?? 'short_text';

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-foreground flex items-start gap-1">
        {question.question}
        {question.isRequired && <span className="text-destructive shrink-0">*</span>}
      </label>

      {type === 'yes_no' && (
        <div className="flex gap-3">
          {['Yes', 'No'].map(opt => (
            <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                value={opt}
                {...register(fieldName)}
                className="accent-primary"
              />
              <span className="text-xs text-foreground">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {type === 'single_choice' && question.options?.length > 0 && (
        <div className="space-y-1.5">
          {question.options.map((opt: string) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value={opt}
                {...register(fieldName)}
                className="accent-primary"
              />
              <span className="text-xs text-foreground">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {type === 'multiple_choice' && question.options?.length > 0 && (
        <Controller
          name={fieldName}
          control={control}
          defaultValue={[]}
          render={({ field }) => (
            <div className="space-y-1.5">
              {question.options.map((opt: string) => {
                const selected: string[] = Array.isArray(field.value) ? field.value : [];
                const checked = selected.includes(opt);
                return (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        field.onChange(
                          checked
                            ? selected.filter(v => v !== opt)
                            : [...selected, opt]
                        );
                      }}
                      className="accent-primary"
                    />
                    <span className="text-xs text-foreground">{opt}</span>
                  </label>
                );
              })}
            </div>
          )}
        />
      )}

      {type === 'long_text' && (
        <textarea
          {...register(fieldName)}
          rows={3}
          placeholder="Your answer…"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground resize-none"
        />
      )}

      {(type === 'short_text' || !['yes_no', 'single_choice', 'multiple_choice', 'long_text'].includes(type)) && (
        <input
          {...register(fieldName)}
          placeholder="Your answer…"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
        />
      )}
    </div>
  );
}
