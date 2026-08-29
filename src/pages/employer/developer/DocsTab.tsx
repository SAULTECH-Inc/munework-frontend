import { ArrowRight, ChevronDown, KeyRound, Lock, Repeat, ShieldCheck, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Code, MethodPill, SectionCard } from './parts';
import { ENDPOINTS, ERROR_CODES, REQUEST_HEADERS, RESPONSE_HEADERS, SCOPES } from './api-reference';

// Same source the API client uses, so the docs always show the real base URL.
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1';
const BASE = RAW_BASE.startsWith('http') ? RAW_BASE : `${window.location.origin}${RAW_BASE}`;

const NODE_CLIENT = `const crypto = require('crypto');

const KEY_ID = process.env.MUNE_KEY_ID;          // mw_live_…  (public)
const SECRET = process.env.MUNE_SIGNING_SECRET;  // mws_live_… (never sent)
const BASE   = '${BASE}';

async function mune(method, path, body) {
  const payload    = body ? JSON.stringify(body) : '';
  const timestamp  = Math.floor(Date.now() / 1000).toString();
  const requestId  = crypto.randomUUID();
  const bodyHash   = crypto.createHash('sha256').update(payload).digest('hex');

  // Order matters. Each line is separated by a single \\n.
  const canonical = [
    method.toUpperCase(),
    new URL(BASE + path).pathname,
    timestamp,
    requestId,
    bodyHash,
  ].join('\\n');

  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(canonical)
    .digest('hex');

  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type':  'application/json',
      'X-API-KEY':     KEY_ID,
      'X-TIMESTAMP':   timestamp,
      'X-REQUEST-ID':  requestId,
      'X-SIGNATURE':   signature,
    },
    body: payload || undefined,
  });

  console.log('cost', res.headers.get('Mune-Charge'),
              'balance', res.headers.get('Mune-Balance'));

  if (!res.ok) throw new Error(\`\${res.status} \${await res.text()}\`);
  return res.json();
}

// Start here — if this returns 200 your signing is correct.
mune('GET', '/partner/whoami').then(console.log);`;

const PYTHON_CLIENT = `import hashlib, hmac, json, time, uuid, requests
from urllib.parse import urlparse

KEY_ID = os.environ["MUNE_KEY_ID"]          # mw_live_…  (public)
SECRET = os.environ["MUNE_SIGNING_SECRET"]  # mws_live_… (never sent)
BASE   = "${BASE}"

def mune(method, path, body=None):
    payload    = json.dumps(body) if body else ""
    timestamp  = str(int(time.time()))
    request_id = str(uuid.uuid4())
    body_hash  = hashlib.sha256(payload.encode()).hexdigest()

    canonical = "\\n".join([
        method.upper(),
        urlparse(BASE + path).path,
        timestamp,
        request_id,
        body_hash,
    ])

    signature = hmac.new(
        SECRET.encode(), canonical.encode(), hashlib.sha256
    ).hexdigest()

    res = requests.request(method, BASE + path,
        data=payload or None,
        headers={
            "Content-Type":  "application/json",
            "X-API-KEY":     KEY_ID,
            "X-TIMESTAMP":   timestamp,
            "X-REQUEST-ID":  request_id,
            "X-SIGNATURE":   signature,
        })
    res.raise_for_status()
    return res.json()

print(mune("GET", "/partner/whoami"))`;

const CANONICAL = `METHOD          POST
PATH            /api/v1/partner/jobs
TIMESTAMP       1756468800
REQUEST_ID      req_9f1c2b70-6f4e-4a1e-9f0c-2a7d3e5b8c11
SHA256(body)    e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855

joined with "\\n" becomes the string you HMAC:

POST\\n/api/v1/partner/jobs\\n1756468800\\nreq_9f1c2b70-…\\ne3b0c442…`;

export function DocsTab() {
  return (
    <div className="space-y-5">
      {/* Direction banner */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <ArrowRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h2 className="text-base font-bold text-foreground font-['Outfit',sans-serif]">
            You call us — the Mune Work API
          </h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Everything on this page is something <span className="text-foreground font-semibold">your system
            initiates</span>: posting a job from your ATS, pulling applicants with their AI match, checking
            whether a role is still open. For events we push to you the moment they happen, see the{' '}
            <span className="text-foreground font-semibold">Webhooks</span> tab.
          </p>
        </div>
      </div>

      {/* Getting started */}
      <SectionCard
        title="Getting started"
        description="Four steps from nothing to your first successful call."
      >
        <ol className="space-y-3 text-sm">
          {[
            ['Create a test key', 'Go to the API keys tab and create a key in test mode. You get two values: a key id and a signing secret. Copy the secret now — we cannot show it again.'],
            ['Sign a request', 'Copy the client below into your codebase. It builds the canonical string, signs it, and sets the four required headers.'],
            ['Call /partner/whoami', 'If it returns 200, your signing is correct and every other endpoint will work the same way. If not, the error message names the exact problem.'],
            ['Switch to live', 'Create a live key and swap the two environment variables. Live keys write real data and draw on your credit balance; test keys stay free forever.'],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-3">
              <span className="shrink-0 h-6 w-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-foreground">{title}</p>
                <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <p className="text-xs font-semibold text-foreground">Base URL</p>
          <Code>{BASE}</Code>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Test-mode keys run against a sandbox: writes are fully validated and echoed back to you, but
            nothing is stored and no candidate ever sees them. Reads return your real data. Nothing in test
            mode is ever charged.
          </p>
        </div>
      </SectionCard>

      {/* Authentication */}
      <SectionCard
        title="Authentication"
        description="Your secret never leaves your server. Every request is signed instead."
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-lg bg-surface border border-border p-3">
            <KeyRound className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed space-y-1.5">
              <p>
                A key is a <span className="text-foreground font-semibold">pair</span>. The
                <code className="font-mono text-foreground mx-1">key id</code>
                identifies you and is sent on every request — it is safe in logs. The
                <code className="font-mono text-foreground mx-1">signing secret</code>
                never travels: you use it to compute a signature, and we recompute the same signature
                on our side to check it matches.
              </p>
              <p>
                This is why a captured request is useless to an attacker. It proves who sent the request,
                proves the body was not altered in transit, and cannot be reused for a different call.
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground mb-1.5">What you sign</p>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              Five values, in this order, joined with newlines. Binding the method and path means a
              signature stolen from a harmless read cannot be replayed against a write; hashing the body
              means nothing in it can be changed after you sign.
            </p>
            <Code label="canonical string">{CANONICAL}</Code>
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground mb-1.5">Working client</p>
            <Code label="node.js">{NODE_CLIENT}</Code>
          </div>
          <div>
            <Code label="python">{PYTHON_CLIENT}</Code>
          </div>
        </div>
      </SectionCard>

      {/* Request headers */}
      <SectionCard title="Request headers" description="Sent on every call to the partner API.">
        <div className="space-y-3">
          {REQUEST_HEADERS.map((h) => (
            <div key={h.name} className="pb-3 border-b border-border last:border-0 last:pb-0">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-xs font-mono font-bold text-foreground">{h.name}</code>
                <Badge variant={h.required ? 'default' : 'outline'} className="text-[10px]">
                  {h.required ? 'required' : 'optional'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{h.description}</p>
              <code className="text-[11px] font-mono text-primary/80 mt-1 block break-all">{h.example}</code>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Scopes */}
      <SectionCard
        title="Scopes"
        description="Attached to the key, not sent with the request."
      >
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          You do not send scopes anywhere. You choose them when you create a key, and they are fixed for
          that key's lifetime — so a key that can only read can never be tricked into writing, no matter
          what a caller does. If a key is missing a scope the call returns{' '}
          <code className="font-mono text-foreground">403</code> and names the one it needed. To change
          scopes, create a new key or rotate the existing one.
        </p>
        <div className="space-y-2.5">
          {SCOPES.map(([name, what, where]) => (
            <div key={name} className="rounded-lg border border-border p-2.5">
              <code className="text-xs font-mono font-bold text-primary">{name}</code>
              <p className="text-xs text-muted-foreground mt-0.5">{what}</p>
              <p className="text-[11px] font-mono text-muted-foreground/70 mt-1">{where}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Endpoints */}
      <SectionCard
        title="Endpoints"
        description="Every response below is a complete example — what you receive will have these exact fields."
      >
        <div className="space-y-3">
          {ENDPOINTS.map((e) => (
            <details key={e.method + e.path} className="group rounded-lg border border-border overflow-hidden">
              <summary className="p-3.5 cursor-pointer hover:bg-surface list-none">
                <div className="flex items-start gap-3">
                  <MethodPill method={e.method} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{e.title}</p>
                      <Badge variant={e.meter === 'write' ? 'warning' : 'secondary'} className="text-[10px]">
                        {e.meter}
                      </Badge>
                    </div>
                    <code className="text-[11px] font-mono text-muted-foreground block mt-0.5">{e.path}</code>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{e.summary}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-180" />
                </div>
              </summary>

              <div className="px-3.5 pb-3.5 pt-3 space-y-3 border-t border-border bg-surface/50">
                <p className="text-xs text-foreground/80 leading-relaxed">{e.detail}</p>

                <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px]">
                  <span className="text-muted-foreground">
                    Scope <code className="font-mono text-foreground">{e.scope}</code>
                  </span>
                  <span className="text-muted-foreground">
                    Headers <code className="font-mono text-foreground">X-API-KEY</code>,{' '}
                    <code className="font-mono text-foreground">X-TIMESTAMP</code>,{' '}
                    <code className="font-mono text-foreground">X-REQUEST-ID</code>,{' '}
                    <code className="font-mono text-foreground">X-SIGNATURE</code>
                    {e.meter === 'write' && <>, <code className="font-mono text-foreground">Idempotency-Key</code></>}
                  </span>
                </div>

                {e.query && (
                  <div>
                    <p className="text-[11px] font-semibold text-foreground mb-1.5">Query parameters</p>
                    <div className="space-y-1.5">
                      {e.query.map((q) => (
                        <div key={q.name} className="flex gap-2 text-[11px]">
                          <code className="font-mono text-foreground shrink-0">{q.name}</code>
                          <span className="text-muted-foreground/60 shrink-0">{q.type}</span>
                          <span className="text-muted-foreground">{q.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {e.requestBody && (
                  <div>
                    <p className="text-[11px] font-semibold text-foreground mb-1">Request body</p>
                    {e.requestNotes && (
                      <p className="text-[11px] text-muted-foreground mb-1.5 leading-relaxed">{e.requestNotes}</p>
                    )}
                    <Code label="request">{e.requestBody}</Code>
                  </div>
                )}

                <div>
                  <p className="text-[11px] font-semibold text-foreground mb-1">Response — 200</p>
                  <Code label="response">{e.response}</Code>
                  {e.responseNotes && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{e.responseNotes}</p>
                  )}
                </div>

                {e.errors && (
                  <div>
                    <p className="text-[11px] font-semibold text-foreground mb-1.5">Errors specific to this endpoint</p>
                    <div className="space-y-1">
                      {e.errors.map(([code, desc]) => (
                        <div key={code} className="flex gap-2 text-[11px]">
                          <code className="font-mono text-destructive shrink-0 w-8">{code}</code>
                          <span className="text-muted-foreground">{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      </SectionCard>

      {/* Response headers */}
      <SectionCard title="Response headers" description="Returned on every call, including failures.">
        <div className="space-y-3">
          {RESPONSE_HEADERS.map((h) => (
            <div key={h.name} className="pb-3 border-b border-border last:border-0 last:pb-0">
              <code className="text-xs font-mono font-bold text-foreground">{h.name}</code>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{h.description}</p>
              <code className="text-[11px] font-mono text-primary/80 mt-1 block">{h.example}</code>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Status codes */}
      <SectionCard title="Status codes" description="What each one means and what to do about it.">
        <div className="space-y-2">
          {ERROR_CODES.map(([code, name, meaning]) => (
            <div key={code} className="flex gap-3 pb-2 border-b border-border last:border-0 last:pb-0">
              <code className={`font-mono text-xs font-bold shrink-0 w-9 ${
                code.startsWith('2') ? 'text-success' : code.startsWith('4') ? 'text-warning' : 'text-destructive'
              }`}>
                {code}
              </code>
              <div>
                <p className="text-xs font-semibold text-foreground">{name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{meaning}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Operational rules */}
      <div className="grid md:grid-cols-3 gap-3">
        <SectionCard title="Retrying safely">
          <div className="flex items-start gap-2">
            <Repeat className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Put an <code className="font-mono text-foreground">Idempotency-Key</code> on every write. If a
              retry reaches us after the first attempt already succeeded, we return the original response
              rather than creating a duplicate — and you are not charged a second time.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Clock drift">
          <div className="flex items-start gap-2">
            <Timer className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              We accept a timestamp within 300 seconds of ours. If you see 401s mentioning the window,
              your server clock has drifted — run NTP. Generate a fresh
              <code className="font-mono text-foreground mx-1">X-REQUEST-ID</code>
              per attempt, including retries, or the second one is rejected as a replay.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Keeping keys safe">
          <div className="flex items-start gap-2">
            <Lock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Keep the signing secret in your secret manager, never in source control or a browser. Pin an
              IP allowlist on live keys. Rotate on a schedule — rotation issues a new pair and revokes the
              old one in one step.
            </p>
          </div>
        </SectionCard>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3.5">
        <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="text-foreground font-semibold">Why not encrypt the payload?</span> Transport is
          already encrypted by TLS, so encrypting the body again would add key distribution and rotation
          problems without closing a real gap — and it would make your own logs unreadable. What actually
          matters is proving who sent a request and that it was not altered or replayed, which is exactly
          what the signature does. Your signing secret is itself stored encrypted with AES-256-GCM on our
          side, under a key held outside the database.
        </p>
      </div>
    </div>
  );
}
