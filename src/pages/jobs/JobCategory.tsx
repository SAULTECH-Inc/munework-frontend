import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Briefcase } from 'lucide-react';
import { jobsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useSeo, useJsonLd } from '@/lib/seo';
import { findCategory } from '@/lib/job-categories';
import { BrowseJobsBy } from '@/components/common/BrowseJobsBy';
import { JobCard, JobCardSkeleton } from './Jobs';
import type { Job } from '@/types';

/**
 * A crawlable landing page for one job category.
 *
 * Renders the same listings /jobs would with a filter applied, but at its own
 * URL with its own heading, copy and metadata — so "remote jobs" is something
 * a search engine can rank, rather than a filter state that never appears in a
 * URL.
 */
export default function JobCategoryPage() {
  const { slug, city } = useParams<{ slug?: string; city?: string }>();
  const navigate = useNavigate();
  const isApplicant = useAuthStore((st) => st.user?.userType === 'applicant');

  // Location pages live at /jobs/in/:city, everything else at /jobs/:slug.
  const key = city ? `in/${city}` : (slug ?? '');
  const category = findCategory(key);

  const { data, isLoading } = useQuery({
    queryKey: ['job-category', key],
    queryFn: () =>
      jobsApi.search({ ...category!.params, limit: '20' }).then((r) => r.data.data ?? r.data),
    enabled: !!category,
  });

  useSeo({
    title: category?.title,
    description: category?.description,
    canonical: category ? `/jobs/${category.slug}` : undefined,
  });

  // Breadcrumbs render as a trail above the result rather than a bare URL.
  useJsonLd(
    category
      ? {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
            { '@type': 'ListItem', position: 2, name: 'Jobs', item: `${window.location.origin}/jobs` },
            {
              '@type': 'ListItem',
              position: 3,
              name: category.heading,
              item: `${window.location.origin}/jobs/${category.slug}`,
            },
          ],
        }
      : null,
  );

  // An unknown slug is a 404, not an empty category — otherwise every typo
  // becomes a thin page that Google may index.
  if (!category) return <Navigate to="/jobs" replace />;

  const jobs: Job[] = (data as any)?.data ?? data ?? [];
  const total: number = (data as any)?.total ?? jobs.length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-20">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground mb-4">
        <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
        <span className="mx-1.5">/</span>
        <Link to="/jobs" className="hover:text-foreground transition-colors">Jobs</Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">{category.heading}</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {category.heading}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
          {category.intro}
        </p>
        {!isLoading && (
          <p className="text-xs text-muted-foreground mt-3">
            {total === 0
              ? 'No open roles in this category right now.'
              : `${total} open ${total === 1 ? 'role' : 'roles'}`}
          </p>
        )}
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <JobCardSkeleton key={i} />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="border border-border rounded-2xl py-14 text-center">
          <Briefcase className="h-7 w-7 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Nothing here yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            No {category.heading.toLowerCase()} are open at the moment.
          </p>
          <Link to="/jobs" className="text-xs text-primary hover:underline mt-4 inline-block">
            Browse all jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              selected={false}
              compact={false}
              onSelect={() => navigate(`/jobs/${job.id}`)}
              onApply={() => navigate(`/jobs/${job.id}`)}
              onBookmark={() => {
                if (!isApplicant) navigate('/signup');
                else jobsApi.toggleBookmark(job.id).catch(() => {});
              }}
            />
          ))}
        </div>
      )}

      <BrowseJobsBy currentSlug={category.slug} />
    </div>
  );
}
