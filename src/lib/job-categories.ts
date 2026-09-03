/**
 * Indexable job category pages.
 *
 * /jobs is one URL with client-side filters, so there is nothing for a search
 * engine to rank against "remote jobs in Lagos" — the query never appears in a
 * crawlable page. Each entry here becomes a real URL with its own title,
 * heading and description, which is both how long-tail search traffic arrives
 * and the precondition for Google generating sitelinks.
 *
 * The slug is the URL. `params` are passed straight to the jobs search
 * endpoint, so the values must match the API's enums: workMode is
 * remote|onsite|hybrid (mapped to employmentType server-side) and jobType is
 * the snake_case JobType enum.
 *
 * This module is imported by the sitemap generator as well as the app, so it
 * must stay free of React and browser globals.
 */

export interface JobCategory {
  /** URL path, without a leading slash on the segment after /jobs. */
  slug: string;
  /** Search params handed to the jobs endpoint. */
  params: Record<string, string>;
  /** <h1> on the page. */
  heading: string;
  /** <title> — leads with the keyword, ends with the brand. */
  title: string;
  description: string;
  /** Short lead paragraph. Gives the page text of its own to rank on. */
  intro: string;
  group: 'Work style' | 'Contract type' | 'Location';
  /** Label used in the "browse by" link lists. */
  label: string;
}

const workStyles: JobCategory[] = [
  {
    slug: 'remote',
    params: { workMode: 'remote' },
    label: 'Remote jobs',
    heading: 'Remote jobs',
    title: 'Remote Jobs — Work From Anywhere | Mune Work',
    description:
      'Browse remote jobs hiring now. Filter by role, salary and experience level, and apply with a profile that follows you from one application to the next.',
    intro:
      'Roles you can do from anywhere, with no daily commute. Every listing here is fully remote — see the job page for any timezone or country requirements the employer has set.',
    group: 'Work style',
  },
  {
    slug: 'hybrid',
    params: { workMode: 'hybrid' },
    label: 'Hybrid jobs',
    heading: 'Hybrid jobs',
    title: 'Hybrid Jobs — Split Your Week | Mune Work',
    description:
      'Browse hybrid roles that mix office and home. Compare salaries, locations and experience levels, and apply in one click.',
    intro:
      'Roles that split the week between an office and working from home. The balance varies by employer, so check each listing for how many days on site are expected.',
    group: 'Work style',
  },
  {
    slug: 'onsite',
    params: { workMode: 'onsite' },
    label: 'On-site jobs',
    heading: 'On-site jobs',
    title: 'On-Site Jobs — Roles Based at the Workplace | Mune Work',
    description:
      'Browse on-site jobs by location and industry. See salary, experience level and company details before you apply.',
    intro:
      'Roles based at the employer’s workplace. Use the location pages below if you are looking for something within reach of where you live.',
    group: 'Work style',
  },
];

const contractTypes: JobCategory[] = [
  {
    slug: 'full-time',
    params: { jobType: 'full_time' },
    label: 'Full-time jobs',
    heading: 'Full-time jobs',
    title: 'Full-Time Jobs Hiring Now | Mune Work',
    description:
      'Browse full-time roles across every industry. Compare salaries and companies, and apply in one click.',
    intro: 'Permanent, full-time roles across every industry on Mune Work.',
    group: 'Contract type',
  },
  {
    slug: 'part-time',
    params: { jobType: 'part_time' },
    label: 'Part-time jobs',
    heading: 'Part-time jobs',
    title: 'Part-Time Jobs — Flexible Hours | Mune Work',
    description:
      'Browse part-time jobs with reduced or flexible hours, across every industry and location.',
    intro: 'Roles with reduced or flexible hours, for study, caring or a second income.',
    group: 'Contract type',
  },
  {
    slug: 'contract',
    params: { jobType: 'contract' },
    label: 'Contract jobs',
    heading: 'Contract jobs',
    title: 'Contract Jobs and Fixed-Term Roles | Mune Work',
    description:
      'Browse contract and fixed-term roles. See rates, duration and company details before you apply.',
    intro: 'Fixed-term and contract roles, usually for a defined project or period.',
    group: 'Contract type',
  },
  {
    slug: 'freelance',
    params: { jobType: 'freelance' },
    label: 'Freelance jobs',
    heading: 'Freelance jobs',
    title: 'Freelance Jobs and Project Work | Mune Work',
    description:
      'Browse freelance and project-based work. Set your own terms and apply directly to the employer.',
    intro: 'Project-based work you take on independently, rather than as an employee.',
    group: 'Contract type',
  },
  {
    slug: 'internship',
    params: { jobType: 'internship' },
    label: 'Internships',
    heading: 'Internships',
    title: 'Internships and Graduate Roles | Mune Work',
    description:
      'Browse internships and entry-level roles. Start your career with employers hiring on Mune Work.',
    intro:
      'Entry points into a career — internships and placements aimed at students and recent graduates.',
    group: 'Contract type',
  },
];

/**
 * Location pages are the highest-traffic category on every job board, which is
 * why competitors run one per major city. Kept to Nigeria's main hiring
 * centres plus a global page rather than generated from live data: a page with
 * no listings is a poor result and Google treats thin pages harshly.
 */
const locationSlugs: Array<[string, string]> = [
  ['lagos', 'Lagos'],
  ['abuja', 'Abuja'],
  ['port-harcourt', 'Port Harcourt'],
  ['ibadan', 'Ibadan'],
  ['kano', 'Kano'],
  ['benin-city', 'Benin City'],
];

const locations: JobCategory[] = locationSlugs.map(([slug, city]) => ({
  slug: `in/${slug}`,
  params: { location: city },
  label: `Jobs in ${city}`,
  heading: `Jobs in ${city}`,
  title: `Jobs in ${city} — Vacancies Hiring Now | Mune Work`,
  description: `Find jobs in ${city} across every industry. Compare salaries and companies, and apply in one click on Mune Work.`,
  intro: `Current vacancies in ${city} and the surrounding area, across every industry and experience level.`,
  group: 'Location',
}));

export const JOB_CATEGORIES: JobCategory[] = [...workStyles, ...contractTypes, ...locations];

export function findCategory(slug: string): JobCategory | undefined {
  return JOB_CATEGORIES.find((c) => c.slug === slug);
}

/** Grouped for the "browse by" link lists that carry crawlers between pages. */
export function categoriesByGroup(): Array<[JobCategory['group'], JobCategory[]]> {
  const groups: JobCategory['group'][] = ['Work style', 'Contract type', 'Location'];
  return groups.map((g) => [g, JOB_CATEGORIES.filter((c) => c.group === g)]);
}
