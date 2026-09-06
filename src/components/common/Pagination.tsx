import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Compact page control. Client-side by default — pass the current page, the
 * total number of pages, and an onChange. Renders nothing for a single page.
 */
export function Pagination({
  page,
  totalPages,
  onChange,
  className,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  // A small window of page numbers around the current page, with the first and
  // last always reachable.
  const pages: (number | '…')[] = [];
  const push = (n: number) => pages.push(n);
  const window = 1;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - window && p <= page + window)) {
      push(p);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  const btn = 'h-8 min-w-8 px-2 rounded-lg text-xs font-medium border transition-colors flex items-center justify-center';

  return (
    <div className={cn('flex items-center justify-center gap-1.5 pt-2', className)}>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className={cn(btn, 'border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none')}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              btn,
              p === page
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40',
            )}
          >
            {p}
          </button>
        ),
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className={cn(btn, 'border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none')}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
