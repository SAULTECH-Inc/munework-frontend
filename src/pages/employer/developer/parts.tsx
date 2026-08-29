import { useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Label + control, matching the spacing the rest of the app uses in forms. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground leading-relaxed">{hint}</p>}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('border border-border rounded-xl bg-surface-raised', className)}>
      <div className="flex items-start justify-between gap-4 p-4 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'default' | 'primary' | 'success' | 'warning';
}) {
  const toneClass = {
    default: 'text-foreground',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
  }[tone];

  return (
    <div className="border border-border rounded-xl p-4 bg-surface-raised">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('text-2xl font-bold mt-1 font-[\'Outfit\',sans-serif]', toneClass)}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

/**
 * Monospace block with a copy button — every snippet on this page is meant to
 * be pasted into an editor, so none of them should have to be retyped.
 */
export function Code({
  children,
  className,
  label,
}: {
  children: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className={cn('relative group', className)}>
      {label && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-t-lg bg-muted border border-b-0 border-border">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
      )}
      <pre className={cn(
        'bg-muted border border-border p-3 pr-11 text-[11px] leading-relaxed font-mono overflow-x-auto text-foreground/90',
        label ? 'rounded-b-lg' : 'rounded-lg',
      )}>
        {children}
      </pre>
      <button
        onClick={copy}
        title="Copy"
        className={cn(
          'absolute right-2 p-1.5 rounded-md border border-border bg-surface-raised transition-opacity',
          label ? 'top-9' : 'top-2',
          'opacity-0 group-hover:opacity-100 focus:opacity-100',
        )}
      >
        {copied
          ? <Check className="h-3.5 w-3.5 text-success" />
          : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
    </div>
  );
}

export function MethodPill({ method }: { method: string }) {
  const tone =
    method === 'GET' ? 'bg-success/15 text-success'
    : method === 'POST' ? 'bg-primary/15 text-primary'
    : method === 'PATCH' ? 'bg-warning/15 text-warning'
    : 'bg-destructive/15 text-destructive';

  return (
    <span className={cn('inline-block px-2 py-0.5 rounded-md text-[10px] font-bold font-mono shrink-0', tone)}>
      {method}
    </span>
  );
}
