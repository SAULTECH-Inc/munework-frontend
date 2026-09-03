import {
  BookOpen, Search, Users, FileText, Calendar, CheckCircle2,
  Zap, Star, ArrowRight, Target, MessageSquare, BarChart2,
} from 'lucide-react';
import { TopBar } from '@/components/common/TopBar';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useSeo } from '@/lib/seo';

const STEPS = [
  {
    icon: FileText,
    title: 'Post a Job',
    description: 'Create a detailed job posting with clear requirements, compensation range, and company culture to attract the right candidates.',
    action: { label: 'Post a Job', href: '/employer/jobs' },
  },
  {
    icon: Search,
    title: 'Define Your Criteria',
    description: 'Set up screening questions and skill requirements. Our AI will automatically score and rank applicants based on your criteria.',
    action: null,
  },
  {
    icon: Users,
    title: 'Review Candidates',
    description: 'Browse matched candidates in your pipeline. Use our scouting tools to proactively reach out to passive job seekers.',
    action: { label: 'View Candidates', href: '/employer/candidates' },
  },
  {
    icon: MessageSquare,
    title: 'Communicate Directly',
    description: 'Message shortlisted candidates directly through Mune Work. Keep all communications organized in one place.',
    action: { label: 'Open Messages', href: '/chat' },
  },
  {
    icon: Calendar,
    title: 'Schedule Interviews',
    description: 'Use our integrated scheduling tool to set up video, phone, or in-person interviews with one click.',
    action: { label: 'View Schedules', href: '/schedules' },
  },
  {
    icon: CheckCircle2,
    title: 'Make an Offer',
    description: 'Once you find the right fit, extend an offer directly through the platform and track acceptance status.',
    action: null,
  },
];

const TIPS = [
  { icon: Target, title: 'Be Specific', body: 'Detailed job descriptions with clear requirements attract 3× more qualified applicants than vague postings.' },
  { icon: Zap, title: 'Respond Quickly', body: 'Top candidates are off the market within 10 days. Aim to respond to applications within 48 hours.' },
  { icon: Star, title: 'Competitive Compensation', body: 'Always include a salary range. Job posts with compensation details get 30% more qualified applicants.' },
  { icon: BarChart2, title: 'Use Analytics', body: 'Monitor your hiring funnel with our analytics dashboard to identify drop-off points and optimize your process.' },
];

export default function HiringGuidePage() {
  useSeo({
    title: 'Hiring Guide for Employers | Mune Work',
    description: 'How to write a job post that attracts the right people, screen candidates fairly, and hire faster on Mune Work.',
  });

  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <>
      <TopBar title="Hiring Guide" />
      <div className="p-6 max-w-4xl mx-auto space-y-10">

        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-2">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">The Mune Work Hiring Guide</h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Everything you need to attract, evaluate, and hire the best talent — faster. Follow our proven process
            to streamline your recruitment.
          </p>
          {user?.userType === 'employer' && (
            <Button className="mt-2 gap-1.5" onClick={() => navigate('/employer/jobs')}>
              Post a Job <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Steps */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">6-Step Hiring Process</h2>
          <div className="space-y-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="bg-surface border border-border rounded-xl p-4 flex gap-4 items-start">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 relative">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="absolute -top-1.5 -right-1.5 h-4.5 w-4.5 flex items-center justify-center bg-primary text-primary-foreground text-[9px] font-bold rounded-full h-[18px] w-[18px]">
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
                  </div>
                  {step.action && (
                    <Button variant="outline" size="sm" className="shrink-0 h-7 text-xs gap-1"
                      onClick={() => navigate(step.action!.href)}>
                      {step.action.label} <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tips */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">Pro Tips for Faster Hiring</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {TIPS.map((tip, i) => {
              const Icon = tip.icon;
              return (
                <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">{tip.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tip.body}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center space-y-3">
          <h2 className="text-base font-semibold text-foreground">Ready to start hiring?</h2>
          <p className="text-xs text-muted-foreground">Join thousands of employers who found their next great hire on Mune Work.</p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => navigate('/employer/jobs')} className="gap-1.5">
              Post a Job <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" onClick={() => navigate('/help')}>Contact Support</Button>
          </div>
        </div>
      </div>
    </>
  );
}
