import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck, Loader2, MessageCircle, ShieldCheck, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { whatsappApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const DIGEST_OPTIONS = [
  { value: 'off',    label: 'Off',     hint: 'No summary' },
  { value: 'daily',  label: 'Daily',   hint: 'Each morning' },
  { value: 'weekly', label: 'Weekly',  hint: 'Monday mornings' },
];

/**
 * Getting a WhatsApp number onto the account.
 *
 * The number is verified by sending a code to it, because an unverified number
 * means someone's hiring updates could land on a stranger's phone from one
 * mistyped digit.
 */
export function WhatsAppPanel() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isEmployer = user?.userType === 'employer';

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [awaitingCode, setAwaitingCode] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: () => whatsappApi.status().then((r) => r.data?.data ?? r.data),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['whatsapp-status'] });

  const startVerify = useMutation({
    mutationFn: () => whatsappApi.startVerify(phone),
    onSuccess: () => {
      setAwaitingCode(true);
      toast.success('Code sent — check WhatsApp on that number');
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'Could not send the code'),
  });

  const confirm = useMutation({
    mutationFn: () => whatsappApi.confirm(code),
    onSuccess: () => {
      setAwaitingCode(false);
      setCode('');
      setPhone('');
      toast.success('WhatsApp notifications are on');
      refresh();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That code was not accepted'),
  });

  const setDigest = useMutation({
    mutationFn: (frequency: string) => whatsappApi.setDigest(frequency),
    onSuccess: () => { toast.success('Summary schedule updated'); refresh(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not update'),
  });

  const optOut = useMutation({
    mutationFn: () => whatsappApi.optOut(),
    onSuccess: () => { toast.success('WhatsApp notifications turned off'); refresh(); },
  });

  const connected = data?.verified && data?.optedIn;
  // Only "off" once we have actually heard back. A failed request is a
  // different problem and must not be dressed up as a disabled feature.
  const providerOff = Boolean(data) && !data.provider;
  const unavailable = isError;

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;

  return (
    <div className="border border-border rounded-xl bg-surface-raised overflow-hidden">
      <div className="flex items-start gap-3 p-4 border-b border-border">
        <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
          <MessageCircle className="h-4 w-4 text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">WhatsApp</h3>
            {connected && (
              <Badge variant="success" className="text-[10px] gap-1">
                <BadgeCheck className="h-3 w-3" /> Connected
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {isEmployer
              ? 'Get a summary of new applications on your phone. One message on the schedule you pick — never one per applicant.'
              : 'Hear about your applications the moment they move — shortlisted, rejected, or an interview booked.'}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {unavailable && (
          <p className="text-xs text-foreground/80 rounded-lg bg-destructive/10 border border-destructive/30 p-3">
            We couldn't load your WhatsApp settings just now. Refresh the page to try again.
          </p>
        )}

        {providerOff && (
          <p className="text-xs text-muted-foreground rounded-lg bg-muted border border-border p-3">
            WhatsApp notifications aren't switched on for this workspace yet. Once they are, you'll
            be able to connect your number here.
          </p>
        )}

        {connected ? (
          <>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <p className="text-xs font-semibold text-foreground">Connected number</p>
                <p className="text-sm font-mono text-muted-foreground mt-0.5">{data.phone}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive shrink-0"
                onClick={() =>
                  confirm.isPending ? null : window.confirm('Stop all WhatsApp notifications?') && optOut.mutate()
                }
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Disconnect
              </Button>
            </div>

            {isEmployer && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Hiring summary</p>
                <div className="grid grid-cols-3 gap-2">
                  {DIGEST_OPTIONS.map((opt) => {
                    const active = (data.digestFrequency ?? 'off') === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDigest.mutate(opt.value)}
                        disabled={setDigest.isPending}
                        className={cn(
                          'rounded-lg border p-2.5 text-left transition-colors',
                          active
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/40 hover:bg-surface',
                        )}
                      >
                        <p className={cn('text-xs font-semibold', active ? 'text-primary' : 'text-foreground')}>
                          {opt.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{opt.hint}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Nothing is sent on a day with no new applications.
                </p>
              </div>
            )}
          </>
        ) : awaitingCode ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-foreground">Enter the 6-digit code</label>
              <p className="text-[11px] text-muted-foreground mt-0.5 mb-1.5">
                We sent it on WhatsApp. It expires in 10 minutes.
              </p>
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="font-mono tracking-[0.4em] text-center"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => confirm.mutate()} disabled={code.length !== 6 || confirm.isPending}>
                {confirm.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Confirm
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setAwaitingCode(false); setCode(''); }}
              >
                Use a different number
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-foreground">WhatsApp number</label>
              <p className="text-[11px] text-muted-foreground mt-0.5 mb-1.5">
                Include the country code. We'll send a code to confirm it's yours.
              </p>
              <Input
                type="tel"
                placeholder="+234 801 234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={providerOff || unavailable}
              />
            </div>
            <Button
              onClick={() => startVerify.mutate()}
              disabled={phone.trim().length < 7 || startVerify.isPending || providerOff || unavailable}
            >
              {startVerify.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Send code
            </Button>
          </div>
        )}

        <div className="flex items-start gap-2 pt-3 border-t border-border">
          <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            We only message you about your own {isEmployer ? 'roles' : 'applications'}, never marketing.
            You can disconnect at any time, and replying STOP on WhatsApp works too.
          </p>
        </div>
      </div>
    </div>
  );
}
