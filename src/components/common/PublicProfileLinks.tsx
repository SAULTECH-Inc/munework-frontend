import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * "View public profile" / "Copy link" pair for the profile editor.
 *
 * Every link to /profile/:role/:id in the app points outward — employers
 * opening candidates, applicants opening companies. Nothing pointed a user at
 * their own, and the URL needs a user id that is not surfaced anywhere, so the
 * page was effectively unreachable by the person it describes.
 */
export function PublicProfileLinks({ id, role = 'applicant' }: { id: string; role?: 'applicant' | 'employer' }) {
  const [copied, setCopied] = useState(false);
  const path = `/profile/${role}/${id}`;

  const copy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full flex flex-col gap-1.5 pt-1">
      <Button asChild variant="outline" size="sm" className="w-full gap-1.5 text-xs">
        <Link to={path}>
          <Eye className="h-3.5 w-3.5" /> View public profile
        </Link>
      </Button>
      <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs" onClick={copy}>
        {copied
          ? <><Check className="h-3.5 w-3.5 text-success" /> Link copied</>
          : <><Share2 className="h-3.5 w-3.5" /> Copy link</>}
      </Button>
    </div>
  );
}
