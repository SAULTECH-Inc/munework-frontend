import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff, MailCheck, ArrowLeft, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

const schema = z.object({
  email:      z.string().email('Invalid email'),
  password:   z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

// ─── Redesigned OTP boxes ────────────────────────────────────────────────────

function OtpBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  function handleChange(index: number, raw: string) {
    if (!/^\d*$/.test(raw)) return;
    const next = [...value];
    next[index] = raw.slice(-1);
    onChange(next);
    if (raw && index < 5) refs.current[index + 1]?.focus();
  }

  function handleKey(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...value];
    pasted.split('').forEach((ch, i) => { if (i < 6) next[i] = ch; });
    onChange(next);
    const nextEmpty = next.findIndex(v => !v);
    refs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
  }

  return (
    <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
      {value.map((d, i) => (
        <input
          key={i}
          ref={el => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          disabled={disabled}
          className={cn(
            'h-12 w-11 rounded-xl border-2 text-center text-xl font-bold transition-all duration-200 outline-none select-none',
            'focus:ring-0',
            d
              ? 'border-primary bg-primary/10 text-primary shadow-[0_0_12px_hsl(262_83%_58%/0.2)]'
              : 'border-border bg-surface hover:border-primary/40 text-foreground',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        />
      ))}
    </div>
  );
}

// ─── OAuth icons ──────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="h-4 w-4 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#F25022" d="M0 0h11.5v11.5H0z"/>
      <path fill="#7FBA00" d="M12.5 0H24v11.5H12.5z"/>
      <path fill="#00A4EF" d="M0 12.5h11.5V24H0z"/>
      <path fill="#FFB900" d="M12.5 12.5H24V24H12.5z"/>
    </svg>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function LogoBadge() {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_4px_20px_hsl(262_83%_58%/0.35)]">
        <span className="text-white font-bold text-lg font-['Outfit',sans-serif]">G</span>
      </div>
      <span className="font-bold text-xl tracking-tight font-['Outfit',sans-serif]">
        Gig<span className="text-gradient">hub</span>
      </span>
    </div>
  );
}

// ─── Main Login page ──────────────────────────────────────────────────────────

type Step = 'credentials' | '2fa' | 'verify-email';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [step, setStep]                         = useState<Step>('credentials');
  const [showPw, setShowPw]                     = useState(false);
  const [loading, setLoading]                   = useState(false);
  const [loginError, setLoginError]             = useState('');
  const [pendingEmail, setPendingEmail]         = useState('');
  const [pendingTempToken, setPendingTempToken] = useState('');

  const [otpDigits, setOtpDigits]               = useState<string[]>(Array(6).fill(''));
  const [otpLoading, setOtpLoading]             = useState(false);
  const [resending, setResending]               = useState(false);
  const [cooldown, setCooldown]                 = useState(0);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const savedEmail = localStorage.getItem('munework_remember_email');
    const isRemembered = localStorage.getItem('munework_remember_me') === 'true';
    if (savedEmail && isRemembered) {
      setValue('email', savedEmail);
      setValue('rememberMe', true);
    }
  }, [setValue]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function onSubmit(data: FormData) {
    setLoading(true);
    setLoginError('');
    if (data.rememberMe) {
      localStorage.setItem('munework_remember_email', data.email);
      localStorage.setItem('munework_remember_me', 'true');
    } else {
      localStorage.removeItem('munework_remember_email');
      localStorage.removeItem('munework_remember_me');
    }
    try {
      const res = await authApi.login({
        email:      data.email,
        password:   data.password,
        rememberMe: data.rememberMe,
      });
      const payload = res.data.data ?? res.data;

      if (payload.requiresTwoFactor) {
        setPendingEmail(data.email);
        setPendingTempToken(payload.tempToken ?? '');
        setOtpDigits(Array(6).fill(''));
        setStep('2fa');
        return;
      }

      const token: string | undefined = payload.accessToken;
      if (!token) {
        setLoginError('Login failed. Please try again.');
        return;
      }
      setAuth({ accessToken: token, user: payload.user ?? payload });
      navigate('/dashboard');
    } catch (err: any) {
      const msg: string = err.response?.data?.message ?? '';
      if (msg.toLowerCase().includes('verify') || msg.toLowerCase().includes('not verified')) {
        setPendingEmail(data.email);
        setOtpDigits(Array(6).fill(''));
        setStep('verify-email');
        authApi.sendOtp({ email: data.email, action: 'verify-account', name: data.email }).catch(() => {});
      } else {
        const errMsg = msg || 'Incorrect email or password. Please try again.';
        setLoginError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify2FA() {
    const code = otpDigits.join('');
    if (code.length !== 6) return;
    setOtpLoading(true);
    try {
      const res = await authApi.verify2FA({
        code,
        tempToken: pendingTempToken,
        rememberMe: false,
      });
      const payload = res.data.data ?? res.data;
      const token: string | undefined = payload.accessToken;
      if (!token) throw new Error('No token');
      setAuth({ accessToken: token, user: payload.user ?? payload });
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Invalid code. Try again.');
      setOtpDigits(Array(6).fill(''));
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleVerifyEmail() {
    const code = otpDigits.join('');
    if (code.length !== 6) return;
    setOtpLoading(true);
    try {
      await authApi.verifyAccount({ email: pendingEmail, code });
      toast.success('Email verified! You can now sign in.');
      setStep('credentials');
      setOtpDigits(Array(6).fill(''));
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Invalid code. Try again.');
      setOtpDigits(Array(6).fill(''));
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleResendEmailVerify() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await authApi.sendOtp({ email: pendingEmail, action: 'verify-account', name: pendingEmail });
      toast.success('A new code has been sent.');
      setCooldown(60);
      setOtpDigits(Array(6).fill(''));
    } catch {
      toast.error('Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  }

  const oauthBase = import.meta.env.VITE_API_BASE_URL;

  const cardClass = 'glass rounded-2xl border border-border/60 p-7 space-y-5 shadow-[0_8px_40px_rgba(0,0,0,0.25)]';

  // ── Email verification step ──────────────────────────────────────────────────
  if (step === 'verify-email') {
    return (
      <div className="w-full max-w-sm space-y-6">
        <LogoBadge />
        <div className={cardClass}>
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center mx-auto">
              <MailCheck className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-base font-bold text-foreground">Verify your email</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enter the 6-digit code sent to{' '}
              <span className="text-foreground font-semibold">{pendingEmail}</span>
            </p>
          </div>

          <OtpBoxes value={otpDigits} onChange={setOtpDigits} disabled={otpLoading} />

          <Button className="w-full" size="lg" onClick={handleVerifyEmail} disabled={otpDigits.join('').length !== 6 || otpLoading}>
            {otpLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Verify &amp; continue
          </Button>

          <div className="text-center text-xs text-muted-foreground space-y-2.5">
            <div>
              Didn't receive it?{' '}
              <button
                type="button"
                onClick={handleResendEmailVerify}
                disabled={resending || cooldown > 0}
                className={cn(
                  'font-semibold transition-colors',
                  resending || cooldown > 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-primary hover:text-primary/80',
                )}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending…' : 'Resend code'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setStep('credentials')}
              className="flex items-center gap-1.5 mx-auto text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 2FA step ─────────────────────────────────────────────────────────────────
  if (step === '2fa') {
    return (
      <div className="w-full max-w-sm space-y-6">
        <LogoBadge />
        <div className={cardClass}>
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center mx-auto">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-base font-bold text-foreground">Two-factor authentication</h2>
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <OtpBoxes value={otpDigits} onChange={setOtpDigits} disabled={otpLoading} />

          <Button
            className="w-full"
            size="lg"
            onClick={handleVerify2FA}
            disabled={otpDigits.join('').length !== 6 || otpLoading}
          >
            {otpLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {otpLoading ? 'Verifying…' : 'Verify'}
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            <p>Open your authenticator app to get the current code.</p>
            <button
              type="button"
              onClick={() => { setStep('credentials'); setOtpDigits(Array(6).fill('')); }}
              className="flex items-center gap-1.5 mx-auto mt-2.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Credentials step ─────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-sm space-y-6">
      <LogoBadge />
      <p className="text-center text-sm text-muted-foreground -mt-3">Welcome back — sign in to continue</p>

      <div className={cardClass}>
        {/* OAuth buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            type="button"
            size="sm"
            className="gap-1.5 text-xs font-medium"
            onClick={() => { window.location.href = `${oauthBase}/auth/google`; }}
          >
            <GoogleIcon /> Google
          </Button>
          <Button
            variant="outline"
            type="button"
            size="sm"
            className="gap-1.5 text-xs font-medium"
            onClick={() => { window.location.href = `${oauthBase}/auth/linkedin`; }}
          >
            <LinkedInIcon /> LinkedIn
          </Button>
          <Button
            variant="outline"
            type="button"
            size="sm"
            className="gap-1.5 text-xs font-medium"
            onClick={() => { window.location.href = `${oauthBase}/auth/microsoft`; }}
          >
            <MicrosoftIcon /> Microsoft
          </Button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">or</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          <div>
            <Input
              type="email"
              placeholder="Email address"
              autoComplete="email"
              {...register('email')}
              className={errors.email ? 'border-destructive focus-visible:ring-destructive/40' : ''}
            />
            {errors.email && <p className="text-xs text-destructive mt-1.5">{errors.email.message}</p>}
          </div>

          <div>
            <Input
              type={showPw ? 'text' : 'password'}
              placeholder="Password"
              autoComplete="current-password"
              {...register('password')}
              className={errors.password ? 'border-destructive focus-visible:ring-destructive/40' : ''}
              suffix={
                <button type="button" onClick={() => setShowPw(!showPw)} className="text-muted-foreground hover:text-foreground transition-colors">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            {errors.password && <p className="text-xs text-destructive mt-1.5">{errors.password.message}</p>}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                {...register('rememberMe')}
                className="h-3.5 w-3.5 rounded border-border accent-primary"
              />
              <span className="text-xs text-muted-foreground">Remember me</span>
            </label>
            <Link to="/forgot-password" className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
              Forgot password?
            </Link>
          </div>

          {/* Inline error banner */}
          {loginError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Don't have an account?{' '}
        <Link to="/signup" className="text-primary hover:text-primary/80 font-semibold transition-colors">Create one</Link>
      </p>
    </div>
  );
}
