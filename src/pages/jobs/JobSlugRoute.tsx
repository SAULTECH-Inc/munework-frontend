import { useParams } from 'react-router-dom';
import { findCategory } from '@/lib/job-categories';
import JobCategoryPage from './JobCategory';
import JobDetailPage from './JobDetail';

/**
 * Resolves /jobs/:slug to either a category landing page or a job detail page.
 *
 * Both want a single dynamic segment, and React Router cannot rank two
 * same-shaped dynamic routes against each other — declaring /jobs/:slug and
 * /jobs/:id side by side means whichever is first swallows the other, breaking
 * job detail pages. Deciding here keeps one route and makes the rule explicit:
 * a known category slug is a category, anything else is treated as a job id.
 */
export default function JobSlugRoute() {
  const { slug } = useParams<{ slug: string }>();
  return findCategory(slug ?? '') ? <JobCategoryPage /> : <JobDetailPage />;
}
