import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, Plus, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import MultiSelect, { type SelectOption } from '@/components/ui/multi-select';
import {
  Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Field } from './parts';
import { developerApi } from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';
import toast from 'react-hot-toast';

const SCOPES: SelectOption[] = [
  { value: 'jobs:read',          label: 'jobs:read — list and fetch jobs' },
  { value: 'jobs:write',         label: 'jobs:write — create and update jobs' },
  { value: 'applications:read',  label: 'applications:read — read applicants' },
  { value: 'applications:write', label: 'applications:write — update applications' },
  { value: 'webhooks:read',      label: 'webhooks:read — read delivery history' },
];

export function ApiKeysTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [live, setLive] = useState(false);
  const [scopes, setScopes] = useState<SelectOption[]>(SCOPES.slice(0, 3));
  const [allowedIps, setAllowedIps] = useState('');
  const [issued, setIssued] = useState<{ keyId: string; signingSecret: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['developer-keys'],
    queryFn: () => developerApi.listKeys().then((r) => r.data?.data ?? r.data),
  });
  const keys: any[] = Array.isArray(data) ? data : [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['developer-keys'] });

  const create = useMutation({
    mutationFn: () =>
      developerApi
        .createKey({
          name,
          mode: live ? 'live' : 'test',
          scopes: scopes.map((s) => s.value),
          allowedIps: allowedIps.split(',').map((s) => s.trim()).filter(Boolean),
        })
        .then((r) => r.data?.data ?? r.data),
    onSuccess: (key: any) => {
      setIssued({ keyId: key.keyId, signingSecret: key.signingSecret, name: key.name });
      setOpen(false);
      setName('');
      setAllowedIps('');
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not create the key'),
  });

  const rotate = useMutation({
    mutationFn: (id: string) => developerApi.rotateKey(id).then((r) => r.data?.data ?? r.data),
    onSuccess: (key: any) => {
      setIssued({ keyId: key.keyId, signingSecret: key.signingSecret, name: key.name });
      invalidate();
    },
  });

  const revoke = useMutation({
    mutationFn: (id: string) => developerApi.revokeKey(id),
    onSuccess: () => { toast.success('Key revoked'); invalidate(); },
  });

  const copy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Each key is a <span className="text-foreground font-semibold">pair</span>: a
            <span className="text-foreground font-semibold"> key id</span> that identifies you on every
            request, and a <span className="text-foreground font-semibold">signing secret</span> that never
            leaves your server — you sign requests with it rather than sending it. Test keys are free and
            never touch live data; live keys write for real and draw on your credit balance.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" /> New key
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : keys.length === 0 ? (
        <div className="border border-border rounded-xl p-10 text-center">
          <KeyRound className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">No API keys yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create a test key to start integrating.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
          {keys.map((k) => (
            <div key={k.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{k.name}</p>
                  <Badge variant={k.mode === 'live' ? 'default' : 'secondary'} className="text-[10px]">
                    {k.mode}
                  </Badge>
                  {k.status === 'revoked' && (
                    <Badge variant="destructive" className="text-[10px]">revoked</Badge>
                  )}
                </div>
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-[11px] font-mono text-foreground/80">
                    <span className="text-muted-foreground">key id&nbsp;&nbsp;</span>{k.keyId}
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    <span className="text-muted-foreground">secret&nbsp;&nbsp;</span>{k.secretHint}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  {k.scopes?.join(' · ') || 'no scopes'}
                  {k.allowedIps?.length ? ` · IPs: ${k.allowedIps.join(', ')}` : ''}
                </p>
              </div>
              <div className="text-right text-[11px] text-muted-foreground">
                <p>Created {timeAgo(k.createdAt)}</p>
                <p>{k.lastUsedAt ? `Used ${timeAgo(k.lastUsedAt)}` : 'Never used'}</p>
              </div>
              {k.status !== 'revoked' && (
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => rotate.mutate(k.id)} title="Rotate">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => confirm(`Revoke "${k.name}"? Calls using it stop immediately.`) && revoke.mutate(k.id)}
                    title="Revoke"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create API key</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <Field label="Key name">
              <Input
                placeholder="Production server"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Live mode</p>
                <p className="text-xs text-muted-foreground">
                  {live ? 'Writes real data and bills your balance' : 'Sandbox — free, and nothing is written'}
                </p>
              </div>
              <Switch checked={live} onCheckedChange={setLive} />
            </div>
            <MultiSelect
              label="Scopes"
              options={SCOPES}
              selected={scopes}
              onChange={setScopes}
              placeholder="Choose what this key may do"
            />
            <Field label="IP allowlist" hint="Optional. Comma-separated — calls from anywhere else are refused.">
              <Input
                placeholder="203.0.113.4, 203.0.113.5"
                value={allowedIps}
                onChange={(e) => setAllowedIps(e.target.value)}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>
              {create.isPending ? 'Creating…' : 'Create key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reveal — the only time the secret exists in the UI */}
      <Dialog open={!!issued} onOpenChange={(v) => !v && setIssued(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Store your signing secret now</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-lg bg-warning/10 border border-warning/30 p-3">
              <ShieldAlert className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/80 leading-relaxed">
                The signing secret is encrypted the moment you close this dialog and can never be shown
                again. Put it in your secret manager now. Lost it? Rotate the key — that issues a new pair
                and revokes this one in a single step.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground">Key id</p>
              <p className="text-[11px] text-muted-foreground">
                Send as <code className="font-mono text-foreground">X-API-KEY</code>. Public — safe in logs.
              </p>
              <div className="flex items-center gap-2">
                <code className={cn('flex-1 rounded-lg bg-muted px-3 py-2.5 text-xs font-mono break-all')}>
                  {issued?.keyId}
                </code>
                <Button size="sm" variant="outline" onClick={() => copy(issued!.keyId)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground">Signing secret</p>
              <p className="text-[11px] text-muted-foreground">
                Never send this. Use it to compute <code className="font-mono text-foreground">X-SIGNATURE</code>.
              </p>
              <div className="flex items-center gap-2">
                <code className={cn('flex-1 rounded-lg bg-muted px-3 py-2.5 text-xs font-mono break-all border border-warning/40')}>
                  {issued?.signingSecret}
                </code>
                <Button size="sm" onClick={() => copy(issued!.signingSecret)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setIssued(null)}>I've stored it safely</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
