import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Field, SectionCard, Stat } from './parts';
import { developerApi } from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';
import toast from 'react-hot-toast';

const METER_LABEL: Record<string, string> = {
  'api.read': 'Read request',
  'api.write': 'Write request',
  'webhook.delivery': 'Webhook delivery',
};

const METER_DETAIL: Record<string, string> = {
  'api.read': 'Any GET — listing jobs, fetching applicants',
  'api.write': 'POST, PATCH or DELETE — posting or updating a job',
  'webhook.delivery': 'Each event we successfully deliver to your endpoint',
};

export function UsageTab() {
  const qc = useQueryClient();
  const [threshold, setThreshold] = useState('');

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['developer-wallet'],
    queryFn: () => developerApi.wallet().then((r) => r.data?.data ?? r.data),
  });
  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['developer-usage'],
    queryFn: () => developerApi.usage(30).then((r) => r.data?.data ?? r.data),
  });
  const { data: prices } = useQuery({
    queryKey: ['developer-pricing'],
    queryFn: () => developerApi.pricing().then((r) => r.data?.data ?? r.data),
  });
  const { data: txns } = useQuery({
    queryKey: ['developer-transactions'],
    queryFn: () => developerApi.transactions({ limit: 10 }).then((r) => r.data?.data ?? r.data),
  });

  const saveThreshold = useMutation({
    mutationFn: () => developerApi.setThreshold(Number(threshold)),
    onSuccess: () => {
      toast.success('Alert threshold updated');
      setThreshold('');
      qc.invalidateQueries({ queryKey: ['developer-wallet'] });
    },
  });

  const currency = wallet?.currency ?? 'NGN';
  const balance = Number(wallet?.balance ?? 0);
  const totals = usage?.totals;
  const priceList: any[] = Array.isArray(prices) ? prices : [];

  const runway = useMemo(() => {
    const daily = (usage?.daily ?? []) as any[];
    if (!daily.length) return null;
    const spend = daily.reduce((sum, d) => sum + Number(d.spend ?? 0), 0);
    const perDay = spend / daily.length;
    return perDay > 0 ? Math.floor(balance / perDay) : null;
  }, [usage, balance]);

  // Only warn once they actually have something to lose: a threshold they set,
  // or live traffic that will start failing.
  const threshold_ = Number(wallet?.lowBalanceThreshold ?? 0);
  const lowBalance =
    (threshold_ > 0 && balance <= threshold_) ||
    (balance <= 0 && (totals?.calls ?? 0) > 0);
  const maxSpend = Math.max(...((usage?.daily ?? []).map((d: any) => Number(d.spend)) as number[]), 1);

  return (
    <div className="space-y-5">
      {lowBalance && (
        <div className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning/10 p-3.5">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Your API credit is running low</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              When it reaches zero, live calls are refused with 402 and webhook deliveries stop being billed.
              Test-mode traffic keeps working.
            </p>
          </div>
        </div>
      )}

      {/* Balance & spend */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {walletLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : (
          <>
            <Stat
              label="Credit balance"
              value={`${currency} ${balance.toLocaleString()}`}
              sub={runway != null ? `~${runway} days at current rate` : 'No usage yet'}
              tone={lowBalance ? 'warning' : 'primary'}
            />
            <Stat label="Calls (30d)" value={totals?.calls ?? 0} sub={`${totals?.reads ?? 0} read · ${totals?.writes ?? 0} write`} />
            <Stat label="Spend (30d)" value={`${currency} ${Number(totals?.spend ?? 0).toLocaleString()}`} />
            <Stat
              label="Errors (30d)"
              value={totals?.errors ?? 0}
              sub={`avg ${totals?.avgDurationMs ?? 0}ms`}
              tone={(totals?.errors ?? 0) > 0 ? 'warning' : 'success'}
            />
          </>
        )}
      </div>

      {/* Daily spend */}
      <SectionCard title="Daily usage" description="Calls and spend over the last 30 days">
        {usageLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : !usage?.daily?.length ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No API calls yet. Once your integration runs, usage shows here.
          </p>
        ) : (
          <div className="flex items-end gap-1 h-28">
            {usage.daily.map((d: any) => (
              <div key={d.day} className="flex-1 group relative flex flex-col justify-end h-full">
                <div
                  className="w-full rounded-t bg-primary/70 group-hover:bg-primary transition-colors min-h-[2px]"
                  style={{ height: `${(Number(d.spend) / maxSpend) * 100}%` }}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded-md bg-foreground text-background text-[10px] px-2 py-1 z-10">
                  {new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ·{' '}
                  {d.calls} calls · {currency} {Number(d.spend).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Price book */}
      <SectionCard title="What each call costs" description="Set by Mune Work; changes take effect immediately">
        <div className="divide-y divide-border">
          {priceList.length === 0 ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            priceList.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {METER_LABEL[p.meterKey] ?? p.meterKey}
                    {!p.isActive && <Badge variant="outline" className="ml-2 text-[10px]">not charged</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {METER_DETAIL[p.meterKey] ?? p.description}
                  </p>
                </div>
                <p className="text-sm font-bold text-foreground font-['Outfit',sans-serif] shrink-0">
                  {p.currency} {Number(p.unitPrice).toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground"> /call</span>
                </p>
              </div>
            ))
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border">
          Test-mode calls are always free. Failed calls are not charged, and a webhook delivery is
          billed once, on success — retries cost nothing.
        </p>
      </SectionCard>

      {/* Low balance alert + ledger */}
      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard title="Low balance alert" description="We'll email you before calls start failing">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label={`Warn me below (${currency})`}>
                <Input
                  type="number"
                  min={0}
                  placeholder={String(wallet?.lowBalanceThreshold ?? 0)}
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                />
              </Field>
            </div>
            <Button
              onClick={() => saveThreshold.mutate()}
              disabled={!threshold || saveThreshold.isPending}
            >
              Save
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="Recent credit activity">
          {!txns?.items?.length ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Nothing yet. Charges and top-ups appear here.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {txns.items.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  {Number(t.amount) < 0
                    ? <ArrowDownRight className="h-3.5 w-3.5 text-destructive shrink-0" />
                    : <ArrowUpRight className="h-3.5 w-3.5 text-success shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{t.description}</p>
                    <p className="text-[11px] text-muted-foreground">{timeAgo(t.createdAt)}</p>
                  </div>
                  <p className={cn(
                    'text-xs font-semibold shrink-0',
                    Number(t.amount) < 0 ? 'text-destructive' : 'text-success',
                  )}>
                    {Number(t.amount) > 0 ? '+' : ''}{Number(t.amount).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3.5">
        <Wallet className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Need more credit? Self-service top-up is coming — for now contact support and we'll add it
          to your balance the same day.
        </p>
      </div>
    </div>
  );
}
