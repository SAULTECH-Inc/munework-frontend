import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalises any list-ish API payload into a plain array.
 * Handles `[...]`, `{ items }`, `{ data }`, `{ results }`, `{ content }`
 * and one extra level of nesting (e.g. `{ data: { items } }`).
 */
export function toList<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const key of ['items', 'data', 'results', 'content'] as const) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      const nested = toList<T>(value);
      if (nested.length) return nested;
    }
  }
  return [];
}

export function timeAgo(date?: string | Date | null) {
  if (!date) return 'Recently';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Recently';
  try {
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return 'Recently';
  }
}

export function formatDate(date?: string | Date | null, fmt = 'MMM d, yyyy') {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  try {
    return format(d, fmt);
  } catch {
    return '';
  }
}

export function formatSalary(range?: { min: number; max: number; currency: string; frequency: string }) {
  if (!range) return 'Salary not disclosed';
  const fmt = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `${(n / 1_000).toFixed(0)}k`
      : `${n}`;
  return `${range.currency} ${fmt(range.min)}–${fmt(range.max)}/${range.frequency.replace('ly', '')}`;
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Badge for a real match score, or null when there is none.
 *
 * This used to fabricate a score by hashing the job id (and fall back to a
 * constant 75) when no real score was present — so applicants saw convincing
 * "% Match" numbers that had nothing to do with their profile. A made-up match
 * score is worse than none, because people trust it. Now it returns null and
 * callers render nothing.
 */
export function getMatchScoreBadge(rawScore?: number | null) {
  if (rawScore == null) return null;
  const score = rawScore <= 1 && rawScore > 0 ? Math.round(rawScore * 100) : Math.round(rawScore);

  let style = '';
  let labelText = '';

  if (score >= 85) {
    // 🟢 Green — Highest Match
    style = 'bg-emerald-500 text-white border-emerald-600 shadow-[0_2px_8px_rgba(16,185,129,0.45)]';
    labelText = 'Highest Match';
  } else if (score >= 75) {
    // 🟠 Orange — Great Match
    style = 'bg-orange-500 text-white border-orange-600 shadow-[0_2px_8px_rgba(249,115,22,0.4)]';
    labelText = 'Great Match';
  } else if (score >= 60) {
    // 🟡 Yellow/Amber — Good Match
    style = 'bg-amber-400 text-amber-950 border-amber-500 shadow-[0_2px_6px_rgba(251,191,36,0.35)]';
    labelText = 'Good Match';
  } else if (score >= 45) {
    // ⬜ Silver — Fair Match
    style = 'bg-slate-400 text-white border-slate-500 shadow-sm';
    labelText = 'Fair Match';
  } else {
    // 🔴 Red — Low Match
    style = 'bg-red-500 text-white border-red-600 shadow-[0_2px_6px_rgba(239,68,68,0.35)]';
    labelText = 'Low Match';
  }

  return { score, style, labelText };
}

export function scoreColor(score: number) {
  if (score >= 0.8) return 'text-success';
  if (score >= 0.6) return 'text-warning';
  return 'text-muted-foreground';
}

export function scoreBg(score: number) {
  if (score >= 0.8) return 'bg-success/10 text-success border-success/20';
  if (score >= 0.6) return 'bg-warning/10 text-warning border-warning/20';
  return 'bg-muted text-muted-foreground';
}

export const JOB_TYPE_LABEL: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  freelance: 'Freelance',
  internship: 'Internship',
  temporary: 'Temporary',
  volunteer: 'Volunteer',
};

export const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  remote: 'Remote',
  onsite: 'On-site',
  hybrid: 'Hybrid',
};

export const LEVEL_LABEL: Record<string, string> = {
  intern: 'Internship',
  junior: 'Junior Level',
  mid: 'Mid Level',
  senior: 'Senior Level',
  lead: 'Lead / Staff',
  manager: 'Managerial',
};

export const APPLICATION_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview Scheduled',
  offer_extended: 'Offer Extended',
  offer_accepted: 'Offer Accepted',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const APPLICATION_STATUS_COLOR: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  under_review: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  shortlisted: 'bg-primary/10 text-primary border-primary/20',
  interview_scheduled: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  offer_extended: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  offer_accepted: 'bg-success/10 text-success border-success/20',
  hired: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  withdrawn: 'bg-muted/20 text-muted-foreground border-border',
};
