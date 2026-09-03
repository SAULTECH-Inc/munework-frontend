import { Link } from 'react-router-dom';
import { categoriesByGroup } from '@/lib/job-categories';

/**
 * "Browse by" link lists.
 *
 * These are not decoration. Sitelinks and category rankings depend on Google
 * finding the category pages through ordinary internal links from pages it
 * already crawls — a sitemap alone gets them discovered but says nothing about
 * which pages matter. Rendering this on /jobs and on every category page gives
 * each one inbound links from its siblings.
 */
export function BrowseJobsBy({ currentSlug }: { currentSlug?: string }) {
  return (
    <nav aria-label="Browse jobs by category" className="border-t border-border pt-8 mt-10">
      <h2 className="text-sm font-semibold text-foreground mb-5">Browse jobs by</h2>

      <div className="grid gap-8 sm:grid-cols-3">
        {categoriesByGroup().map(([group, items]) => (
          <div key={group}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2.5">
              {group}
            </p>
            <ul className="space-y-1.5">
              {items.map((c) => (
                <li key={c.slug}>
                  {c.slug === currentSlug ? (
                    <span className="text-sm text-foreground font-medium">{c.label}</span>
                  ) : (
                    <Link
                      to={`/jobs/${c.slug}`}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {c.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
