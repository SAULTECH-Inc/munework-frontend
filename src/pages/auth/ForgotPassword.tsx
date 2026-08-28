import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Mail, ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await authApi.sendOtp({ email: email.trim(), action: 'reset-password' });
      setSent(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to send reset code. Check the email address and try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleContinue() {
    navigate('/verify-otp', { state: { email: email.trim(), action: 'reset-password' } });
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <span className="text-2xl font-bold">Mune <span className="text-primary">Work</span></span>
        <p className="text-sm text-muted-foreground mt-1">Reset your password</p>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6 space-y-5">
        {!sent ? (
          <>
            <div className="text-center space-y-1 pb-1">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-base font-semibold">Forgot your password?</h2>
              <p className="text-xs text-muted-foreground">
                No worries — enter your email and we'll send you a 6-digit reset code.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Email address</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading || !email.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {loading ? 'Sending…' : 'Send reset code'}
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <Mail className="h-7 w-7 text-success" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Check your inbox</h2>
              <p className="text-xs text-muted-foreground">
                We sent a 6-digit code to{' '}
                <span className="text-foreground font-medium">{email}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Didn't get it? Check your spam folder or{' '}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="text-primary hover:underline"
                >
                  try a different email
                </button>
              </p>
            </div>
            <Button className="w-full" onClick={handleContinue}>
              Enter the code
            </Button>
          </div>
        )}

        <div className="flex items-center justify-center pt-1">
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
