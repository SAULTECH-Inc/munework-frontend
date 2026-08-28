import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

function getStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 8)                      s++;
  if (pw.length >= 12)                     s++;
  if (/[A-Z]/.test(pw))                   s++;
  if (/[0-9]/.test(pw))                   s++;
  if (/[^A-Za-z0-9]/.test(pw))           s++;
  return s;
}

const STRENGTH_LABELS = ['', 'Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', 'bg-destructive', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-500', 'bg-success'];

export default function ResetPasswordPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const email     = (location.state as any)?.email ?? '';
  const code      = (location.state as any)?.code  ?? '';

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [showCf,    setShowCf]    = useState(false);
  const [loading,   setLoading]   = useState(false);

  const strength  = getStrength(password);
  const mismatch  = confirm.length > 0 && password !== confirm;

  useEffect(() => {
    if (!email || !code) navigate('/forgot-password', { replace: true });
  }, [email, code, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mismatch || !password || strength < 2) return;
    setLoading(true);
    try {
      await authApi.resetPassword({ email, code, newPassword: password });
      navigate('/reset-success');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Reset failed. Please start over.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <span className="text-2xl font-bold">Mune <span className="text-primary">Work</span></span>
        <p className="text-sm text-muted-foreground mt-1">Set a new password</p>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6 space-y-5">
        <div className="text-center space-y-1 pb-1">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-base font-semibold">Create new password</h2>
          <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New password */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">New password</label>
            <Input
              type={showPw ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              suffix={
                <button type="button" onClick={() => setShowPw(!showPw)} className="text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            {/* Strength meter */}
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={cn(
                        'h-1.5 flex-1 rounded-full transition-all duration-300',
                        i <= strength ? STRENGTH_COLORS[strength] : 'bg-muted',
                      )}
                    />
                  ))}
                </div>
                <p className={cn('text-[11px]', strength >= 4 ? 'text-success' : strength >= 3 ? 'text-foreground' : 'text-muted-foreground')}>
                  {STRENGTH_LABELS[strength]}
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Confirm password</label>
            <Input
              type={showCf ? 'text' : 'password'}
              placeholder="Repeat your password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className={mismatch ? 'border-destructive focus:ring-destructive/30' : ''}
              suffix={
                <button type="button" onClick={() => setShowCf(!showCf)} className="text-muted-foreground hover:text-foreground">
                  {showCf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            {mismatch && <p className="text-xs text-destructive">Passwords do not match</p>}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !password || !confirm || mismatch || strength < 2}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? 'Resetting…' : 'Reset password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
