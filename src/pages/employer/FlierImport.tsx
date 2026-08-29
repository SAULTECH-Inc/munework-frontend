import { useRef, useState } from 'react';
import { AlertTriangle, Info, Loader2, Sparkles, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { jobsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface FlierDraft {
  title?: string | null;
  description?: string | null;
  responsibilities?: string | null;
  requirements?: string | null;
  department?: string | null;
  location?: string | null;
  jobType?: string | null;
  workMode?: string | null;
  experienceLevel?: string | null;
  experienceYears?: number | null;
  skills?: string[];
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryFrequency?: string | null;
  applicationDeadline?: string | null;
}

export interface FlierWarning {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

const ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp,image/tiff,image/bmp,application/pdf';

/**
 * Employers almost always have a designed flier before they open this form.
 * Reading it and pre-filling the fields saves them retyping, and — the reason
 * it matters — keeps the real content in the structured fields, where matching,
 * search and the recommendation digest can actually read it.
 */
export function FlierImport({ onExtracted }: { onExtracted: (draft: FlierDraft) => number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [warnings, setWarnings] = useState<FlierWarning[]>([]);
  const [filled, setFilled] = useState<number | null>(null);
  const [fileName, setFileName] = useState('');

  async function handleFile(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('That flier is over 10MB. Try a smaller export.');
      return;
    }

    setBusy(true);
    setWarnings([]);
    setFilled(null);
    setFileName(file.name);

    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await jobsApi.extractFromFlier(form);
      const result = data?.data ?? data;

      const count = onExtracted(result.fields ?? {});
      setFilled(count);
      setWarnings(result.warnings ?? []);

      if (count > 0) {
        toast.success(`Filled ${count} field${count === 1 ? '' : 's'} from your flier — check them over.`);
      } else {
        toast.error('We read the flier but could not identify any job fields.');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not read that flier.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => !busy && inputRef.current?.click()}
        className={cn(
          'rounded-xl border border-dashed p-4 text-center cursor-pointer transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-surface',
          busy && 'pointer-events-none opacity-70',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />

        {busy ? (
          <div className="flex items-center justify-center gap-2 py-1">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Reading {fileName}…</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">
                Already have a flier? Drop it here
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                We read it and fill this form in for you — PNG, JPG, WEBP or PDF. You review everything before posting.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" className="shrink-0 ml-auto">
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Choose file
            </Button>
          </div>
        )}
      </div>

      {filled !== null && warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => {
            const tone =
              w.severity === 'error'
                ? 'border-destructive/40 bg-destructive/10'
                : w.severity === 'warning'
                  ? 'border-warning/40 bg-warning/10'
                  : 'border-border bg-surface';
            const Icon = w.severity === 'info' ? Info : AlertTriangle;
            const iconTone =
              w.severity === 'error' ? 'text-destructive'
              : w.severity === 'warning' ? 'text-warning'
              : 'text-muted-foreground';

            return (
              <div key={i} className={cn('flex items-start gap-2.5 rounded-lg border p-3', tone)}>
                <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', iconTone)} />
                <p className="text-xs text-foreground/85 leading-relaxed flex-1">{w.message}</p>
                <button
                  type="button"
                  onClick={() => setWarnings((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
