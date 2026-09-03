import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Search, ChevronDown, ChevronUp, MessageSquare, Video,
  Users, BookOpen, Mail, Loader2, CheckCircle2, X,
  HelpCircle, Rocket, Briefcase, Zap, Network, User, CreditCard, Send,
  Building2, ExternalLink, Clock,
} from 'lucide-react';
import { TopBar } from '@/components/common/TopBar';
import { Button } from '@/components/ui/button';
import { helpApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useSeo } from '@/lib/seo';

// ─── Static content ───────────────────────────────────────────────────────────

const FAQS = [
  // getting-started
  { id: 1,  category: 'getting-started', question: 'How do I create my Mune Work account?',                    answer: "Click 'Sign Up', choose Job Seeker or Employer, fill in your details, verify your email and you're ready. The whole process takes under 2 minutes." },
  { id: 2,  category: 'getting-started', question: 'How do I verify my email address?',                     answer: 'After signing up, we send a 6-digit OTP to your email. Enter it on the verification screen. OTPs are valid for 10 minutes — check your spam folder if you don\'t see it.' },
  { id: 3,  category: 'getting-started', question: 'Can I use Google or LinkedIn to sign in?',              answer: 'Yes! Click "Continue with Google" or "Continue with LinkedIn" on the login screen. Your account is linked automatically on first sign-in.' },
  { id: 4,  category: 'getting-started', question: 'What is the difference between Applicant and Employer accounts?', answer: 'Applicant accounts let you search jobs, apply, use Auto Apply, manage your CV, and track interviews. Employer accounts let you post jobs, manage applications, shortlist candidates, and view analytics.' },
  { id: 5,  category: 'getting-started', question: 'How do I reset my password?',                           answer: 'Click "Forgot password" on the login page. Enter your email, receive the OTP (valid 10 minutes), enter it, and set a new password. If expired, request a new OTP.' },
  { id: 6,  category: 'getting-started', question: 'Can I switch between Applicant and Employer roles?',    answer: 'Not directly — each role requires a separate account. If you need both, create two accounts with different email addresses.' },
  { id: 7,  category: 'getting-started', question: 'Is my data safe on Mune Work?',                           answer: 'Yes. We encrypt data in transit (TLS) and at rest. We never sell your personal data to third parties. You can delete your account and all associated data at any time from Settings → Danger Zone.' },

  // job-search
  { id: 8,  category: 'job-search', question: 'How do I search and filter jobs?',                          answer: 'Go to the Jobs page. Use the search bar for keywords, then filter by job type (full-time, contract, remote), location, salary range, experience level, and employment type. Your filters are remembered per session.' },
  { id: 9,  category: 'job-search', question: 'What types of jobs are available on Mune Work?',               answer: 'Full-time, part-time, contract, freelance, internship, hybrid, and remote jobs across all industries. Locations span Nigeria and international markets.' },
  { id: 10, category: 'job-search', question: 'How do I save jobs to apply later?',                        answer: 'Click the bookmark icon on any job card or job detail page. Saved jobs appear under "Saved Jobs" in the sidebar.' },
  { id: 11, category: 'job-search', question: 'How do I improve my job match score?',                      answer: 'Complete your profile 100%, add relevant skills, upload an updated CV, and set accurate preferences (location, salary, job type). Our AI uses all of these signals.' },
  { id: 12, category: 'job-search', question: 'Can I apply with a cover letter?',                          answer: 'Yes. When applying, you can type a custom cover letter, use one you\'ve saved previously, or generate one with AI. Cover letters improve your match score.' },
  { id: 13, category: 'job-search', question: 'How do I track my applications?',                           answer: 'Go to Applications in the sidebar. You\'ll see statuses: Submitted, Under Review, Shortlisted, Interview Scheduled, Offered, and Rejected — all updated in real time.' },

  // auto-apply
  { id: 14, category: 'auto-apply', question: 'How does Auto Apply work?',                                 answer: 'Auto Apply uses AI to match your profile with relevant jobs and submits applications automatically. Set your preferences (job types, location, salary, excluded companies) and toggle it on. You\'ll be notified of each application.' },
  { id: 15, category: 'auto-apply', question: 'Can I pause or stop Auto Apply?',                           answer: 'Yes. Go to the Auto Apply page and toggle "Pause auto apply". Your settings are saved and resume when you turn it back on.' },
  { id: 16, category: 'auto-apply', question: 'How do I exclude specific companies from Auto Apply?',      answer: 'In Auto Apply settings, scroll to "Company preferences". Add any company names you want to skip in the "Excluded companies" field.' },
  { id: 17, category: 'auto-apply', question: 'What is the minimum AI match score?',                       answer: 'The default minimum match score is 50%. You can raise this (e.g. 70%) to target only highly relevant jobs, or lower it to cast a wider net. This is configurable in Auto Apply settings.' },
  { id: 18, category: 'auto-apply', question: 'Will I be notified when Auto Apply submits an application?', answer: 'Yes. Every automatic application triggers a push notification and appears in your Applications list so you have full visibility.' },

  // networking
  { id: 19, category: 'networking', question: 'How do I connect with other professionals?',                answer: 'Visit the Network page → Find Connections tab. Search by name, location, or profession. Send a connection request — they\'ll get a notification and can accept or ignore it.' },
  { id: 20, category: 'networking', question: 'Can I follow employers?',                                   answer: 'Yes! On an employer\'s public profile page, click "Follow". You\'ll receive notifications when they post new jobs or updates.' },
  { id: 21, category: 'networking', question: 'How do I message someone?',                                 answer: 'Go to the Chat page in the sidebar. You can start a conversation with any connection. Messages are delivered in real time.' },

  // profile
  { id: 22, category: 'profile', question: 'How do I update my CV/resume?',                               answer: 'Go to Settings → Resume & AI or the Resume page. Upload a new CV file or use the AI Resume Builder to edit work experience, skills, education, and certifications.' },
  { id: 23, category: 'profile', question: 'How do I control who sees my profile?',                        answer: 'Go to Settings → Privacy. Choose from: Public (anyone), Employers Only, My Network Only, or Private (only you).' },
  { id: 24, category: 'profile', question: 'What is profile completeness?',                               answer: 'A score (0–100%) showing how complete your profile is. A higher score improves AI matching and visibility to employers. Fill in your headline, experience, education, skills, and upload a photo.' },
  { id: 25, category: 'profile', question: 'Can I have multiple CVs?',                                    answer: 'Yes. Go to the Resume page and add multiple CV profiles. You can mark one as default and select a specific CV when applying to each job.' },

  // billing
  { id: 26, category: 'billing', question: 'How do I upgrade my plan?',                                   answer: 'Go to Settings → Billing or the Plans page. Choose a plan and click "Get started". Select your payment method (Paystack, Stripe, or Flutterwave) and complete the checkout.' },
  { id: 27, category: 'billing', question: 'Is there a free trial?',                                      answer: 'Yes! All paid plans include a 7-day free trial. No credit card required to start. You can cancel before the trial ends with no charge.' },
  { id: 28, category: 'billing', question: 'How do I cancel my subscription?',                            answer: 'Go to Settings → Billing and click "Cancel". Your subscription will remain active until the end of the billing period. You won\'t be charged again.' },
  { id: 29, category: 'billing', question: 'What payment methods are accepted?',                          answer: 'We accept payments via Paystack (cards, bank transfer, USSD), Stripe (international cards), and Flutterwave (cards, mobile money). Choose your preferred method at checkout.' },

  // employers
  { id: 30, category: 'employers', question: 'How do I post a job?',                                       answer: 'Go to Employer → Jobs → Post a Job. Fill in the title, description, requirements, salary range, job type, and location. Set an application deadline and click Publish.' },
  { id: 31, category: 'employers', question: 'How do I review applications?',                              answer: 'Go to Employer → Jobs → click a job → View Applications. See each applicant\'s CV, match score, cover letter, and screening answers. Use the status panel to shortlist, reject, or schedule interviews.' },
  { id: 32, category: 'employers', question: 'What are Screening Questions?',                              answer: 'When posting a job, you can add custom screening questions (text, yes/no, multiple choice). Applicants answer these during the apply flow, and their answers appear in the application review.' },
  { id: 33, category: 'employers', question: 'How does AI auto-shortlisting work?',                        answer: 'In AI Settings when posting a job, enable "Auto-shortlist" and set a threshold (e.g. 80%). Applications scoring above this are automatically moved to Shortlisted — saving you hours of manual review.' },
  { id: 34, category: 'employers', question: 'Can I schedule interviews through Mune Work?',                  answer: 'Yes. From the application detail, click "Schedule interview". Set the date, time, type (video/in-person), and a meeting link. The applicant gets a notification and calendar invite.' },
  { id: 35, category: 'employers', question: 'What is Candidate Scout?',                                   answer: 'Candidate Scout lets you proactively search for talent by skills, location, experience, and job level — even before they apply to your jobs. It\'s available on paid plans.' },
];

const CATEGORIES = [
  { id: 'all',             label: 'All Topics',       icon: BookOpen,   },
  { id: 'getting-started', label: 'Getting Started',  icon: Rocket,     },
  { id: 'job-search',      label: 'Job Search',       icon: Briefcase,  },
  { id: 'auto-apply',      label: 'Auto Apply',       icon: Zap,        },
  { id: 'networking',      label: 'Networking',       icon: Network,    },
  { id: 'profile',         label: 'Profile & Resume', icon: User,       },
  { id: 'billing',         label: 'Billing & Plans',  icon: CreditCard, },
  { id: 'employers',       label: 'For Employers',    icon: Building2,  },
].map(c => ({
  ...c,
  count: c.id === 'all' ? FAQS.length : FAQS.filter(f => f.category === c.id).length,
}));

const TUTORIALS = [
  { title: 'Complete Profile Setup',    duration: '5 min',  emoji: '🎯', desc: 'Set up your profile for maximum visibility.' },
  { title: 'Mastering Auto Apply',      duration: '8 min',  emoji: '🤖', desc: 'Configure Auto Apply for best results.' },
  { title: 'Networking Like a Pro',     duration: '12 min', emoji: '🤝', desc: 'Build your professional network fast.' },
  { title: 'Resume Optimization Tips',  duration: '10 min', emoji: '📄', desc: 'Optimize your CV to stand out.' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  useSeo({
    title: 'Help and Support | Mune Work',
    description: 'Answers to common questions about applying, hiring, your profile and your account, plus how to reach the Mune Work team.',
  });

  const [searchQuery,  setSearchQuery]  = useState('');
  const [selectedCat,  setSelectedCat]  = useState('all');
  const [expandedFaq,  setExpandedFaq]  = useState<number | null>(null);
  const [modal,        setModal]        = useState<'demo' | 'message' | 'tutorials' | 'forum' | null>(null);
  const [submitted,    setSubmitted]    = useState(false);
  const [contactForm, setContactForm]   = useState({ name: '', email: '', subject: '', message: '', priority: 'MEDIUM' });
  const [demoForm, setDemoForm]         = useState({ name: '', email: '', company: '', phone: '', preferredDate: '', preferredTime: '' });

  const submitContact = useMutation({
    mutationFn: () => helpApi.submitContact(contactForm),
    onSuccess: () => { setSubmitted(true); toast.success('Message sent!'); },
    onError:   () => toast.error('Failed to send. Please try again.'),
  });

  const submitDemo = useMutation({
    mutationFn: () => helpApi.submitDemo(demoForm),
    onSuccess: () => { toast.success('Demo request submitted!'); setModal(null); },
    onError:   () => toast.error('Failed to submit. Please try again.'),
  });

  const filteredFaqs = useMemo(() => FAQS.filter(f => {
    const matchesCat    = selectedCat === 'all' || f.category === selectedCat;
    const q             = searchQuery.toLowerCase();
    const matchesSearch = !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  }), [selectedCat, searchQuery]);

  return (
    <>
      <TopBar title="Help & Support" />

      <div className="p-4 max-w-4xl mx-auto space-y-6 pb-10">

        {/* Hero search */}
        <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 rounded-2xl p-8 text-center space-y-4">
          <h2 className="text-xl font-bold text-foreground">How can we help you?</h2>
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search help articles, tutorials, or FAQs…"
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-surface text-sm outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
            />
          </div>
          {/* Support contact chip */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span>Email us at</span>
            <a href="mailto:support@munework.com" className="text-primary hover:underline font-medium">support@munework.com</a>
            <span>·</span>
            <Clock className="h-3 w-3" />
            <span>Response within 24 h</span>
          </div>
        </div>

        {/* Quick action cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Schedule a Demo',  sub: 'Get a personalized walkthrough', icon: Video,        action: 'demo',      gradient: 'from-blue-500/20 to-purple-500/20',  border: 'border-blue-500/20'   },
            { label: 'Leave a Message',  sub: 'We reply within 24 hours',       icon: MessageSquare, action: 'message',  gradient: 'from-green-500/20 to-teal-500/20',   border: 'border-green-500/20'  },
            { label: 'Video Tutorials',  sub: 'Step-by-step guides',            icon: BookOpen,      action: 'tutorials', gradient: 'from-orange-500/20 to-red-500/20',   border: 'border-orange-500/20' },
            { label: 'Community Forum',  sub: 'Connect with other users',       icon: Users,         action: 'forum',    gradient: 'from-purple-500/20 to-pink-500/20',  border: 'border-purple-500/20' },
          ].map(a => (
            <button key={a.action}
              onClick={() => setModal(a.action as any)}
              className={cn(
                'flex flex-col items-start gap-2 p-4 rounded-2xl bg-gradient-to-br border text-left hover:opacity-90 transition-opacity',
                a.gradient, a.border,
              )}>
              <a.icon className="h-5 w-5 text-foreground" />
              <p className="text-xs font-semibold text-foreground">{a.label}</p>
              <p className="text-[11px] text-muted-foreground">{a.sub}</p>
            </button>
          ))}
        </div>

        {/* FAQ section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Frequently Asked Questions
              <span className="ml-2 text-xs font-normal text-muted-foreground">({filteredFaqs.length} article{filteredFaqs.length !== 1 ? 's' : ''})</span>
            </h3>
          </div>

          {/* Category chips */}
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c.id}
                onClick={() => setSelectedCat(c.id)}
                className={cn(
                  'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors',
                  selectedCat === c.id
                    ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}>
                <c.icon className="h-3 w-3" />
                {c.label}
                <span className="text-[10px] opacity-60">({c.count})</span>
              </button>
            ))}
          </div>

          {/* FAQ list */}
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No articles match your search.{' '}
              <button className="text-primary underline" onClick={() => setModal('message')}>Contact support</button>
            </div>
          ) : (
            <div className="divide-y divide-border/50 rounded-xl border border-border bg-surface overflow-hidden">
              {filteredFaqs.map(faq => (
                <div key={faq.id}>
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-raised transition-colors"
                  >
                    <p className="text-sm font-medium text-foreground pr-4">{faq.question}</p>
                    {expandedFaq === faq.id
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </button>
                  {expandedFaq === faq.id && (
                    <div className="px-5 pb-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact form */}
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Contact Support</h3>
            </div>
            <a href="mailto:support@munework.com" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
              <ExternalLink className="h-3 w-3" /> support@munework.com
            </a>
          </div>

          {submitted ? (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
              <CheckCircle2 className="h-10 w-10 text-success" />
              <p className="text-sm font-medium text-foreground">Message sent!</p>
              <p className="text-xs text-muted-foreground">We'll get back to you within 24 hours.</p>
              <Button size="sm" variant="outline" className="text-xs mt-2" onClick={() => { setSubmitted(false); setContactForm({ name: '', email: '', subject: '', message: '', priority: 'MEDIUM' }); }}>
                Send another
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              <LabelInput label="Name" placeholder="Your full name"
                value={contactForm.name} onChange={v => setContactForm(p => ({ ...p, name: v }))} />
              <LabelInput label="Email" type="email" placeholder="your@email.com"
                value={contactForm.email} onChange={v => setContactForm(p => ({ ...p, email: v }))} />
              <LabelInput label="Subject" placeholder="Brief description of issue"
                value={contactForm.subject} onChange={v => setContactForm(p => ({ ...p, subject: v }))} className="sm:col-span-2" />
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Message</label>
                <textarea
                  value={contactForm.message}
                  onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                  rows={4} placeholder="Describe your issue in detail…"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-1 focus:ring-primary/50 resize-none placeholder:text-muted-foreground" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                <select value={contactForm.priority} onChange={e => setContactForm(p => ({ ...p, priority: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-1 focus:ring-primary/50">
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <Button className="w-full gap-1.5 text-sm" onClick={() => submitContact.mutate()}
                  disabled={submitContact.isPending || !contactForm.name || !contactForm.email || !contactForm.message}>
                  {submitContact.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send message
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}

      {/* Demo modal */}
      {modal === 'demo' && (
        <Modal title="Schedule a Demo" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Get a personalized 30-minute walkthrough of Mune Work's features with one of our team members.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <LabelInput label="Name" placeholder="Your name" value={demoForm.name} onChange={v => setDemoForm(p => ({ ...p, name: v }))} />
              <LabelInput label="Email" type="email" placeholder="your@email.com" value={demoForm.email} onChange={v => setDemoForm(p => ({ ...p, email: v }))} />
              <LabelInput label="Company" placeholder="Company name" value={demoForm.company} onChange={v => setDemoForm(p => ({ ...p, company: v }))} />
              <LabelInput label="Phone" type="tel" placeholder="+234 xxx xxxx" value={demoForm.phone} onChange={v => setDemoForm(p => ({ ...p, phone: v }))} />
              <LabelInput label="Preferred date" type="date" value={demoForm.preferredDate} onChange={v => setDemoForm(p => ({ ...p, preferredDate: v }))} />
              <LabelInput label="Preferred time" type="time" value={demoForm.preferredTime} onChange={v => setDemoForm(p => ({ ...p, preferredTime: v }))} />
            </div>
            <Button className="w-full gap-1.5 text-sm mt-2" onClick={() => submitDemo.mutate()} disabled={submitDemo.isPending || !demoForm.name || !demoForm.email}>
              {submitDemo.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
              Book demo
            </Button>
          </div>
        </Modal>
      )}

      {/* Message / Leave a message modal */}
      {modal === 'message' && (
        <Modal title="Leave a Message" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
              Our team typically responds within 24 hours on business days.
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <LabelInput label="Name" placeholder="Your name"
                value={contactForm.name} onChange={v => setContactForm(p => ({ ...p, name: v }))} />
              <LabelInput label="Email" type="email" placeholder="your@email.com"
                value={contactForm.email} onChange={v => setContactForm(p => ({ ...p, email: v }))} />
              <LabelInput label="Subject" placeholder="What's this about?"
                value={contactForm.subject} onChange={v => setContactForm(p => ({ ...p, subject: v }))} className="sm:col-span-2" />
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Message</label>
                <textarea rows={4} placeholder="Describe your issue…"
                  value={contactForm.message}
                  onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-1 focus:ring-primary/50 resize-none placeholder:text-muted-foreground" />
              </div>
            </div>
            {submitted ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
                <p className="text-sm font-medium text-foreground">Message sent! We'll reply to your email.</p>
              </div>
            ) : (
              <Button className="w-full gap-1.5 text-sm" onClick={() => submitContact.mutate()}
                disabled={submitContact.isPending || !contactForm.name || !contactForm.email || !contactForm.message}>
                {submitContact.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send message
              </Button>
            )}
          </div>
        </Modal>
      )}

      {/* Tutorials modal */}
      {modal === 'tutorials' && (
        <Modal title="Video Tutorials" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Video tutorials are coming soon. Subscribe to our newsletter to be notified.
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {TUTORIALS.map((t, i) => (
                <div key={i} className="bg-surface-raised border border-border rounded-xl p-4 space-y-2 opacity-70">
                  <div className="text-2xl">{t.emoji}</div>
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>{t.duration}</span>
                    <span className="px-1.5 py-0.5 rounded bg-surface text-[10px] border border-border">Coming soon</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Forum modal */}
      {modal === 'forum' && (
        <Modal title="Community Forum" onClose={() => setModal(null)}>
          <div className="space-y-4 text-center py-4">
            <div className="h-16 w-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto">
              <Users className="h-8 w-8 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Community Forum — Coming Soon</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Our community forum is under construction. In the meantime, reach us directly via email or schedule a demo.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { setModal('message'); }}>
                <MessageSquare className="h-3.5 w-3.5" /> Leave a message
              </Button>
              <Button size="sm" className="gap-1.5 text-xs" onClick={() => { setModal('demo'); }}>
                <Video className="h-3.5 w-3.5" /> Book a demo
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function LabelInput({ label, value, onChange, placeholder, type = 'text', className }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground" />
    </div>
  );
}
