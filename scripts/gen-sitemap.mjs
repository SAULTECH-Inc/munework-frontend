/**
 * Writes dist/sitemap.xml at build time.
 *
 * Static pages are listed unconditionally. Company profiles are pulled from the
 * public employers endpoint so the sitemap grows as companies sign up, instead
 * of going stale the moment a hand-written file is committed.
 *
 * Two rules this follows deliberately:
 *
 *  - Only URLs a signed-out visitor can actually load are listed. Everything
 *    inside the authenticated shell redirects to /login, and listing those
 *    trains crawlers to distrust the sitemap.
 *  - Applicant profiles are never listed. They are reachable by link, but
 *    people job-hunting discreetly should not turn up in a search for their
 *    name. robots.txt disallows the same path.
 *
 * Never fails the build: a sitemap missing its dynamic half is a minor SEO
 * loss, a failed deploy is an outage.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

const SITE = process.env.VITE_SITE_URL || 'https://munework.com';
const API = (process.env.VITE_API_BASE_URL || 'https://backend-gamma-liart-35.vercel.app/api/v1').replace(/\/$/, '');
const OUT = resolve(process.cwd(), 'dist/sitemap.xml');

/** changefreq/priority are hints only, but they cost nothing and Bing still reads them. */
const STATIC_PAGES = [
  { path: '/',             changefreq: 'daily',   priority: '1.0' },
  { path: '/jobs',         changefreq: 'hourly',  priority: '0.9' },
  { path: '/companies',    changefreq: 'daily',   priority: '0.8' },
  { path: '/plans',        changefreq: 'monthly', priority: '0.5' },
  { path: '/hiring-guide', changefreq: 'monthly', priority: '0.5' },
  { path: '/help',         changefreq: 'monthly', priority: '0.4' },
  { path: '/changelog',    changefreq: 'weekly',  priority: '0.4' },
  { path: '/terms',        changefreq: 'yearly',  priority: '0.3' },
  { path: '/privacy',      changefreq: 'yearly',  priority: '0.3' },
];

const today = new Date().toISOString().slice(0, 10);

function url({ path, lastmod = today, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${SITE}${path}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    '  </url>',
  ].filter(Boolean).join('\n');
}

/** Live job postings — the highest-value URLs on the site. */
async function fetchJobs() {
  const out = [];
  try {
    for (let page = 1; page <= 50; page++) {
      const res = await fetch(`${API}/jobs?page=${page}&limit=100&status=active`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) break;

      const body = await res.json();
      const payload = body?.data ?? body;
      const items = Array.isArray(payload) ? payload : payload?.data ?? [];
      if (!items.length) break;

      for (const j of items) {
        if (!j?.id) continue;
        out.push({
          path: `/jobs/${j.id}`,
          lastmod: (j.updatedAt ?? j.createdAt ?? today).slice(0, 10),
          changefreq: 'weekly',
          priority: '0.8',
        });
      }

      const totalPages = payload?.totalPages;
      if (totalPages && page >= totalPages) break;
    }
  } catch (err) {
    console.warn(`[sitemap] job postings skipped: ${err.message}`);
  }
  return out;
}

async function fetchCompanies() {
  const out = [];
  try {
    // Page through rather than trusting one large limit; the API caps page size.
    for (let page = 1; page <= 20; page++) {
      const res = await fetch(`${API}/employers?page=${page}&limit=100`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) break;

      const body = await res.json();
      const payload = body?.data ?? body;
      const items = Array.isArray(payload) ? payload : payload?.data ?? [];
      if (!items.length) break;

      for (const c of items) {
        if (!c?.id) continue;
        out.push({
          path: `/profile/employer/${c.id}`,
          lastmod: (c.updatedAt ?? c.createdAt ?? today).slice(0, 10),
          changefreq: 'weekly',
          priority: '0.7',
        });
      }

      const totalPages = payload?.totalPages;
      if (totalPages && page >= totalPages) break;
    }
  } catch (err) {
    console.warn(`[sitemap] company profiles skipped: ${err.message}`);
  }
  return out;
}

const [jobs, companies] = await Promise.all([fetchJobs(), fetchCompanies()]);
const entries = [...STATIC_PAGES, ...jobs, ...companies];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(url).join('\n')}
</urlset>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, xml);
console.log(`[sitemap] ${entries.length} urls (${jobs.length} jobs, ${companies.length} companies) -> dist/sitemap.xml`);
