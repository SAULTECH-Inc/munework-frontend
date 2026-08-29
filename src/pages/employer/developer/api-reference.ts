/**
 * The reference the documentation tab renders. Kept as data so an endpoint is
 * described once, completely — responses here are full examples, not excerpts,
 * because an integrator needs to see every field they will actually receive.
 */

export interface HeaderSpec {
  name: string;
  required: boolean;
  description: string;
  example: string;
}

export interface EndpointSpec {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  title: string;
  /** Shown before the endpoint is expanded, so the list is scannable. */
  summary: string;
  /** The longer explanation, shown once expanded. */
  detail: string;
  scope: string;
  meter: 'read' | 'write';
  query?: Array<{ name: string; type: string; description: string }>;
  requestBody?: string;
  requestNotes?: string;
  response: string;
  responseNotes?: string;
  errors?: Array<[string, string]>;
}

/** Sent on every request to the partner API. */
export const REQUEST_HEADERS: HeaderSpec[] = [
  {
    name: 'X-API-KEY',
    required: true,
    description:
      'Your key id. This is a public identifier — it is safe in logs and in transit, and on its own it cannot authorise anything.',
    example: 'mw_live_7940ae7ed49431897d826694',
  },
  {
    name: 'X-TIMESTAMP',
    required: true,
    description:
      'Unix time in seconds when you built the request. We reject anything more than 300 seconds from our clock, which is what stops an old captured request being resent.',
    example: '1756468800',
  },
  {
    name: 'X-REQUEST-ID',
    required: true,
    description:
      'A value unique to this request — a UUID is ideal. We record it and refuse a second request that reuses it, so a captured request cannot be replayed even inside the time window. It is also echoed back so you can correlate our logs with yours.',
    example: 'req_9f1c2b70-6f4e-4a1e-9f0c-2a7d3e5b8c11',
  },
  {
    name: 'X-SIGNATURE',
    required: true,
    description:
      'HMAC-SHA256 of the canonical string below, keyed with your signing secret, hex encoded. This proves the request came from you and that nobody altered it on the way.',
    example: '4c9b1e…（64 hex characters）',
  },
  {
    name: 'X-EMPLOYER-ID',
    required: false,
    description:
      'Your employer id. Optional, but if you send it we check it matches the key and refuse the call otherwise — a cheap guard against a staging key being pointed at production by mistake.',
    example: 'd219fd91-ea01-43af-9790-25eddfea428b',
  },
  {
    name: 'Idempotency-Key',
    required: false,
    description:
      'On writes only. If you retry with the same value, we return the original response instead of creating a second record, and you are not charged twice.',
    example: 'job-create-2026-08-29-001',
  },
];

/** Returned on every response from the partner API. */
export const RESPONSE_HEADERS: HeaderSpec[] = [
  {
    name: 'Mune-Request-Id',
    required: true,
    description: 'The id we logged this call under. Quote it to support and we can find the exact request.',
    example: 'req_9f1c2b70-…',
  },
  {
    name: 'Mune-Charge',
    required: true,
    description: 'What this call cost. Zero for test-mode keys and for calls that failed.',
    example: '10',
  },
  {
    name: 'Mune-Balance',
    required: true,
    description: 'Credit remaining after the call, so you can alert on it without polling the wallet endpoint.',
    example: '4870',
  },
  {
    name: 'Mune-Idempotent-Replay',
    required: false,
    description: 'Present and true when we returned a stored response rather than performing the write again.',
    example: 'true',
  },
];

export const ENDPOINTS: EndpointSpec[] = [
  {
    method: 'GET',
    path: '/partner/whoami',
    title: 'Verify your credentials',
    summary: 'Confirms your key, signature and clock are all correct before you build anything else.',
    detail:
      'Start here. If this returns 200 your signing implementation is right, and every other endpoint will authenticate the same way. If it returns 401 the message tells you which part failed — the signature, the timestamp window or the key itself.',
    scope: 'jobs:read',
    meter: 'read',
    response: `{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "employerId": "d219fd91-ea01-43af-9790-25eddfea428b",
    "mode": "live",
    "scopes": ["jobs:read", "jobs:write", "applications:read"],
    "keyName": "Production server"
  }
}`,
    responseNotes:
      '"mode" tells you whether this key writes real data. A test key returns "test" and every write it makes is simulated.',
  },
  {
    method: 'POST',
    path: '/partner/jobs',
    title: 'Post a job',
    summary: 'Publishes a role from your own system. It appears on Mune Work immediately and starts matching candidates.',
    detail:
      'The job is created against the employer that owns the API key — you never send an employer id in the body, and you cannot post on behalf of anyone else. As soon as it is live, our matching engine scores it against every applicant profile and alerts strong matches, and a job.published webhook fires to your endpoints.',
    scope: 'jobs:write',
    meter: 'write',
    requestNotes:
      'Only title, description, location, jobType and endDate are required. Everything else improves match quality — a job with a salary range and a skill list attracts markedly better candidates.',
    requestBody: `{
  "title": "Senior Backend Engineer",
  "description": "<p>Own the payments ledger and the services behind it.</p>",
  "requirements": "5+ years with Node.js and PostgreSQL",
  "responsibility": "Design APIs consumed by thousands of merchants",
  "department": "Engineering",
  "location": "Lagos, Nigeria",
  "jobType": "full_time",
  "employmentType": "hybrid",
  "level": "senior",
  "experienceYears": 5,
  "skillSet": ["Node.js", "PostgreSQL", "Kafka", "AWS"],
  "salaryRange": {
    "min": 900000,
    "max": 1400000,
    "currency": "NGN",
    "frequency": "monthly"
  },
  "startDate": "2026-09-01",
  "endDate": "2026-10-01",
  "preferredCountries": ["Nigeria", "Ghana"],
  "applicationMethod": {
    "byCv": true,
    "byProfile": true,
    "byCoverLetter": false,
    "byPortfolio": false,
    "byVideo": false
  },
  "aiSettings": {
    "autoRejectEnabled": true,
    "minMatchScore": 60,
    "autoShortlistEnabled": true,
    "shortlistThreshold": 80
  }
}`,
    response: `{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "job": {
      "id": "8f14e45f-ceea-467a-9b3c-1d2e3f4a5b6c",
      "title": "Senior Backend Engineer",
      "company": "Paystack",
      "department": "Engineering",
      "description": "<p>Own the payments ledger and the services behind it.</p>",
      "requirements": "5+ years with Node.js and PostgreSQL",
      "responsibility": "Design APIs consumed by thousands of merchants",
      "location": "Lagos, Nigeria",
      "jobType": "full_time",
      "employmentType": "hybrid",
      "level": "senior",
      "status": "posted",
      "experienceYears": 5,
      "skillSet": ["Node.js", "PostgreSQL", "Kafka", "AWS"],
      "salaryRange": {
        "min": 900000,
        "max": 1400000,
        "currency": "NGN",
        "frequency": "monthly"
      },
      "startDate": "2026-09-01",
      "endDate": "2026-10-01",
      "applicationMethod": {
        "byCv": true,
        "byProfile": true,
        "byCoverLetter": false,
        "byPortfolio": false,
        "byVideo": false
      },
      "aiScreening": {
        "autoRejectEnabled": true,
        "minMatchScore": 60,
        "autoShortlistEnabled": true,
        "shortlistThreshold": 80
      },
      "viewCount": 0,
      "createdAt": "2026-08-29T09:14:22.104Z",
      "updatedAt": "2026-08-29T09:14:22.104Z"
    }
  }
}`,
    responseNotes:
      'Store "id" — you need it to fetch applicants, update the post or close it. With a test key you instead get { "simulated": true, … } and nothing is written.',
    errors: [
      ['400', 'A required field is missing or a value is not one of the accepted options.'],
      ['403', 'This key does not hold jobs:write.'],
      ['409', 'You already have a job with this title, company, location and start date.'],
    ],
  },
  {
    method: 'GET',
    path: '/partner/jobs',
    title: 'List your jobs',
    summary: 'Every job on your account, newest first. Filter by status, or pull only what changed since your last sync.',
    detail:
      'This is the endpoint to poll if you keep a local copy of your postings. Pass updatedSince with the timestamp of your previous run and you only pay for what actually changed, rather than re-reading the whole list.',
    scope: 'jobs:read',
    meter: 'read',
    query: [
      { name: 'page', type: 'number', description: 'Defaults to 1.' },
      { name: 'limit', type: 'number', description: 'Defaults to 20, maximum 100.' },
      { name: 'status', type: 'string', description: 'draft, posted, closed, expired, filled.' },
      { name: 'updatedSince', type: 'ISO 8601', description: 'Only jobs changed after this instant.' },
    ],
    response: `{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "data": [
      {
        "id": "8f14e45f-ceea-467a-9b3c-1d2e3f4a5b6c",
        "title": "Senior Backend Engineer",
        "company": "Paystack",
        "department": "Engineering",
        "location": "Lagos, Nigeria",
        "jobType": "full_time",
        "employmentType": "hybrid",
        "level": "senior",
        "status": "posted",
        "experienceYears": 5,
        "skillSet": ["Node.js", "PostgreSQL"],
        "salaryRange": {
          "min": 900000, "max": 1400000,
          "currency": "NGN", "frequency": "monthly"
        },
        "startDate": "2026-09-01",
        "endDate": "2026-10-01",
        "viewCount": 143,
        "createdAt": "2026-08-20T11:02:00.000Z",
        "updatedAt": "2026-08-28T16:45:10.220Z"
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 34
  }
}`,
    responseNotes: 'Keep paging while page × limit is less than total.',
  },
  {
    method: 'GET',
    path: '/partner/jobs/:id',
    title: 'Fetch one job',
    summary: 'The full record for a single posting, including its AI screening settings and current status.',
    detail:
      'Use this to confirm a job you posted is live, or to check whether it has been closed or has expired. Returns 404 if the job belongs to another employer, so an id from elsewhere reveals nothing.',
    scope: 'jobs:read',
    meter: 'read',
    response: `{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "job": {
      "id": "8f14e45f-ceea-467a-9b3c-1d2e3f4a5b6c",
      "title": "Senior Backend Engineer",
      "company": "Paystack",
      "status": "posted",
      "location": "Lagos, Nigeria",
      "jobType": "full_time",
      "employmentType": "hybrid",
      "level": "senior",
      "experienceYears": 5,
      "skillSet": ["Node.js", "PostgreSQL", "Kafka"],
      "salaryRange": {
        "min": 900000, "max": 1400000,
        "currency": "NGN", "frequency": "monthly"
      },
      "startDate": "2026-09-01",
      "endDate": "2026-10-01",
      "aiScreening": {
        "autoRejectEnabled": true,
        "minMatchScore": 60,
        "autoShortlistEnabled": true,
        "shortlistThreshold": 80
      },
      "viewCount": 143,
      "createdAt": "2026-08-20T11:02:00.000Z",
      "updatedAt": "2026-08-28T16:45:10.220Z"
    }
  }
}`,
  },
  {
    method: 'PATCH',
    path: '/partner/jobs/:id',
    title: 'Update or close a job',
    summary: 'Change any field on a posting, or close it when the role is filled.',
    detail:
      'Send only the fields you want to change; everything omitted is left alone. Closing a job stops new applications immediately and fires a job.closed webhook. Candidates who already applied keep their applications.',
    scope: 'jobs:write',
    meter: 'write',
    requestBody: `{
  "jobStatus": "closed",
  "endDate": "2026-09-15"
}`,
    response: `{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "job": {
      "id": "8f14e45f-ceea-467a-9b3c-1d2e3f4a5b6c",
      "title": "Senior Backend Engineer",
      "status": "closed",
      "endDate": "2026-09-15",
      "updatedAt": "2026-08-29T10:31:44.881Z"
    }
  }
}`,
  },
  {
    method: 'GET',
    path: '/partner/jobs/:id/applicants',
    title: 'Applicants for one job',
    summary: 'Everyone who applied to a role, with their contact details, CV and AI match score.',
    detail:
      'The AI match block is included whenever screening is enabled on the job — score is 0-100 on the same scale your dashboard shows, and autoRejectReason explains why a candidate was filtered out. This is the endpoint to pull a shortlist straight into your ATS.',
    scope: 'applications:read',
    meter: 'read',
    query: [
      { name: 'page', type: 'number', description: 'Defaults to 1.' },
      { name: 'limit', type: 'number', description: 'Defaults to 20, maximum 100.' },
      { name: 'status', type: 'string', description: 'pending, under_review, shortlisted, rejected, interview_scheduled, hired.' },
      { name: 'updatedSince', type: 'ISO 8601', description: 'Only applications changed after this instant.' },
    ],
    response: `{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "data": [
      {
        "id": "c1a5e2d4-9b8f-4c3a-8e7d-6f5a4b3c2d1e",
        "status": "shortlisted",
        "appliedAt": "2026-08-24T10:12:00.000Z",
        "updatedAt": "2026-08-27T14:02:11.000Z",
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
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 12,
    "job": {
      "id": "8f14e45f-ceea-467a-9b3c-1d2e3f4a5b6c",
      "title": "Senior Backend Engineer",
      "status": "posted"
    }
  }
}`,
    responseNotes:
      'aiMatch.score is null when screening was never run for that application. autoRejectReason is one of experience_too_low, missing_critical_skills, education_mismatch, location_incompatible or salary_mismatch.',
  },
  {
    method: 'GET',
    path: '/partner/applicants',
    title: 'All applicants across your jobs',
    summary: 'One feed of every application on your account — the endpoint for a nightly sync.',
    detail:
      'Same shape as the per-job list, but spanning every posting, with the job attached to each row. Combine updatedSince with limit=100 and you can mirror your whole pipeline in a handful of calls.',
    scope: 'applications:read',
    meter: 'read',
    query: [
      { name: 'page', type: 'number', description: 'Defaults to 1.' },
      { name: 'limit', type: 'number', description: 'Defaults to 20, maximum 100.' },
      { name: 'status', type: 'string', description: 'Filter by application status.' },
      { name: 'updatedSince', type: 'ISO 8601', description: 'Only applications changed after this instant.' },
    ],
    response: `{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "data": [
      {
        "id": "c1a5e2d4-9b8f-4c3a-8e7d-6f5a4b3c2d1e",
        "status": "pending",
        "appliedAt": "2026-08-29T08:41:02.000Z",
        "updatedAt": "2026-08-29T08:41:02.000Z",
        "isAutoApplied": true,
        "coverLetter": null,
        "screeningAnswers": null,
        "job": {
          "id": "8f14e45f-ceea-467a-9b3c-1d2e3f4a5b6c",
          "title": "Senior Backend Engineer"
        },
        "applicant": {
          "id": "a7b8c9d0-1e2f-4a3b-8c7d-6e5f4a3b2c1d",
          "firstName": "Chidi",
          "lastName": "Nwosu",
          "email": "chidi.nwosu@example.com",
          "phoneNumber": "+2348098765432",
          "country": "Nigeria",
          "city": "Abuja",
          "linkedInProfile": null,
          "githubProfile": "https://github.com/chidinwosu",
          "portfolioUrl": null,
          "professionalTitle": "Software Engineer",
          "yearsOfExperience": 4,
          "skills": [{ "name": "Go", "level": "advanced" }],
          "cvUrl": "https://res.cloudinary.com/…/chidi-nwosu-cv.pdf"
        },
        "aiMatch": {
          "score": 64,
          "autoRejectReason": null
        }
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 218
  }
}`,
  },
  {
    method: 'GET',
    path: '/partner/applications/:id',
    title: 'Fetch one application',
    summary: 'A single application in full, when you already have its id from a webhook.',
    detail:
      'The application.created webhook gives you the whole record already, so you rarely need this — it exists for reconciling a specific application, or re-fetching one after your own processing failed.',
    scope: 'applications:read',
    meter: 'read',
    response: `{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "application": {
      "id": "c1a5e2d4-9b8f-4c3a-8e7d-6f5a4b3c2d1e",
      "status": "interview_scheduled",
      "appliedAt": "2026-08-24T10:12:00.000Z",
      "updatedAt": "2026-08-29T09:00:00.000Z",
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
        "skills": [{ "name": "Node.js", "level": "expert" }],
        "cvUrl": "https://res.cloudinary.com/…/amara-okafor-cv.pdf"
      },
      "aiMatch": {
        "score": 87,
        "autoRejectReason": null
      }
    }
  }
}`,
  },
];

export const SCOPES = [
  ['jobs:read', 'List and fetch your job postings.', 'GET /partner/jobs, GET /partner/jobs/:id, GET /partner/whoami'],
  ['jobs:write', 'Create and update job postings.', 'POST /partner/jobs, PATCH /partner/jobs/:id'],
  ['applications:read', 'Read applicants and their AI match.', 'GET /partner/jobs/:id/applicants, GET /partner/applicants, GET /partner/applications/:id'],
  ['applications:write', 'Reserved for moving candidates through your pipeline from your own system.', 'Not yet used'],
  ['webhooks:read', 'Read your webhook delivery history.', 'Reserved'],
];

export const ERROR_CODES: Array<[string, string, string]> = [
  ['200', 'Success', 'The call worked. Check Mune-Charge for what it cost.'],
  ['400', 'Bad request', 'A field is missing or invalid. The message names the field.'],
  ['401', 'Unauthorised', 'Missing, wrong or replayed signature, an unknown key, or your clock is out of step. The message says which.'],
  ['402', 'Payment required', 'Out of API credit. Top up in Usage & billing — nothing was performed and you were not charged.'],
  ['403', 'Forbidden', 'The key lacks the scope for this endpoint, the calling IP is not allowlisted, or X-EMPLOYER-ID does not match.'],
  ['404', 'Not found', 'No such record, or it belongs to another employer. We do not distinguish the two, by design.'],
  ['409', 'Conflict', 'A duplicate — most often a job that already exists with the same title, company, location and start date.'],
  ['429', 'Too many requests', 'You are over the rate limit. Back off and retry.'],
  ['500', 'Server error', 'Our fault. Safe to retry with the same Idempotency-Key.'],
];
