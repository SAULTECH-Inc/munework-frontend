import { Repeat, ShieldCheck } from 'lucide-react';
import { Code, SectionCard } from './parts';

const EVENTS: Array<[string, string, string]> = [
  [
    'application.created',
    'Someone applied to one of your jobs.',
    'Carries the complete application, the applicant with their contact details and CV link, the job, and the AI match score when screening is on. This is the event most integrations need — it is everything you would otherwise poll for.',
  ],
  [
    'application.status_changed',
    'A candidate moved through your pipeline.',
    'Includes previousStatus and status, so you can mirror the move without re-fetching. Fires whether the change was made in our dashboard or by AI screening.',
  ],
  [
    'application.withdrawn',
    'A candidate pulled out.',
    'Remove them from your shortlist. The application stays readable via the API, marked withdrawn.',
  ],
  [
    'applicants.daily_digest',
    'One roll-up of everything from the last 24 hours, at 06:00.',
    'For integrations that would rather reconcile once a day than handle every application as it lands. Contains up to 500 applications with the same shape as application.created.',
  ],
  [
    'job.published',
    'A job went live.',
    'Fires whether you posted it through the API or someone posted it in our dashboard — so your system stays in step even when a colleague posts manually.',
  ],
  ['job.updated', 'A job posting changed.', 'The full job record after the change.'],
  ['job.closed', 'A job closed or reached its deadline.', 'Stop syncing applicants for it.'],
  [
    'interview.scheduled',
    'An interview was booked with a candidate.',
    'Includes the interview time, format and joining details alongside the application and job.',
  ],
  ['ping', 'A test event.', 'Sent when you press the send button on an endpoint above. Use it to prove your handler and signature check work before real events arrive.'],
];

const ENVELOPE = `{
  "id": "evt_7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "type": "application.created",
  "mode": "live",
  "createdAt": "2026-08-29T09:14:22.104Z",
  "data": {
    "application": {
      "id": "c1a5e2d4-9b8f-4c3a-8e7d-6f5a4b3c2d1e",
      "status": "pending",
      "appliedAt": "2026-08-29T09:14:21.980Z",
      "updatedAt": "2026-08-29T09:14:21.980Z",
      "isAutoApplied": false,
      "coverLetter": "I have spent six years on payment systems…",
      "screeningAnswers": {
        "Do you have Kafka experience?": "Yes, three years in production"
      },
      "job": {
        "id": "8f14e45f-ceea-467a-9b3c-1d2e3f4a5b6c",
        "title": "Senior Backend Engineer"
      },
      "applicant": {
        "id": "a7b8c9d0-1e2f-4a3b-8c7d-6e5f4a3b2c1d",
        "firstName": "Amara",
        "lastName": "Okafor",
        "email": "amara.okafor@example.com",
        "phoneNumber": "+2348012345678",
        "country": "Nigeria",
        "city": "Lagos",
        "linkedInProfile": "https://linkedin.com/in/amaraokafor",
        "githubProfile": "https://github.com/amaraokafor",
        "portfolioUrl": null,
        "professionalTitle": "Backend Engineer",
        "yearsOfExperience": 6,
        "skills": [
          { "name": "Node.js", "level": "expert" },
          { "name": "PostgreSQL", "level": "advanced" }
        ],
        "cvUrl": "https://res.cloudinary.com/…/amara-okafor-cv.pdf"
      },
      "aiMatch": {
        "score": 87,
        "autoRejectReason": null
      }
    },
    "job": {
      "id": "8f14e45f-ceea-467a-9b3c-1d2e3f4a5b6c",
      "title": "Senior Backend Engineer",
      "company": "Paystack",
      "location": "Lagos, Nigeria",
      "status": "posted",
      "employmentType": "hybrid",
      "level": "senior",
      "salaryRange": {
        "min": 900000, "max": 1400000,
        "currency": "NGN", "frequency": "monthly"
      }
    }
  }
}`;

const VERIFY = `const crypto = require('crypto');

// express.raw gives you the exact bytes we signed — do not use a parsed body.
app.post('/hooks/munework',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];
    const requestId = req.headers['x-request-id'];

    const bodyHash = crypto.createHash('sha256').update(req.body).digest('hex');
    const canonical = [
      'POST',
      '/hooks/munework',   // the path we deliver to
      timestamp,
      requestId,
      bodyHash,
    ].join('\\n');

    const expected = crypto
      .createHmac('sha256', process.env.MUNE_WEBHOOK_SECRET)
      .update(canonical)
      .digest('hex');

    const valid = expected.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    const fresh = Math.abs(Date.now() / 1000 - Number(timestamp)) < 300;

    if (!valid || !fresh) return res.status(400).end();

    const event = JSON.parse(req.body);

    // Deduplicate on event.id — a retry delivers the same id.
    if (alreadyHandled(event.id)) return res.status(200).end();

    res.status(200).end();   // acknowledge fast
    process(event);          // then do the slow work
  });`;

/** Reference material for the direction where we are the caller. */
export function WebhookReference() {
  return (
    <div className="space-y-4">
      <SectionCard
        title="Events we send"
        description="Subscribe an endpoint to any of these, or leave the list empty to receive everything."
      >
        <div className="space-y-3">
          {EVENTS.map(([name, summary, detail]) => (
            <div key={name} className="pb-3 border-b border-border last:border-0 last:pb-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <code className="text-xs font-mono font-bold text-primary">{name}</code>
                <span className="text-xs font-medium text-foreground">{summary}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{detail}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="What a delivery looks like"
        description="Every event has the same envelope; only data changes shape."
      >
        <Code label="POST to your endpoint">{ENVELOPE}</Code>
        <div className="mt-3 space-y-1.5 text-[11px]">
          {[
            ['X-SIGNATURE', 'HMAC-SHA256 over the canonical string, keyed with this endpoint’s signing secret'],
            ['X-TIMESTAMP', 'Unix seconds when we sent it — reject anything older than 300 seconds'],
            ['X-REQUEST-ID', 'The delivery id; the same event retried keeps the same event id but gets a new delivery id'],
            ['X-EVENT-ID', 'Stable event id — deduplicate on this'],
            ['X-EVENT-TYPE', 'Same as type in the body, so you can route before parsing'],
          ].map(([h, d]) => (
            <div key={h} className="flex gap-2">
              <code className="font-mono text-foreground shrink-0">{h}</code>
              <span className="text-muted-foreground">{d}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Verifying a delivery"
        description="Reject anything that fails this check — it did not come from us."
      >
        <div className="flex items-start gap-2.5 mb-3">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your endpoint URL is public, so anyone could POST to it. The signature is what proves a request
            is genuinely ours. It is the same construction you use for your outbound calls — method, path,
            timestamp, request id and a hash of the body — so one verification routine covers both
            directions.
          </p>
        </div>
        <Code label="node.js">{VERIFY}</Code>
      </SectionCard>

      <SectionCard title="Retries and failure" description="What happens when your endpoint is down.">
        <div className="flex items-start gap-2.5">
          <Repeat className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed space-y-1.5">
            <p>
              Anything other than a 2xx, or a response slower than 10 seconds, is retried six times:
              after 30 seconds, 2 minutes, 10 minutes, 1 hour, 6 hours, then 24 hours. Acknowledge with a
              2xx as soon as you have stored the event and do your processing afterwards — a slow handler
              looks like a failure and earns a pointless retry.
            </p>
            <p>
              After 15 consecutive failures we disable the endpoint and email you. Nothing is lost: fix
              your side, re-enable it here, and replay any delivery from its log.
            </p>
            <p>
              Only successful live deliveries are billed. Retries, failures and every test-mode delivery
              are free.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
