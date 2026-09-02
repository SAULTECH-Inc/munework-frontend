import { Outlet, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { AppLayout } from './AppLayout';
import { Button } from '@/components/ui/button';

/**
 * Wrapper for pages that must work with or without a session: job listings,
 * company profiles, and the static content pages.
 *
 * These are the pages worth ranking and worth sharing — a job link sent to a
 * candidate, a company profile reached from a listing — so they cannot sit
 * under AppLayout, which redirects anonymous visitors to /login.
 *
 * Signed-in visitors still get the full app chrome: this is the same page they
 * reach from search or a job listing, and losing the sidebar mid-session would
 * feel like being logged out. Anonymous visitors get a marketing shell instead.
 */
export function PublicLayout() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  // Waiting for the persisted store avoids a flash of the signed-out header
  // for someone who is actually logged in.
  if (!_hasHydrated) return null;

  // AppLayout renders its own <Outlet/>, and Outlet resolves by route nesting
  // rather than component nesting, so the child route still lands correctly.
  if (isAuthenticated) return <AppLayout />;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/icon.svg" alt="" className="h-8 w-8 rounded-lg" />
            <span className="font-bold text-base tracking-tight text-foreground">Mune Work</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-sm">
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild size="sm" className="text-sm">
              <Link to="/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Mune Work. Find work that fits.
          </p>
          <nav className="flex items-center gap-5 text-xs text-muted-foreground">
            <Link to="/jobs" className="hover:text-foreground transition-colors">Browse jobs</Link>
            <Link to="/companies" className="hover:text-foreground transition-colors">Companies</Link>
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
