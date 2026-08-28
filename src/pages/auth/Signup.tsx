import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff, UserCircle, Building2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast, { Toaster } from 'react-hot-toast';

const applicantSchema = z.object({
  userType:  z.literal('applicant'),
  firstName: z.string().min(1, 'Required'),
  lastName:  z.string().min(1, 'Required'),
  email:     z.string().email('Invalid email'),
  password:  z.string().min(8, 'At least 8 characters'),
});

const employerSchema = z.object({
  userType:    z.literal('employer'),
  companyName: z.string().min(1, 'Required'),
  email:       z.string().email('Invalid email'),
  password:    z.string().min(8, 'At least 8 characters'),
});

const schema = z.discriminatedUnion('userType', [applicantSchema, employerSchema]);
type FormData = z.infer<typeof schema>;
type UserType = 'applicant' | 'employer';

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
        <span className="text-white font-bold text-lg font-['Outfit',sans-serif]">M</span>
      </div>
      <span className="font-bold text-xl tracking-tight font-['Outfit',sans-serif]">
        Mune <span className="text-gradient">Work</span>
      </span>
    </div>
  );
}

// ─── Signup page ──────────────────────────────────────────────────────────────

export default function SignupPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [userType, setUserType]         = useState<UserType>('applicant');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [cvFile, setCvFile]             = useState<File | null>(null);
  const [signupError, setSignupError]   = useState('');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { userType: 'applicant' } as any,
  });

  function selectType(t: UserType) {
    setUserType(t);
    setValue('userType', t as any);
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    setSignupError('');
    try {
      if (data.userType === 'applicant' && cvFile) {
        const form = new FormData();
        form.append('email', data.email);
        form.append('password', data.password);
        form.append('firstName', data.firstName || '');
        form.append('lastName', data.lastName || '');
        form.append('userType', 'applicant');
        form.append('file', cvFile);
        await authApi.applicantSignupWithCv(form);
      } else {
        const endpoint = data.userType === 'employer' ? authApi.employerSignup : authApi.applicantSignup;
        await endpoint(data);
      }

      navigate('/verify-otp', { state: { email: data.email, action: 'verify-account' } });
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Signup failed. Please try again.';
      setSignupError(msg);
    } finally {
      setLoading(false);
    }
  }

  const oauthBase = import.meta.env.VITE_API_BASE_URL;

  return (
    <div className="w-full max-w-sm space-y-6">
      <LogoBadge />
      <p className="text-center text-sm text-muted-foreground -mt-3">Create your account to get started</p>

      <div className="glass rounded-2xl border border-border/60 p-7 space-y-5 shadow-[0_8px_40px_rgba(0,0,0,0.25)]">
        {/* Social auth */}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" type="button" size="sm" className="gap-1.5 text-xs font-medium"
            onClick={() => { window.location.href = `${oauthBase}/auth/google`; }}>
            <GoogleIcon /> Google
          </Button>
          <Button variant="outline" type="button" size="sm" className="gap-1.5 text-xs font-medium"
            onClick={() => { window.location.href = `${oauthBase}/auth/linkedin`; }}>
            <LinkedInIcon /> LinkedIn
          </Button>
          <Button variant="outline" type="button" size="sm" className="gap-1.5 text-xs font-medium"
            onClick={() => { window.location.href = `${oauthBase}/auth/microsoft`; }}>
            <MicrosoftIcon /> Microsoft
          </Button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">or</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Account type selector */}
        <div className="grid grid-cols-2 gap-2">
          {(['applicant', 'employer'] as UserType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => selectType(t)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border p-3.5 text-xs font-semibold transition-all duration-200',
                userType === t
                  ? 'border-primary/60 bg-primary/10 text-primary shadow-[0_0_12px_hsl(262_83%_58%/0.15)]'
                  : 'border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-surface-raised',
              )}
            >
              {t === 'applicant'
                ? <UserCircle className={cn('h-5 w-5', userType === t ? 'text-primary' : '')} />
                : <Building2 className={cn('h-5 w-5', userType === t ? 'text-primary' : '')} />
              }
              {t === 'applicant' ? 'Job Seeker' : 'Employer'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <input type="hidden" {...register('userType')} />

          {userType === 'applicant' ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input placeholder="First name" {...register('firstName' as any)} className={(errors as any).firstName ? 'border-destructive' : ''} />
                  {(errors as any).firstName && <p className="text-xs text-destructive mt-1">{(errors as any).firstName.message}</p>}
                </div>
                <div>
                  <Input placeholder="Last name" {...register('lastName' as any)} className={(errors as any).lastName ? 'border-destructive' : ''} />
                  {(errors as any).lastName && <p className="text-xs text-destructive mt-1">{(errors as any).lastName.message}</p>}
                </div>
              </div>

              {/* CV Upload */}
              <div className={cn(
                'border border-dashed rounded-xl p-3.5 text-center transition-all duration-200 cursor-pointer',
                cvFile ? 'border-primary/50 bg-primary/5' : 'border-border/60 bg-background/40 hover:border-primary/40 hover:bg-primary/3',
              )}>
                <input
                  type="file"
                  id="cv-signup-file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setCvFile(f);
                  }}
                />
                <label htmlFor="cv-signup-file" className="cursor-pointer flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                    <Sparkles className="h-3.5 w-3.5" />
                    {cvFile ? cvFile.name : 'Upload CV to Auto-Fill Profile (Optional)'}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {cvFile ? 'AI will extract skills & experience' : 'PDF, DOCX, TXT — AI auto-extracts your info'}
                  </span>
                </label>
              </div>
            </>
          ) : (
            <div>
              <Input placeholder="Company name" {...register('companyName' as any)} className={(errors as any).companyName ? 'border-destructive' : ''} />
              {(errors as any).companyName && <p className="text-xs text-destructive mt-1">{(errors as any).companyName.message}</p>}
            </div>
          )}

          <div>
            <Input type="email" placeholder="Email address" {...register('email')} className={errors.email ? 'border-destructive' : ''} />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password (min. 8 chars)"
              {...register('password')}
              className={errors.password ? 'border-destructive' : ''}
              suffix={
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
          </div>

          {signupError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{signupError}</span>
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="text-[11px] text-center text-muted-foreground">
          By creating an account you agree to our{' '}
          <Link to="/terms" className="text-primary hover:text-primary/80 font-medium">Terms</Link>
          {' '}and{' '}
          <Link to="/privacy" className="text-primary hover:text-primary/80 font-medium">Privacy Policy</Link>
        </p>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">Sign in</Link>
      </p>
    </div>
  );
}
