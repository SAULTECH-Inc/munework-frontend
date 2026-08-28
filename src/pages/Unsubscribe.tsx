import { useState } from 'react';
import { MailX, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const REASONS = [
  'Too many emails',
  'Content is not relevant to me',
  'I never signed up for this',
  'I have a different account',
  'Other',
];

export default function UnsubscribePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const email = params.get('email');

  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      if (token) {
        await api.post('/notifications/unsubscribe', { token, reason });
      }
      localStorage.setItem('munework_email_prefs', JSON.stringify(
        Object.fromEntries(
          ['new_job_match','saved_job_alert','company_new_job','app_viewed','app_status',
           'app_shortlisted','app_rejected','interview_invite','interview_remind','interview_cancel',
           'connection_req','connection_acc','new_message','auto_apply_done','auto_apply_fail',
           'auto_apply_reply','product_updates','weekly_digest','tips_and_guides'].map(k => [k, false])
        )
      ));
      setDone(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm w-full space-y-5">
          <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Unsubscribed</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {email ? `${email} has been` : 'You have been'} removed from our marketing emails.
              Security-related notifications will still be sent.
            </p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 text-left space-y-2">
            <p className="text-xs font-medium text-foreground">Changed your mind?</p>
            <p className="text-xs text-muted-foreground">You can re-enable emails anytime from your settings.</p>
            <Button size="sm" variant="outline" className="w-full" onClick={() => navigate('/email-preferences')}>
              Manage Email Preferences
            </Button>
          </div>
          <button onClick={() => navigate('/')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Mune Work
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-6">

        {/* Icon + heading */}
        <div className="text-center space-y-3">
          <div className="h-14 w-14 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto">
            <MailX className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Unsubscribe</h1>
          {email ? (
            <p className="text-sm text-muted-foreground">
              You are about to unsubscribe <strong className="text-foreground">{email}</strong> from all Mune Work marketing emails.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              You are about to unsubscribe from all Mune Work marketing emails.
            </p>
          )}
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Why are you unsubscribing? (optional)</p>
          <div className="space-y-1.5">
            {REASONS.map(r => (
              <label key={r} className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors',
                reason === r ? 'border-primary bg-primary/5' : 'border-border hover:bg-surface-raised',
              )}>
                <div className={cn(
                  'h-3.5 w-3.5 rounded-full border-2 shrink-0 transition-colors',
                  reason === r ? 'border-primary bg-primary' : 'border-muted',
                )} />
                <span className="text-sm text-foreground">{r}</span>
                <input type="radio" name="reason" value={r} checked={reason === r}
                  onChange={() => setReason(r)} className="sr-only" />
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button variant="destructive" onClick={handleUnsubscribe} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MailX className="h-3.5 w-3.5" />}
            Unsubscribe
          </Button>
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Keep my subscription
          </Button>
        </div>

        {/* Fine print */}
        <p className="text-center text-[11px] text-muted-foreground">
          Security alerts (login notices, password resets) will still be sent regardless of this setting.
        </p>
      </div>
    </div>
  );
}
