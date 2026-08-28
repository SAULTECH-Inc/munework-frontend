import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Loader2, ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function VerifyOtpPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const email     = (location.state as any)?.email ?? '';
  const action    = (location.state as any)?.action ?? 'reset-password';

  const [digits, setDigits]           = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading]         = useState(false);
  const [resending, setResending]     = useState(false);
  const [cooldown, setCooldown]       = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if arrived without email in state
  useEffect(() => {
    if (!email) navigate('/forgot-password', { replace: true });
  }, [email, navigate]);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Auto-focus first box
  useEffect(() => { refs.current[0]?.focus(); }, []);

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);
    if (value && index < 5) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    pasted.split('').forEach((ch, i) => { if (i < 6) next[i] = ch; });
    setDigits(next);
    const nextEmpty = next.findIndex(v => !v);
    refs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
  }

  async function handleVerify(e?: React.FormEvent) {
    e?.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) return;
    setLoading(true);
    try {
      if (action === 'verify-account') {
        await authApi.verifyAccount({ email, code });
        toast.success('Email verified! You can now sign in.');
        navigate('/login');
      } else {
        await authApi.verifyOtp({ email, code });
        navigate('/reset-password', { state: { email, code } });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Invalid or expired code. Try again.');
      setDigits(Array(6).fill(''));
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await authApi.sendOtp({ email, action });
      toast.success('A new code has been sent to your email.');
      setCooldown(60);
      setDigits(Array(6).fill(''));
      refs.current[0]?.focus();
    } catch {
      toast.error('Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  }

  const code = digits.join('');

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <span className="text-2xl font-bold">Mune <span className="text-primary">Work</span></span>
        <p className="text-sm text-muted-foreground mt-1">Verify your email</p>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6 space-y-5">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-base font-semibold">Enter the 6-digit code</h2>
          <p className="text-xs text-muted-foreground">
            Sent to <span className="text-foreground font-medium">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-5">
          {/* Individual digit boxes */}
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => (refs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                disabled={loading}
                className={cn(
                  'h-11 w-10 rounded-lg border-2 text-center text-lg font-semibold transition-all outline-none',
                  'focus:ring-2 focus:ring-primary/30',
                  d
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border bg-surface text-foreground hover:border-primary/40',
                  loading && 'opacity-50 cursor-not-allowed',
                )}
              />
            ))}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={code.length !== 6 || loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? 'Verifying…' : 'Verify code'}
          </Button>
        </form>

        {/* Resend */}
        <div className="text-center text-xs text-muted-foreground">
          Didn't receive it?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className={cn(
              'font-medium transition-colors',
              resending || cooldown > 0
                ? 'text-muted-foreground cursor-not-allowed'
                : 'text-primary hover:underline',
            )}
          >
            {resending ? (
              <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Sending…</span>
            ) : cooldown > 0 ? (
              <span className="inline-flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Resend in {cooldown}s</span>
            ) : (
              <span className="inline-flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Resend code</span>
            )}
          </button>
        </div>

        <div className="flex items-center justify-center">
          <Link
            to="/forgot-password"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}
