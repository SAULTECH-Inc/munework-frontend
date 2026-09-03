import { useState, useRef } from 'react';
import {
  Search, X, ChevronDown, ChevronRight, Shield, Users, Briefcase,
  CreditCard, Zap, Network, Mail, Phone, BookOpen, FileText,
} from 'lucide-react';
import { TopBar } from '@/components/common/TopBar';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useSeo } from '@/lib/seo';

const LAST_UPDATED = 'June 18, 2025';
const VERSION = '3.0';
const LEGAL_EMAIL = 'legal@munework.com';
const SUPPORT_EMAIL = 'support@munework.com';
const SUPPORT_PHONE = '+1 (800) MUNE-WORK';

interface Section {
  id: string;
  title: string;
  icon?: React.ElementType;
  collapsible?: boolean;
  content: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    id: 'acceptance-of-terms',
    title: 'Acceptance of Terms',
    icon: FileText,
    content: (
      <>
        <p className="mb-3 text-sm text-muted-foreground leading-relaxed">
          By accessing or using Mune Work's platform, services, or applications (collectively, the "Service"), you agree to
          be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, you may not access or
          use the Service.
        </p>
        <p className="mb-3 text-sm text-muted-foreground leading-relaxed">
          These Terms constitute a legally binding agreement between you and Mune Work, Inc. ("Mune Work", "we", "us", or
          "our"). By creating an account or using any part of our Service, you confirm that you are at least 18 years
          of age and have the legal capacity to enter into this agreement.
        </p>
        <HighlightBox type="info">
          <strong>Important:</strong> These Terms were last updated on {LAST_UPDATED} (Version {VERSION}). Please review
          them regularly as we may update them from time to time.
        </HighlightBox>
      </>
    ),
  },
  {
    id: 'description-of-service',
    title: 'Description of Service',
    icon: Briefcase,
    content: (
      <>
        <p className="mb-3 text-sm text-muted-foreground leading-relaxed">
          Mune Work is a professional career platform that connects job seekers with employers through intelligent matching
          technology, automated application systems, and professional networking tools. Our services include:
        </p>
        <ul className="mb-3 list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
          <li>AI-powered job matching and recommendations</li>
          <li>Automated job application submission (Auto-Apply)</li>
          <li>Professional profile creation and management</li>
          <li>Candidate scouting and recruitment tools for employers</li>
          <li>Professional networking and connection features</li>
          <li>Interview scheduling and management</li>
          <li>Resume and CV builder with AI optimization</li>
          <li>Career assessment and screening tools</li>
          <li>Subscription-based premium features</li>
        </ul>
      </>
    ),
  },
  {
    id: 'user-accounts',
    title: 'User Accounts and Registration',
    icon: Users,
    collapsible: true,
    content: (
      <>
        <h4 className="text-sm font-semibold text-foreground mb-2">Account Creation</h4>
        <p className="mb-3 text-sm text-muted-foreground leading-relaxed">
          To access our full range of services, you must create an account by providing accurate, current, and complete
          information. You are responsible for maintaining the confidentiality of your account credentials and for all
          activities that occur under your account.
        </p>
        <h4 className="text-sm font-semibold text-foreground mb-2">Account Responsibilities</h4>
        <ul className="mb-3 list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
          <li>Provide truthful and accurate information in your profile</li>
          <li>Keep your account credentials secure and confidential</li>
          <li>Notify us immediately of any unauthorized account access</li>
          <li>Do not share your account with third parties</li>
          <li>Maintain a single account per individual or organization</li>
        </ul>
        <HighlightBox type="warning">
          <strong>Note:</strong> Mune Work reserves the right to suspend or terminate accounts that violate these Terms or
          provide false information.
        </HighlightBox>
      </>
    ),
  },
  {
    id: 'job-seeker-responsibilities',
    title: 'Job Seeker Responsibilities',
    collapsible: true,
    content: (
      <>
        <h4 className="text-sm font-semibold text-foreground mb-2">Profile Accuracy</h4>
        <p className="mb-3 text-sm text-muted-foreground leading-relaxed">
          As a job seeker, you are responsible for ensuring your profile accurately represents your qualifications,
          experience, and skills. Misrepresentation of credentials may result in immediate account termination.
        </p>
        <h4 className="text-sm font-semibold text-foreground mb-2">Professional Conduct</h4>
        <ul className="mb-3 list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
          <li>Represent yourself honestly in all applications and communications</li>
          <li>Respond to employer inquiries in a timely and professional manner</li>
          <li>Withdraw applications for positions you are no longer interested in</li>
          <li>Honor interview commitments or provide advance notice of cancellations</li>
        </ul>
        <h4 className="text-sm font-semibold text-foreground mb-2">Prohibited Activities</h4>
        <ul className="mb-3 list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
          <li>Creating fake or misleading profile information</li>
          <li>Submitting applications with fraudulent credentials</li>
          <li>Using the platform for any purpose other than genuine job seeking</li>
          <li>Harassing or threatening employers or other users</li>
        </ul>
      </>
    ),
  },
  {
    id: 'employer-guidelines',
    title: 'Employer and Job Posting Guidelines',
    icon: Briefcase,
    collapsible: true,
    content: (
      <>
        <h4 className="text-sm font-semibold text-foreground mb-2">Legitimate Job Postings</h4>
        <p className="mb-3 text-sm text-muted-foreground leading-relaxed">
          Employers must post only legitimate, available positions with accurate job descriptions, requirements,
          compensation information, and company details. All job postings are subject to review and approval.
        </p>
        <h4 className="text-sm font-semibold text-foreground mb-2">Candidate Scouting Ethics</h4>
        <p className="mb-3 text-sm text-muted-foreground leading-relaxed">
          When using our candidate scouting tools, employers must respect candidate privacy settings and comply with
          all applicable employment laws and anti-discrimination regulations.
        </p>
        <h4 className="text-sm font-semibold text-foreground mb-2">Prohibited Practices</h4>
        <ul className="mb-3 list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
          <li>Posting fake or misleading job opportunities</li>
          <li>Requesting personal information beyond professional requirements</li>
          <li>Discriminatory hiring practices</li>
          <li>Multi-level marketing or pyramid scheme opportunities</li>
          <li>Jobs requiring upfront payments from candidates</li>
        </ul>
      </>
    ),
  },
  {
    id: 'payment-terms',
    title: 'Payment and Subscription Terms',
    icon: CreditCard,
    content: (
      <>
        <h4 className="text-sm font-semibold text-foreground mb-2">Subscription Plans</h4>
        <p className="mb-3 text-sm text-muted-foreground leading-relaxed">
          Mune Work offers various subscription tiers for enhanced features:
        </p>
        <ul className="mb-3 list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
          <li><strong>Basic (Free):</strong> Profile creation, job search, and basic networking</li>
          <li><strong>Professional:</strong> Auto-apply, advanced filters, and priority support</li>
          <li><strong>Premium:</strong> Unlimited auto-apply, recruiter insights, and career coaching</li>
          <li><strong>Enterprise:</strong> Advanced scouting tools, bulk posting, and analytics</li>
        </ul>
        <HighlightBox type="success">
          <strong>Billing:</strong> Subscriptions are billed monthly or annually. Cancel anytime with continued access
          until the end of your billing period.
        </HighlightBox>
      </>
    ),
  },
  {
    id: 'auto-apply',
    title: 'Auto-Apply and Smart Matching Services',
    icon: Zap,
    collapsible: true,
    content: (
      <>
        <h4 className="text-sm font-semibold text-foreground mb-2">How Auto-Apply Works</h4>
        <p className="mb-3 text-sm text-muted-foreground leading-relaxed">
          Our auto-apply feature automatically submits job applications based on your specified criteria, preferences,
          and profile information. You maintain full control over which types of positions and companies receive
          applications.
        </p>
        <h4 className="text-sm font-semibold text-foreground mb-2">Smart Matching Algorithm</h4>
        <p className="mb-3 text-sm text-muted-foreground leading-relaxed">
          Our proprietary matching algorithm considers multiple factors including skills, experience, location
          preferences, company culture fit, and career goals to suggest optimal job opportunities and candidates.
        </p>
        <HighlightBox type="warning">
          <strong>Important:</strong> While our technology enhances your job search, you remain responsible for all
          applications submitted and should review opportunities that result in interviews or offers.
        </HighlightBox>
      </>
    ),
  },
  {
    id: 'networking',
    title: 'Professional Networking Features',
    icon: Network,
    collapsible: true,
    content: (
      <>
        <p className="mb-3 text-sm text-muted-foreground leading-relaxed">
          Mune Work's networking features allow you to connect with industry professionals, join professional groups,
          participate in career discussions, and build your professional brand.
        </p>
        <h4 className="text-sm font-semibold text-foreground mb-2">Networking Guidelines</h4>
        <ul className="mb-3 list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
          <li>Maintain professional communication standards</li>
          <li>Respect others' privacy and connection preferences</li>
          <li>Share relevant, valuable professional content</li>
          <li>Avoid spam, solicitation, or inappropriate content</li>
        </ul>
      </>
    ),
  },
  {
    id: 'data-privacy',
    title: 'Data Privacy and Protection',
    icon: Shield,
    content: (
      <>
        <p className="mb-3 text-sm text-muted-foreground leading-relaxed">
          Your privacy is paramount. We collect and use professional information to provide our services, including
          job matching, networking facilitation, and career development. All data handling complies with applicable
          privacy laws including GDPR and CCPA.
        </p>
        <HighlightBox type="info">
          <strong>Data Control:</strong> You can download, modify, or delete your profile data at any time through
          your account settings.
        </HighlightBox>
      </>
    ),
  },
  {
    id: 'platform-fees',
    title: 'Platform Fees and Premium Features',
    collapsible: true,
    content: (
      <>
        <p className="mb-3 text-sm text-muted-foreground leading-relaxed">
          Mune Work operates on a freemium model with optional premium subscriptions:
        </p>
        <ul className="mb-3 list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
          <li>Basic job search and networking: Free</li>
          <li>Premium job seeker features: $19.99/month</li>
          <li>Professional recruiter tools: $99/month</li>
          <li>Enterprise solutions: Custom pricing</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          All fees are clearly disclosed before subscription activation. Premium features enhance your experience
          but core functionality remains free.
        </p>
      </>
    ),
  },
  {
    id: 'dispute-resolution',
    title: 'Dispute Resolution',
    collapsible: true,
    content: (
      <>
        <h4 className="text-sm font-semibold text-foreground mb-2">User Disputes</h4>
        <p className="mb-3 text-sm text-muted-foreground leading-relaxed">
          For disputes between users (job seekers and employers), we provide mediation services and reporting tools.
          We encourage professional communication and fair treatment of all platform users.
        </p>
        <h4 className="text-sm font-semibold text-foreground mb-2">Platform Disputes</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Issues with Mune Work services should first be reported through our support system. For unresolved matters,
          binding arbitration may be required as outlined in our complete terms.
        </p>
      </>
    ),
  },
  {
    id: 'limitation-of-liability',
    title: 'Limitation of Liability',
    icon: Shield,
    content: (
      <>
        <HighlightBox type="warning">
          <strong>Important:</strong> Mune Work facilitates connections between job seekers and employers but cannot
          guarantee job placement, interview success, or hiring outcomes.
        </HighlightBox>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          While we strive to provide accurate job information and quality matches, we are not responsible for employer
          decisions, job offer accuracy, workplace conditions, or employment outcomes. Users engage with employers at
          their own discretion.
        </p>
      </>
    ),
  },
  {
    id: 'account-termination',
    title: 'Account Termination',
    collapsible: true,
    content: (
      <>
        <p className="mb-3 text-sm text-muted-foreground leading-relaxed">
          Either party may terminate an account at any time. We reserve the right to suspend or terminate accounts
          that violate these Terms, engage in fraudulent activity, or misuse our platform.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Upon termination, your profile data will be removed according to our data retention policy, though some
          information may be retained for legal compliance purposes.
        </p>
      </>
    ),
  },
  {
    id: 'modifications',
    title: 'Modifications to Terms',
    content: (
      <>
        <p className="mb-3 text-sm text-muted-foreground leading-relaxed">
          We may update these Terms to reflect new features, legal requirements, or platform improvements. Significant
          changes will be communicated via email and platform notifications at least 30 days before taking effect.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Continued use of Mune Work after changes constitutes acceptance of the updated Terms.
        </p>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact Information',
    icon: Mail,
    content: (
      <>
        <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
          For questions about these Terms and Conditions or our services:
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-foreground">
            <Mail className="h-4 w-4 text-primary shrink-0" />
            <a href={`mailto:${LEGAL_EMAIL}`} className="hover:underline text-primary">{LEGAL_EMAIL}</a>
          </div>
          <div className="flex items-center gap-3 text-sm text-foreground">
            <Phone className="h-4 w-4 text-warning shrink-0" />
            <span>{SUPPORT_PHONE}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-foreground">
            <Users className="h-4 w-4 text-success shrink-0" />
            <span>Support Center: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a></span>
          </div>
        </div>
        <HighlightBox type="success" className="mt-4">
          <strong>Response Time:</strong> We typically respond to inquiries within 24–48 hours during business days.
        </HighlightBox>
      </>
    ),
  },
];

function HighlightBox({ type, children, className }: {
  type: 'info' | 'warning' | 'success' | 'error';
  children: React.ReactNode;
  className?: string;
}) {
  const styles = {
    info:    'bg-primary/5 border-primary/30 text-primary',
    warning: 'bg-warning/5 border-warning/30 text-warning',
    success: 'bg-success/5 border-success/30 text-success',
    error:   'bg-destructive/5 border-destructive/30 text-destructive',
  };
  return (
    <div className={cn('border rounded-lg px-4 py-3 text-sm', styles[type], className)}>
      {children}
    </div>
  );
}

export default function TermsPage() {
  useSeo({
    title: 'Terms of Service | Mune Work',
    description: 'The terms that govern your use of Mune Work, for both job seekers and employers.',
  });

  const [search, setSearch] = useState('');
  const [showToc, setShowToc] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const scrollTo = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredSections = search
    ? SECTIONS.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase())
      )
    : SECTIONS;

  return (
    <>
      <TopBar title="Terms & Conditions" />
      <div className="p-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6 space-y-3">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                Terms and Conditions
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Last Updated: {LAST_UPDATED} &nbsp;·&nbsp; Version {VERSION}
              </p>
            </div>
            <button
              onClick={() => setShowToc(!showToc)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors"
            >
              {showToc ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Table of Contents
            </button>
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search sections…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-8 h-8 text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-6 items-start">
          {/* TOC sidebar */}
          {showToc && !search && (
            <div className="w-56 shrink-0 sticky top-4">
              <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contents</p>
                {SECTIONS.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className="w-full text-left text-xs text-muted-foreground hover:text-foreground flex items-center gap-2 py-1 px-2 rounded-md hover:bg-surface-raised transition-colors"
                  >
                    <span className="text-[10px] font-mono text-muted-foreground/50 w-4">{String(i + 1).padStart(2, '0')}</span>
                    <span className="truncate">{s.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sections */}
          <div className="flex-1 space-y-4 min-w-0">
            {filteredSections.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">
                No sections match "<strong>{search}</strong>"
              </div>
            ) : filteredSections.map((section, i) => {
              const Icon = section.icon;
              const isCollapsed = collapsed.has(section.id);
              const sectionIndex = SECTIONS.findIndex(s => s.id === section.id) + 1;

              return (
                <div
                  key={section.id}
                  ref={el => { sectionRefs.current[section.id] = el; }}
                  className="bg-surface border border-border rounded-xl overflow-hidden"
                >
                  <div
                    className={cn(
                      'flex items-center gap-3 px-5 py-4',
                      section.collapsible && 'cursor-pointer hover:bg-surface-raised transition-colors',
                    )}
                    onClick={() => section.collapsible && toggleCollapse(section.id)}
                  >
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                      {sectionIndex}
                    </div>
                    {Icon && <Icon className="h-4 w-4 text-primary shrink-0" />}
                    <h2 className="text-sm font-semibold text-foreground flex-1">{section.title}</h2>
                    {section.collapsible && (
                      <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isCollapsed && '-rotate-90')} />
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="px-5 pb-5">
                      {section.content}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Footer */}
            {!search && (
              <div className="mt-8 pt-6 border-t border-border text-center space-y-2">
                <p className="text-sm text-muted-foreground">© 2025 Mune Work, Inc. All rights reserved.</p>
                <p className="text-xs text-muted-foreground">Empowering careers and connecting talent worldwide</p>
                <div className="flex justify-center gap-6 text-xs mt-3">
                  <span className="text-primary font-medium">Job Search</span>
                  <span className="text-warning font-medium">Professional Networking</span>
                  <span className="text-success font-medium">Career Growth</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
