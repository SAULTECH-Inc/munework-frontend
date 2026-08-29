import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, Copy, Eye, EyeOff, Plus, RefreshCw, Send, Trash2, Webhook, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import MultiSelect, { type SelectOption } from '@/components/ui/multi-select';
import {
  Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Field } from './parts';
import { WebhookReference } from './WebhookReference';
import { developerApi } from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';
import toast from 'react-hot-toast';

const EVENTS: SelectOption[] = [
  { value: 'application.created',        label: 'application.created — someone applies' },
  { value: 'application.status_changed', label: 'application.status_changed' },
  { value: 'application.withdrawn',      label: 'application.withdrawn' },
  { value: 'applicants.daily_digest',    label: 'applicants.daily_digest — daily roll-up' },
  { value: 'job.published',              label: 'job.published — a job goes live' },
  { value: 'job.updated',                label: 'job.updated' },
  { value: 'job.closed',                 label: 'job.closed' },
  { value: 'interview.scheduled',        label: 'interview.scheduled' },
];

export function WebhooksTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [live, setLive] = useState(false);
  const [events, setEvents] = useState<SelectOption[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['developer-webhooks'],
    queryFn: () => developerApi.listWebhooks().then((r) => r.data?.data ?? r.data),
  });
  const hooks: any[] = Array.isArray(data) ? data : [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ['developer-webhooks'] });

  const create = useMutation({
    mutationFn: () =>
      developerApi.createWebhook({
        url,
        description: description || undefined,
        mode: live ? 'live' : 'test',
        events: events.map((e) => e.value),
      }),
    onSuccess: () => {
      toast.success('Endpoint added');
      setOpen(false); setUrl(''); setDescription(''); setEvents([]);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not add the endpoint'),
  });

  const ping = useMutation({
    mutationFn: (id: string) => developerApi.pingWebhook(id).then((r) => r.data?.data ?? r.data),
    onSuccess: (res: any) => {
      if (res?.delivered) toast.success(`Delivered — HTTP ${res.statusCode} in ${res.durationMs}ms`);
      else toast.error(`Not delivered${res?.statusCode ? ` — HTTP ${res.statusCode}` : ''}. Check the log below.`);
      qc.invalidateQueries({ queryKey: ['webhook-deliveries'] });
      invalidate();
    },
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      developerApi.updateWebhook(id, { status }),
    onSuccess: () => invalidate(),
  });

  const rotate = useMutation({
    mutationFn: (id: string) => developerApi.rotateSecret(id),
    onSuccess: () => { toast.success('Signing secret rotated'); invalidate(); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => developerApi.deleteWebhook(id),
    onSuccess: () => { toast.success('Endpoint removed'); invalidate(); },
  });

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success('Copied'); };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <ArrowLeft className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <h2 className="text-base font-bold text-foreground font-['Outfit',sans-serif]">
            We call you — outbound webhooks
          </h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Everything on this tab is something <span className="text-foreground font-semibold">we push to
            your server</span> the moment it happens: a candidate applies, a status changes, a job goes
            live. You never poll for it. For calls your system makes to us, see the{' '}
            <span className="text-foreground font-semibold">Documentation</span> tab.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" /> Add endpoint
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : hooks.length === 0 ? (
        <div className="border border-border rounded-xl p-10 text-center">
          <Webhook className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">No endpoints yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add one to receive applications and job events as they happen.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {hooks.map((h) => (
            <div key={h.id} className="border border-border rounded-xl bg-surface-raised overflow-hidden">
              <div className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono text-foreground break-all">{h.url}</code>
                      <Badge variant={h.mode === 'live' ? 'default' : 'secondary'} className="text-[10px]">{h.mode}</Badge>
                      <Badge
                        variant={h.status === 'active' ? 'success' : h.status === 'disabled' ? 'destructive' : 'outline'}
                        className="text-[10px]"
                      >
                        {h.status}
                      </Badge>
                    </div>
                    {h.description && <p className="text-xs text-muted-foreground mt-1">{h.description}</p>}
                    <p className="text-[11px] text-muted-foreground/70 mt-1.5">
                      {h.events?.length ? h.events.join(' · ') : 'All events'}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                      {h.lastSuccessAt && (
                        <span className="flex items-center gap-1 text-success">
                          <CheckCircle2 className="h-3 w-3" /> {timeAgo(h.lastSuccessAt)}
                        </span>
                      )}
                      {h.consecutiveFailures > 0 && (
                        <span className="flex items-center gap-1 text-destructive">
                          <XCircle className="h-3 w-3" /> {h.consecutiveFailures} consecutive failures
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={h.status === 'active'}
                      onCheckedChange={(v) =>
                        toggleStatus.mutate({ id: h.id, status: v ? 'active' : 'paused' })
                      }
                    />
                    <Button variant="ghost" size="sm" onClick={() => ping.mutate(h.id)} title="Send test event">
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => rotate.mutate(h.id)} title="Rotate signing secret">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="sm" className="text-destructive"
                      onClick={() => confirm('Remove this endpoint?') && remove.mutate(h.id)}
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Signing secret */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <span className="text-[11px] font-semibold text-muted-foreground shrink-0">Signing secret</span>
                  <code className="flex-1 text-[11px] font-mono text-foreground/80 break-all">
                    {revealed[h.id] ? h.secret : `${h.secret?.slice(0, 11)}${'•'.repeat(20)}`}
                  </code>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setRevealed((r) => ({ ...r, [h.id]: !r[h.id] }))}
                  >
                    {revealed[h.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => copy(h.secret)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <button
                  onClick={() => setExpanded(expanded === h.id ? null : h.id)}
                  className="text-xs text-primary font-semibold mt-3 hover:underline"
                >
                  {expanded === h.id ? 'Hide' : 'Show'} recent deliveries
                </button>
              </div>

              {expanded === h.id && <DeliveryLog endpointId={h.id} />}
            </div>
          ))}
        </div>
      )}

      <WebhookReference />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add webhook endpoint</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <Field
              label="Endpoint URL"
              hint="Must be publicly reachable. Live endpoints must use https."
            >
              <Input
                placeholder="https://api.yourcompany.com/hooks/munework"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </Field>
            <Field label="Description">
              <Input
                placeholder="ATS sync"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Live mode</p>
                <p className="text-xs text-muted-foreground">
                  {live ? 'Receives real events, billed per delivery' : 'Test events only, free'}
                </p>
              </div>
              <Switch checked={live} onCheckedChange={setLive} />
            </div>
            <MultiSelect
              label="Events"
              options={EVENTS}
              selected={events}
              onChange={setEvents}
              placeholder="Leave empty to receive everything"
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={!url.trim() || create.isPending}>
              {create.isPending ? 'Adding…' : 'Add endpoint'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeliveryLog({ endpointId }: { endpointId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['webhook-deliveries', endpointId],
    queryFn: () => developerApi.deliveries(endpointId, { limit: 10 }).then((r) => r.data?.data ?? r.data),
  });

  const replay = useMutation({
    mutationFn: (id: string) => developerApi.replay(id),
    onSuccess: () => {
      toast.success('Queued for redelivery');
      qc.invalidateQueries({ queryKey: ['webhook-deliveries', endpointId] });
    },
  });

  const items: any[] = data?.items ?? [];

  if (isLoading) return <div className="p-4 border-t border-border"><Skeleton className="h-20 w-full" /></div>;
  if (!items.length) {
    return (
      <p className="p-4 border-t border-border text-xs text-muted-foreground">
        No deliveries yet. Use the send button to fire a test event.
      </p>
    );
  }

  return (
    <div className="border-t border-border divide-y divide-border bg-surface">
      {items.map((d) => (
        <div key={d.id} className="flex items-center gap-3 px-4 py-2.5">
          <span className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            d.status === 'delivered' ? 'bg-success'
              : d.status === 'pending' ? 'bg-warning'
              : 'bg-destructive',
          )} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {d.event?.type ?? 'event'}
              <span className="text-muted-foreground font-normal"> · {d.status}</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {d.lastStatusCode ? `HTTP ${d.lastStatusCode}` : d.lastError || '—'}
              {d.attempts > 1 && ` · ${d.attempts} attempts`}
              {d.durationMs != null && ` · ${d.durationMs}ms`}
            </p>
          </div>
          <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(d.createdAt)}</span>
          <Button variant="ghost" size="sm" onClick={() => replay.mutate(d.id)} title="Send again">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
