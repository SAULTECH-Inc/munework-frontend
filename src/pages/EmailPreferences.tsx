import { useState } from 'react';
import { Mail, Bell, Briefcase, Calendar, Users, Zap, Check, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface PrefGroup {
  id: string;
  icon: React.ElementType;
  label: string;
  items: { key: string; label: string; desc: string }[];
}

const PREF_GROUPS: PrefGroup[] = [
  {
    id: 'jobs',
    icon: Briefcase,
    label: 'Job Alerts',
    items: [
      { key: 'new_job_match',    label: 'New Job Matches',       desc: 'Jobs matching your profile and preferences' },
      { key: 'saved_job_alert',  label: 'Saved Job Updates',     desc: 'Status changes on jobs you have bookmarked' },
      { key: 'company_new_job',  label: 'Company New Postings',  desc: 'New jobs from companies you follow' },
    ],
  },
  {
    id: 'applications',
    icon: Bell,
    label: 'Application Updates',
    items: [
      { key: 'app_viewed',       label: 'Application Viewed',    desc: 'An employer viewed your application' },
      { key: 'app_status',       label: 'Status Changes',        desc: 'Your application moved to a new stage' },
      { key: 'app_shortlisted',  label: 'Shortlisted',           desc: 'You were shortlisted for a position' },
      { key: 'app_rejected',     label: 'Not Selected',          desc: 'Your application was not selected' },
    ],
  },
  {
    id: 'interviews',
    icon: Calendar,
    label: 'Interviews & Schedules',
    items: [
      { key: 'interview_invite',  label: 'Interview Invitations', desc: 'New interview scheduled by an employer' },
      { key: 'interview_remind',  label: 'Interview Reminders',   desc: 'Reminders 24h and 1h before your interview' },
      { key: 'interview_cancel',  label: 'Interview Cancelled',   desc: 'An interview was cancelled or rescheduled' },
    ],
  },
  {
    id: 'network',
    icon: Users,
    label: 'Network & Messages',
    items: [
      { key: 'connection_req',   label: 'Connection Requests',   desc: 'Someone wants to connect with you' },
      { key: 'connection_acc',   label: 'Connection Accepted',   desc: 'Your connection request was accepted' },
      { key: 'new_message',      label: 'New Messages',          desc: 'Unread messages in your inbox' },
    ],
  },
  {
    id: 'autoapply',
    icon: Zap,
    label: 'Auto-Apply',
    items: [
      { key: 'auto_apply_done',  label: 'Applications Sent',     desc: 'Weekly digest of auto-applied jobs' },
      { key: 'auto_apply_fail',  label: 'Failed Applications',   desc: 'Auto-apply submissions that failed' },
      { key: 'auto_apply_reply', label: 'Employer Replies',      desc: 'Replies received on auto-applied jobs' },
    ],
  },
  {
    id: 'platform',
    icon: Mail,
    label: 'Platform & Account',
    items: [
      { key: 'product_updates',  label: 'Product Updates',       desc: 'New features, improvements, and releases' },
      { key: 'weekly_digest',    label: 'Weekly Digest',         desc: 'Summary of activity from the past week' },
      { key: 'tips_and_guides',  label: 'Tips & Career Guides',  desc: 'Articles and guides to help your career' },
      { key: 'security_alerts',  label: 'Security Alerts',       desc: 'Login activity and account security notices' },
    ],
  },
];

const DEFAULTS: Record<string, boolean> = {
  new_job_match: true, saved_job_alert: true, company_new_job: false,
  app_viewed: true, app_status: true, app_shortlisted: true, app_rejected: false,
  interview_invite: true, interview_remind: true, interview_cancel: true,
  connection_req: true, connection_acc: true, new_message: true,
  auto_apply_done: true, auto_apply_fail: true, auto_apply_reply: true,
  product_updates: false, weekly_digest: true, tips_and_guides: false, security_alerts: true,
};

export default function EmailPreferencesPage() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('munework_email_prefs');
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : { ...DEFAULTS };
    } catch { return { ...DEFAULTS }; }
  });
  const [saving, setSaving] = useState(false);

  const toggle = (key: string) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const toggleGroup = (group: PrefGroup, value: boolean) =>
    setPrefs(p => {
      const next = { ...p };
      group.items.forEach(i => { next[i.key] = value; });
      return next;
    });

  const handleSave = () => {
    setSaving(true);
    localStorage.setItem('munework_email_prefs', JSON.stringify(prefs));
    setTimeout(() => { setSaving(false); toast.success('Email preferences saved'); }, 500);
  };

  const enabledCount = Object.values(prefs).filter(Boolean).length;
  const totalCount = Object.keys(DEFAULTS).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" /> Email Preferences
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{enabledCount} of {totalCount} email types enabled</p>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Your data is safe.</strong> We never sell your email address. Security alerts are always sent regardless of your preferences.
          </p>
        </div>

        {PREF_GROUPS.map(group => {
          const Icon = group.icon;
          const allOn = group.items.every(i => prefs[i.key]);
          const allOff = group.items.every(i => !prefs[i.key]);

          return (
            <div key={group.id} className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 bg-surface-raised border-b border-border">
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground flex-1">{group.label}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleGroup(group, true)}
                    className={cn('text-[10px] px-2 py-0.5 rounded border transition-colors',
                      allOn ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
                    All on
                  </button>
                  <button onClick={() => toggleGroup(group, false)}
                    className={cn('text-[10px] px-2 py-0.5 rounded border transition-colors',
                      allOff ? 'bg-surface-raised text-foreground border-border' : 'border-border text-muted-foreground hover:text-foreground')}>
                    All off
                  </button>
                </div>
              </div>
              <div className="divide-y divide-border/50">
                {group.items.map(item => (
                  <label key={item.key} className="flex items-center justify-between px-4 py-3 gap-4 cursor-pointer hover:bg-surface-raised/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    <div className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                      prefs[item.key] ? 'bg-primary' : 'bg-muted',
                    )} onClick={() => toggle(item.key)}>
                      <span className={cn(
                        'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform',
                        prefs[item.key] ? 'translate-x-4' : 'translate-x-0',
                      )} />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        <div className="text-center py-4 space-y-2">
          <p className="text-xs text-muted-foreground">Want to stop all emails? You can also</p>
          <button onClick={() => navigate('/unsubscribe')} className="text-xs text-destructive hover:underline">
            Unsubscribe from all Mune Work emails
          </button>
        </div>
      </div>
    </div>
  );
}
