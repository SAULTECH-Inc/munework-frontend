import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Briefcase, Users, Sparkles, ArrowRight, MapPin, Zap,
  CheckCircle2, Star, Play, ChevronLeft, ChevronRight, Building2,
  Clock, Globe, Shield, TrendingUp, FileText, MessageSquare, Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { jobsApi } from '@/lib/api';
import { formatSalary, timeAgo, JOB_TYPE_LABEL } from '@/lib/utils';
import type { Job } from '@/types';

// ─── Static data ──────────────────────────────────────────────────────────────

const STATS = [
  { label: 'Active Jobs',       value: '12,000+' },
  { label: 'Companies Hiring',  value: '3,400+'  },
  { label: 'Placements Made',   value: '45,000+' },
  { label: 'AI Match Rate',     value: '94%'     },
];

const CATEGORIES = [
  'Engineering', 'Design', 'Marketing', 'Data Science',
  'Product', 'Finance', 'Sales', 'DevOps', 'Healthcare', 'Legal',
];

const SEEKER_STEPS = [
  { icon: FileText, title: 'Upload your CV',             body: 'Our AI parses your resume and builds your profile in seconds.' },
  { icon: Sparkles, title: 'Get matched instantly',      body: 'Mune Work scores every job against your skills and experience.' },
  { icon: Zap,      title: 'Auto-apply while you sleep', body: 'Set your preferences and let the AI apply to matching roles.' },
  { icon: Award,    title: 'Show up for interviews',     body: 'Get notified when employers want to meet — skip the guesswork.' },
];

const EMPLOYER_STEPS = [
  { icon: Briefcase,    title: 'Post your job',           body: 'Rich job editor with AI suggestions for title, requirements, and salary.' },
  { icon: Sparkles,     title: 'AI screens applicants',   body: 'Every applicant is ranked by match score — no more resume pile.' },
  { icon: Users,        title: 'Review top candidates',   body: 'One-click shortlist, interview scheduling, and messaging built in.' },
  { icon: CheckCircle2, title: 'Hire faster',             body: 'Reduce time-to-hire by up to 60% with AI-assisted selection.' },
];

const FEATURES = [
  { icon: Zap,           title: 'Auto-Apply',          body: 'Set preferences once. Mune Work applies to matching jobs on your behalf — you only show up for interviews.' },
  { icon: Sparkles,      title: 'AI Job Matching',     body: 'Our AI reads your CV and scores every job for fit. No more guessing if you\'re qualified.' },
  { icon: Shield,        title: 'Smart Screening',     body: 'Employers get AI-ranked candidate lists with match scores so they can focus on the best fits.' },
  { icon: MessageSquare, title: 'Built-in Messaging',  body: 'Applicants and employers communicate directly inside Mune Work — no email chains.' },
  { icon: TrendingUp,    title: 'Analytics & Insights', body: 'Track your application pipeline, conversion rates, and hiring funnel in real time.' },
  { icon: Globe,         title: 'Remote-First Ready',  body: 'Filter for remote, hybrid, or on-site roles globally. Location is no longer a barrier.' },
];

const TESTIMONIALS = [
  {
    quote: 'Mune Work auto-applied to 40 roles in my first week. I got 6 interviews. I would never have found time to do that manually.',
    name: 'Amara O.',
    title: 'Frontend Developer, Lagos',
    avatar: '',
  },
  {
    quote: 'We filled a senior role in 9 days. The AI screening saved our HR team hours of resume review.',
    name: 'David K.',
    title: 'Head of Talent, Fintech Startup',
    avatar: '',
  },
  {
    quote: 'The match score feature is incredible. I could see at a glance which jobs I was 90%+ compatible with.',
    name: 'Fatima L.',
    title: 'Product Designer, Abuja',
    avatar: '',
  },
  {
    quote: "As a small team we can't afford a recruiter. Mune Work is our recruiter — and it's 10x cheaper.",
    name: 'Emmanuel R.',
    title: 'CTO, Early-Stage Startup',
    avatar: '',
  },
];

// ─── Company Logos ────────────────────────────────────────────────────────────

const COMPANIES = [
  'Google', 'Microsoft', 'Stripe', 'Meta', 'Amazon', 'Uber', 'Airbnb', 'Spotify', 'Shopify', 'Netflix',
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();
  const [query,           setQuery]           = useState('');
  const [location,        setLocation]        = useState('');
  const [howTab,          setHowTab]          = useState<'seeker' | 'employer'>('seeker');
  const [testimonialIdx,  setTestimonialIdx]  = useState(0);
  const [mousePos,        setMousePos]        = useState({ x: 0, y: 0 });

  const { data: featuredRaw } = useQuery({
    queryKey: ['featured-jobs'],
    queryFn: () => jobsApi.search({ limit: 6, status: 'active' }).then(r => r.data.data ?? r.data),
    retry: false,
  });
  const featuredJobs: Job[] = Array.isArray(featuredRaw)
    ? featuredRaw
    : (featuredRaw as any)?.data ?? [];

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query)    params.set('q', query);
    if (location) params.set('location', location);
    navigate(`/jobs?${params.toString()}`);
  }

  const prevT = () => setTestimonialIdx(i => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  const nextT = () => setTestimonialIdx(i => (i + 1) % TESTIMONIALS.length);
  const t = TESTIMONIALS[testimonialIdx];

  return (
    <div
      onMouseMove={handleMouseMove}
      className="min-h-screen bg-background text-foreground relative overflow-hidden"
    >
      {/* ── Dynamic Mouse Cursor Spotlight ── */}
      <div
        className="pointer-events-none absolute -z-10 rounded-full blur-[140px] opacity-40 transition-opacity duration-500"
        style={{
          width: '600px',
          height: '600px',
          left: `${mousePos.x - 300}px`,
          top: `${mousePos.y - 300}px`,
          background: 'radial-gradient(circle, hsl(262 83% 58% / 0.25) 0%, hsl(285 86% 57% / 0.15) 50%, transparent 80%)',
        }}
      />

      {/* ── Sticky Nav ── */}
      <nav className="sticky top-0 z-40 border-b border-border/40 bg-background/75 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_2px_12px_hsl(262_83%_58%/0.3)]">
              <span className="text-white font-bold text-xs font-['Outfit',sans-serif]">G</span>
            </div>
            <span className="font-bold text-[15px] tracking-tight font-['Outfit',sans-serif]">
              Gig<span className="text-gradient">hub</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-foreground transition-colors font-medium">Features</button>
            <button onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-foreground transition-colors font-medium">How it works</button>
            <button onClick={() => document.getElementById('jobs')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-foreground transition-colors font-medium">Browse Jobs</button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild><Link to="/login">Sign in</Link></Button>
            <Button size="sm" className="shadow-[0_4px_16px_hsl(262_83%_58%/0.3)]" asChild><Link to="/signup">Get started</Link></Button>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        {/* Ambient gradient blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-primary/10 blur-[120px] opacity-80" />
          <div className="absolute top-20 right-10 h-72 w-72 rounded-full bg-accent/8 blur-[90px]" />
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary/8 blur-[90px]" />
        </div>
        {/* Animated Grid overlay */}
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05]" style={{backgroundImage: 'radial-gradient(circle, hsl(262 83% 58%) 1px, transparent 1px)', backgroundSize: '32px 32px'}} />

        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 mb-6 shadow-[0_0_20px_hsl(262_83%_58%/0.15)] animate-pulse-slow">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary tracking-wide">Next-Gen AI Job Matching</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-bold leading-[1.08] mb-6 tracking-tight font-['Outfit',sans-serif]">
            Find your next role<br />
            <span className="text-gradient">faster with AI</span>
          </h1>

          <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Mune Work auto-applies to matching jobs, screens candidates intelligently,<br className="hidden sm:block" />
            and connects the right people — without the endless scrolling.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5 max-w-2xl mx-auto mb-8 p-2 rounded-2xl glass border border-border/70 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Job title, skill, or company…"
                className="w-full pl-10 pr-4 py-3 rounded-xl border-0 bg-surface/50 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground"
              />
            </div>
            <div className="relative sm:w-48">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Location or Remote"
                className="w-full pl-10 pr-4 py-3 rounded-xl border-0 bg-surface/50 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground"
              />
            </div>
            <Button type="submit" size="lg" className="rounded-xl shrink-0 gap-2 shadow-[0_4px_20px_hsl(262_83%_58%/0.35)]">
              Search <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Category chips */}
          <div className="flex flex-wrap justify-center gap-2 mb-14">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => navigate(`/jobs?q=${encodeURIComponent(cat)}`)}
                className="text-xs px-4 py-1.5 rounded-full bg-surface/70 border border-border/60 hover:border-primary/50 hover:text-primary hover:bg-primary/10 transition-all duration-200 text-muted-foreground font-medium backdrop-blur-md"
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Interactive Hero Showcase Preview Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative max-w-4xl mx-auto rounded-3xl p-1 bg-gradient-to-b from-primary/30 via-border/40 to-transparent shadow-[0_20px_80px_hsl(262_83%_58%/0.15)]"
        >
          <div className="glass rounded-[22px] p-6 sm:p-8 overflow-hidden text-left relative">
            {/* Background aura */}
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-[80px]" />

            {/* Mock Header */}
            <div className="flex items-center justify-between pb-5 border-b border-border/50 mb-6">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-warning/60" />
                <div className="h-3 w-3 rounded-full bg-success/60" />
                <span className="text-xs font-semibold text-muted-foreground ml-2 font-mono">Mune Work AI Matching Engine v2.4</span>
              </div>
              <Badge variant="outline" className="gap-1.5 border-success/30 text-success bg-success/10 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-ping" />
                Live Matching Active
              </Badge>
            </div>

            {/* Mock Content */}
            <div className="grid md:grid-cols-3 gap-5 items-center">
              {/* Candidate Card Preview */}
              <div className="md:col-span-2 space-y-4 rounded-2xl bg-surface/80 border border-border/60 p-5 shadow-lg relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg shadow-md">
                      AO
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Amara Okonkwo</h4>
                      <p className="text-xs text-muted-foreground">Senior Full Stack Engineer</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-gradient-cyan text-lg">98% Match</div>
                    <p className="text-[10px] text-muted-foreground font-medium">AI Relevance Score</p>
                  </div>
                </div>

                {/* Match Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                    <span>Skills Fit: React, TypeScript, Node.js</span>
                    <span className="text-primary font-bold">100%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-raised overflow-hidden p-0.5 border border-border/40">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '98%' }}
                      transition={{ duration: 1.2, delay: 0.5 }}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[11px] px-2.5 py-1 rounded-md bg-primary/10 text-primary font-medium border border-primary/20">✨ Auto-Applied</span>
                  <span className="text-[11px] px-2.5 py-1 rounded-md bg-success/10 text-success font-medium border border-success/20">🎥 Video CV Attached</span>
                  <span className="text-[11px] px-2.5 py-1 rounded-md bg-accent/10 text-accent font-medium border border-accent/20">⚡ 5+ Yrs Exp</span>
                </div>
              </div>

              {/* Stats side panel */}
              <div className="space-y-3">
                <div className="rounded-xl bg-surface/60 border border-border/50 p-4">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Time to First Interview</p>
                  <p className="text-2xl font-bold text-foreground font-['Outfit',sans-serif]">48 Hours</p>
                  <p className="text-[10px] text-success font-semibold mt-1">⚡ 3.5x faster than traditional job boards</p>
                </div>
                <div className="rounded-xl bg-surface/60 border border-border/50 p-4">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Applications Handled</p>
                  <p className="text-2xl font-bold text-gradient-gold font-['Outfit',sans-serif]">100% Automated</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Zero manual application forms needed</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Marquee Logos ── */}
      <section className="border-y border-border/40 bg-surface/30 py-6 overflow-hidden backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 mb-3 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Trusted by hiring teams at top companies worldwide</p>
        </div>
        <div className="relative flex overflow-x-hidden">
          <div className="animate-marquee flex items-center gap-12 whitespace-nowrap">
            {[...COMPANIES, ...COMPANIES].map((comp, idx) => (
              <span key={idx} className="text-lg font-bold tracking-tight text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer font-['Outfit',sans-serif]">
                {comp}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="py-16 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all glow-card"
            >
              <p className="text-3xl sm:text-4xl font-bold text-gradient font-['Outfit',sans-serif]">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-2 font-medium">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── AI Features ── */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary tracking-wide">Platform features</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 font-['Outfit',sans-serif]">Everything you need to get hired — or hire</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">From auto-apply to AI screening, Mune Work replaces the manual grind with intelligent automation.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="glass glow-card rounded-2xl border border-border/60 p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_12px_40px_hsl(262_83%_58%/0.16)] hover:-translate-y-1.5 group"
            >
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/25 to-accent/15 border border-primary/20 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:shadow-[0_0_20px_hsl(262_83%_58%/0.3)] transition-all duration-300">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-base mb-2 font-['Outfit',sans-serif] text-foreground">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="bg-surface/40 border-y border-border/40 py-24 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 font-['Outfit',sans-serif]">How Mune Work works</h2>
            <p className="text-muted-foreground text-sm mb-7 font-medium">Built for both sides of the hiring table.</p>
            {/* Toggle tabs */}
            <div className="inline-flex border border-border/60 rounded-xl overflow-hidden p-1 bg-background/50 backdrop-blur-sm">
              {(['seeker', 'employer'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setHowTab(tab)}
                  className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    howTab === tab
                      ? 'bg-primary text-primary-foreground shadow-[0_2px_12px_hsl(262_83%_58%/0.3)]'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'seeker' ? '👤 Job Seekers' : '🏢 Employers'}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={howTab}
              initial={{ opacity: 0, x: howTab === 'seeker' ? -16 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
            >
              {(howTab === 'seeker' ? SEEKER_STEPS : EMPLOYER_STEPS).map((step, i) => (
                <div key={step.title} className="relative text-center px-3">
                  {i < 3 && (
                    <div className="hidden lg:block absolute top-5 left-[calc(50%+32px)] w-[calc(100%-64px)] h-px border-t border-dashed border-primary/20" />
                  )}
                  <div className="relative z-10 h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                    <step.icon className="h-5 w-5 text-primary" />
                    <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-gradient-to-br from-primary to-accent text-[10px] font-bold text-white flex items-center justify-center shadow-[0_2px_8px_hsl(262_83%_58%/0.4)]">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold mb-1.5 font-['Outfit',sans-serif]">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.body}</p>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>

          <div className="text-center mt-12">
            <Button asChild size="lg">
              <Link to="/signup">
                {howTab === 'seeker' ? 'Start your job search' : 'Post your first job'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Featured Jobs ── */}
      <section id="jobs" className="max-w-6xl mx-auto px-4 py-24">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-bold font-['Outfit',sans-serif]">Featured Jobs</h2>
            <p className="text-muted-foreground text-sm mt-1">Live openings from companies hiring right now</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/login">View all jobs <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></Link>
          </Button>
        </div>

        {featuredJobs.length === 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-surface border border-border/40 rounded-2xl p-5 h-36 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredJobs.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="glass rounded-2xl border border-border/50 p-5 hover:border-primary/30 hover:shadow-[0_8px_24px_hsl(262_83%_58%/0.1)] hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                onClick={() => navigate('/login')}
              >
                <div className="flex items-start gap-3 mb-3">
                  <Avatar className="h-10 w-10 rounded-xl shrink-0 ring-1 ring-border/60">
                    <AvatarImage src={job.employer?.companyLogo} />
                    <AvatarFallback className="rounded-xl text-xs font-bold bg-gradient-to-br from-primary/20 to-accent/10 text-primary">
                      {job.employer?.companyName?.[0] ?? 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{job.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{job.employer?.companyName}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {job.location && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />{job.location}
                    </span>
                  )}
                  {job.jobType && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {JOB_TYPE_LABEL[job.jobType] ?? job.jobType}
                    </Badge>
                  )}
                  {job.employmentType === 'remote' && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30 bg-primary/5">Remote</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">
                    {job.salaryRange ? formatSalary(job.salaryRange) : 'Competitive'}
                  </span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />{timeAgo(job.createdAt)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ── For Employers CTA ── */}
      <section className="bg-surface/40 border-y border-border/40 py-20 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 grid sm:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5 mb-5">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary tracking-wide">For Employers</span>
            </div>
            <h2 className="text-2xl font-bold mb-3 font-['Outfit',sans-serif]">Hire smarter, not harder</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Post a job in minutes and let AI rank your applicants by match score. No more wading through hundreds of unqualified CVs.
            </p>
            <ul className="space-y-2.5 mb-7">
              {[
                'AI-powered candidate screening',
                'Match score on every applicant',
                'Built-in interview scheduling',
                'Analytics dashboard & pipeline tracking',
              ].map(item => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild>
              <Link to="/signup">Post a job for free <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Time-to-hire reduction', value: '60%', gradient: 'from-primary to-accent' },
              { label: 'Avg applicants screened per job', value: '200+', gradient: 'from-success to-emerald-400' },
              { label: 'Employer satisfaction rate', value: '97%', gradient: 'from-warning to-amber-400' },
            ].map(s => (
              <div key={s.label} className="glass rounded-2xl border border-border/50 p-5 flex items-center justify-between gap-4 hover:border-primary/20 transition-colors">
                <p className="text-sm text-muted-foreground font-medium">{s.label}</p>
                <p className={`text-3xl font-bold bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent font-['Outfit',sans-serif]`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="max-w-4xl mx-auto px-4 py-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold mb-2 font-['Outfit',sans-serif]">What people are saying</h2>
          <div className="flex justify-center gap-0.5 mt-2">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-warning text-warning" />)}
          </div>
        </div>

        <div className="relative max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={testimonialIdx}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3 }}
              className="glass rounded-2xl border border-border/50 p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
            >
              <div className="flex justify-center gap-0.5 mb-5">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />)}
              </div>
              <p className="text-base text-foreground leading-relaxed mb-6 font-medium">
                "{t.quote}"
              </p>
              <div className="flex items-center justify-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                  <AvatarImage src={t.avatar} />
                  <AvatarFallback className="font-bold text-sm bg-gradient-to-br from-primary/20 to-accent/10 text-primary">{t.name[0]}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-bold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.title}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-center gap-3 mt-6">
            <button onClick={prevT} className="h-8 w-8 rounded-full border border-border/60 flex items-center justify-center hover:border-primary/40 hover:text-primary hover:shadow-[0_0_10px_hsl(262_83%_58%/0.2)] transition-all">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-1.5">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTestimonialIdx(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === testimonialIdx ? 'w-6 bg-primary shadow-[0_0_6px_hsl(262_83%_58%/0.5)]' : 'w-1.5 bg-border'}`}
                />
              ))}
            </div>
            <button onClick={nextT} className="h-8 w-8 rounded-full border border-border/60 flex items-center justify-center hover:border-primary/40 hover:text-primary hover:shadow-[0_0_10px_hsl(262_83%_58%/0.2)] transition-all">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative py-24 text-center px-4 overflow-hidden border-t border-border/40">
        {/* Gradient BG */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-primary/10 blur-[80px]" />
          <div className="absolute top-1/2 left-1/3 -translate-y-1/2 h-64 w-64 rounded-full bg-accent/8 blur-[80px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-5 shadow-[0_4px_24px_hsl(262_83%_58%/0.4)]">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 font-['Outfit',sans-serif]">Ready to supercharge your job search?</h2>
          <p className="text-muted-foreground mb-9 max-w-md mx-auto text-sm leading-relaxed font-medium">
            Join thousands of professionals using AI to get hired faster. Free to start — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/signup">Get started free <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">
                <Play className="h-3.5 w-3.5 mr-2" /> Sign in
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 bg-surface/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-white font-bold text-[10px]">G</span>
                </div>
                <span className="font-bold text-sm font-['Outfit',sans-serif]">Gig<span className="text-gradient">hub</span></span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">AI-powered job matching platform built for the modern workforce.</p>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground mb-3 uppercase tracking-widest">Product</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link to="/login" className="hover:text-foreground transition-colors">Browse Jobs</Link></li>
                <li><Link to="/signup" className="hover:text-foreground transition-colors">Auto-Apply</Link></li>
                <li><Link to="/signup" className="hover:text-foreground transition-colors">For Employers</Link></li>
                <li><Link to="/plans" className="hover:text-foreground transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground mb-3 uppercase tracking-widest">Company</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link to="/help" className="hover:text-foreground transition-colors">Help Center</Link></li>
                <li><Link to="/hiring-guide" className="hover:text-foreground transition-colors">Hiring Guide</Link></li>
                <li><Link to="/changelog" className="hover:text-foreground transition-colors">Changelog</Link></li>
                <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground mb-3 uppercase tracking-widest">Account</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link to="/login" className="hover:text-foreground transition-colors">Sign in</Link></li>
                <li><Link to="/signup" className="hover:text-foreground transition-colors">Create account</Link></li>
                <li><Link to="/forgot-password" className="hover:text-foreground transition-colors">Reset password</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/40 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Mune Work — All rights reserved</p>
            <p className="text-xs text-muted-foreground">Made with AI, for humans.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
