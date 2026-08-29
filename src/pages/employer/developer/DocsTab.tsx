import { useState } from 'react';
import { Check, Copy, Lock, Repeat, ShieldCheck, Terminal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Code, MethodPill, SectionCard } from './parts';
import { cn } from '@/lib/utils';

// Same source the API client uses, so the docs always show the real base URL.
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1';
const BASE = RAW_BASE.startsWith('http') ? RAW_BASE : `${window.location.origin}${RAW_BASE}`;

const ENDPOINTS = [
  {
    method: 'GET', path: '/partner/whoami', meter: 'read',
    scope: 'jobs:read',
    summary: 'Confirm your key works and see which scopes it holds.',
    response: `{
  "employerId": "d219fd91-…",
  "mode": "live",
  "scopes": ["jobs:read", "jobs:write"],
  "keyName": "Production server"
}`,
  },
  {
    method: 'POST', path: '/partner/jobs', meter: 'write',
    scope: 'jobs:write',
    summary: 'Publish a role from your own system instead of our UI.',
    request: `{
  "title": "Senior Backend Engineer",
  "description": "<p>Own the payments ledger…</p>",
  "requirements": "5+ years with Node.js and Postgres",
  "location": "Lagos, Nigeria",
  "jobType": "full_time",
  "employmentType": "hybrid",
  "level": "senior",
  "experienceYears": 5,
  "skillSet": ["Node.js", "PostgreSQL", "Kafka"],
  "salaryRange": { "min": 900000, "max": 1400000,
                   "currency": "NGN", "frequency": "monthly" },
  "startDate": "2026-09-01",
  "endDate": "2026-10-01"
}`,
    response: `{ "job": { "id": "…", "status": "posted", … } }`,
  },
  {
    method: 'GET', path: '/partner/jobs', meter: 'read',
    scope: 'jobs:read',
    summary: 'List your jobs. Pass ?updatedSince= to sync only what changed.',
    query: '?page=1&limit=20&status=posted&updatedSince=2026-08-01T00:00:00Z',
    response: `{ "data": [ { "id": "…", "title": "…", "status": "posted" } ],
  "page": 1, "limit": 20, "total": 34 }`,
  },
  {
    method: 'GET', path: '/partner/jobs/:id', meter: 'read',
    scope: 'jobs:read',
    summary: 'Fetch one job, including its current status and AI screening settings.',
  },
  {
    method: 'PATCH', path: '/partner/jobs/:id', meter: 'write',
    scope: 'jobs:write',
    summary: 'Update a role — close it, change the deadline, revise the description.',
    request: `{ "jobStatus": "closed" }`,
  },
  {
    method: 'GET', path: '/partner/jobs/:id/applicants', meter: 'read',
    scope: 'applications:read',
    summary: 'Everyone who applied to one role, with their AI match when screening is on.',
    response: `{
  "data": [{
    "id": "app_…",
    "status": "shortlisted",
    "appliedAt": "2026-08-24T10:12:00Z",
    "applicant": {
      "firstName": "Amara", "lastName": "Okafor",
      "email": "amara@example.com", "phoneNumber": "+234…",
      "professionalTitle": "Backend Engineer",
      "yearsOfExperience": 6,
      "skills": [ … ], "cvUrl": "https://…"
    },
    "aiMatch": { "score": 87, "autoRejectReason": null },
    "screeningAnswers": { … }
  }],
  "page": 1, "limit": 20, "total": 12
}`,
  },
  {
    method: 'GET', path: '/partner/applicants', meter: 'read',
    scope: 'applications:read',
    summary: 'Every applicant across all your jobs — the endpoint for a nightly sync.',
    query: '?updatedSince=2026-08-27T00:00:00Z&limit=100',
  },
  {
    method: 'GET', path: '/partner/applications/:id', meter: 'read',
    scope: 'applications:read',
    summary: 'A single application in full.',
  },
];

const EVENTS = [
  ['application.created', 'Someone applied. Carries the applicant, the job and the AI match.'],
  ['application.status_changed', 'You moved a candidate — includes previousStatus and status.'],
  ['application.withdrawn', 'A candidate pulled out.'],
  ['applicants.daily_digest', 'One roll-up at 06:00 of everything from the last 24 hours.'],
  ['job.published', 'A job went live, whether posted from our UI or the API.'],
  ['job.updated', 'A job post changed.'],
  ['job.closed', 'A job closed or expired.'],
  ['interview.scheduled', 'An interview was booked.'],
  ['ping', 'Sent when you press the test button.'],
];

export function DocsTab() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-5">
      {/* Quick start */}
      <SectionCard
        title="Base URL and authentication"
        description="Every request carries your key as a bearer token."
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-muted border border-border px-3 py-2 text-xs font-mono">{BASE}</code>
            <Button variant="ghost" size="sm" onClick={() => copy(BASE, 'base')}>
              {copied === 'base' ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <Code>{`curl ${BASE}/partner/whoami \\
  -H "Authorization: Bearer mw_live_xxxxxxxxxxxx"`}</Code>
          <p className="text-xs text-muted-foreground">
            Keys starting <code className="font-mono text-foreground">mw_test_</code> run against the
            sandbox: free, and writes are validated and echoed back without touching your live data.
            Swap in an <code className="font-mono text-foreground">mw_live_</code> key when you're ready.
          </p>
        </div>
      </SectionCard>

      {/* Endpoints */}
      <SectionCard title="Endpoints" description="Everything you can call from your system">
        <div className="space-y-3">
          {ENDPOINTS.map((e) => (
            <details key={e.method + e.path} className="group border border-border rounded-lg overflow-hidden">
              <summary className="flex items-center gap-2.5 p-3 cursor-pointer hover:bg-surface list-none">
                <MethodPill method={e.method} />
                <code className="text-xs font-mono text-foreground flex-1 min-w-0 truncate">{e.path}</code>
                <Badge variant={e.meter === 'write' ? 'warning' : 'secondary'} className="text-[10px] shrink-0">
                  {e.meter}
                </Badge>
              </summary>
              <div className="px-3 pb-3 space-y-2.5 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">{e.summary}</p>
                <p className="text-[11px] text-muted-foreground">
                  Requires scope <code className="font-mono text-foreground">{e.scope}</code>
                </p>
                {e.query && (
                  <div>
                    <p className="text-[11px] font-semibold text-foreground mb-1">Query</p>
                    <Code>{e.query}</Code>
                  </div>
                )}
                {e.request && (
                  <div>
                    <p className="text-[11px] font-semibold text-foreground mb-1">Request body</p>
                    <Code>{e.request}</Code>
                  </div>
                )}
                {e.response && (
                  <div>
                    <p className="text-[11px] font-semibold text-foreground mb-1">Response</p>
                    <Code>{e.response}</Code>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      </SectionCard>

      {/* Webhooks */}
      <SectionCard title="Webhook events" description="What we POST to your endpoint">
        <div className="divide-y divide-border">
          {EVENTS.map(([name, desc]) => (
            <div key={name} className="py-2.5 first:pt-0 last:pb-0">
              <code className="text-xs font-mono font-semibold text-primary">{name}</code>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-[11px] font-semibold text-foreground mb-1.5">Envelope</p>
          <Code>{`{
  "id": "evt_…",              // stable event id, safe to dedupe on
  "type": "application.created",
  "mode": "live",
  "createdAt": "2026-08-29T09:14:22.104Z",
  "data": { … }               // shape depends on type
}`}</Code>
        </div>
      </SectionCard>

      {/* Security */}
      <SectionCard title="Verifying a webhook" description="Reject anything that fails this check">
        <div className="space-y-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Every request carries <code className="font-mono text-foreground">Mune-Signature: t=&lt;unix&gt;,v1=&lt;hex&gt;</code>.
              The signature is HMAC-SHA256 of <code className="font-mono text-foreground">`${'{t}'}.${'{raw body}'}`</code> using
              your endpoint's signing secret. Compare in constant time, and reject anything older
              than five minutes to stop replays.
            </p>
          </div>
          <Code>{`const crypto = require('crypto');

app.post('/hooks/munework', express.raw({ type: 'application/json' }), (req, res) => {
  const [t, v1] = req.headers['mune-signature']
    .split(',').map(p => p.split('=')[1]);

  const expected = crypto
    .createHmac('sha256', process.env.MUNE_WEBHOOK_SECRET)
    .update(\`\${t}.\${req.body}\`)
    .digest('hex');

  const valid = crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
  const fresh = Math.abs(Date.now() / 1000 - Number(t)) < 300;
  if (!valid || !fresh) return res.status(400).end();

  const event = JSON.parse(req.body);
  // Respond 2xx fast, then process out of band.
  res.status(200).end();
});`}</Code>
        </div>
      </SectionCard>

      {/* Operational rules */}
      <div className="grid md:grid-cols-3 gap-3">
        <SectionCard title="Retries">
          <div className="flex items-start gap-2">
            <Repeat className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              A non-2xx or timeout is retried six times — 30s, 2m, 10m, 1h, 6h, 24h. Respond 2xx as
              soon as you've stored the event. After 15 consecutive failures the endpoint is disabled
              and we email you.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Idempotency">
          <div className="flex items-start gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Send <code className="font-mono text-foreground">Idempotency-Key</code> on writes. A
              repeat returns the original response, is not re-executed and is not charged again.
              Deduplicate incoming webhooks on the event <code className="font-mono text-foreground">id</code>.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Errors">
          <div className="flex items-start gap-2">
            <Lock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><code className="font-mono text-foreground">401</code> bad or revoked key</p>
              <p><code className="font-mono text-foreground">402</code> out of credit — top up</p>
              <p><code className="font-mono text-foreground">403</code> key lacks the scope</p>
              <p><code className="font-mono text-foreground">404</code> not yours, or gone</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Response headers" description="On every partner call">
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
          {[
            ['Mune-Request-Id', 'Quote this to support when something looks wrong'],
            ['Mune-Charge', 'What this call cost you'],
            ['Mune-Balance', 'Credit left after the call'],
            ['Mune-Idempotent-Replay', 'Present when a stored response was returned'],
          ].map(([h, d]) => (
            <div key={h} className={cn('flex flex-col')}>
              <code className="font-mono text-foreground text-[11px]">{h}</code>
              <span className="text-muted-foreground text-[11px]">{d}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
