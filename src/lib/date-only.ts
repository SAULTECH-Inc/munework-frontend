const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse a YYYY-MM-DD value as a local calendar date, not as UTC midnight. */
export function parseDateOnly(value: string | null | undefined): Date | null {
  const datePart = value?.slice(0, 10);
  const match = datePart?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) return null;

  return parsed;
}

/** Format a local calendar date without shifting it through UTC. */
export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Calendar-day difference from the user's local today to a date-only value. */
export function daysUntilDateOnly(value: string | null | undefined, now = new Date()): number | null {
  const deadline = parseDateOnly(value);
  if (!deadline) return null;

  const deadlineDay = Date.UTC(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((deadlineDay - today) / DAY_MS);
}
