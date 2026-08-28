import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ResetSuccessPage() {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <span className="text-2xl font-bold">Mune <span className="text-primary">Work</span></span>
      </div>

      <div className="bg-surface rounded-xl border border-border p-8 text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold">Password reset!</h2>
          <p className="text-sm text-muted-foreground">
            Your password has been updated successfully. You can now sign in with your new password.
          </p>
        </div>

        <Button className="w-full" asChild>
          <Link to="/login">Sign in now</Link>
        </Button>
      </div>
    </div>
  );
}
