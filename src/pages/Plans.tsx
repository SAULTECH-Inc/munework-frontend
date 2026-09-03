import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, Zap, Star, Crown, Loader2, ArrowRight, X,
  ArrowUp, ArrowDown, Check, ChevronDown, ChevronUp, CreditCard, Globe, Smartphone,
} from 'lucide-react';
import { TopBar } from '@/components/common/TopBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { subscriptionsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useSeo } from '@/lib/seo';

type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
type Gateway = 'PAYSTACK' | 'STRIPE' | 'FLUTTERWAVE';

const CYCLE_LABELS: Record<BillingCycle, string> = {
  MONTHLY:   'Monthly',
  QUARTERLY: 'Quarterly',
  ANNUALLY:  'Annual',
};

const PLAN_ICONS: Record<number, React.ElementType> = { 0: Zap, 1: Star, 2: Crown };
const PLAN_COLORS = [
  { bar: 'from-primary/80 to-blue-500',         ring: 'border-primary/20',   bg: 'bg-primary/5'    },
  { bar: 'from-purple-500 to-pink-500',          ring: 'border-purple-500/30', bg: 'bg-purple-500/5' },
  { bar: 'from-amber-400 to-orange-500',         ring: 'border-amber-400/30', bg: 'bg-amber-400/5'  },
];

const FALLBACK_FEATURES: string[] = [
  'AI job matching & recommendations',
  'Automated applications',
  'Priority application queue',
  'Advanced analytics dashboard',
  'Resume AI optimization',
  'Email & push notifications',
  'Dedicated support channel',
];

// Feature comparison matrix shown at the bottom
const COMPARISON = [
  { feature: 'Automated applications / mo', values: ['200', '2,000', 'Unlimited'] },
  { feature: 'AI job matching',             values: ['Basic', 'Advanced', 'Premium'] },
  { feature: 'Resume AI optimization',      values: [true, true, true] },
  { feature: 'Cover letter AI',             values: [false, true, true] },
  { feature: 'Priority queue placement',    values: [false, true, true] },
  { feature: 'Analytics dashboard',         values: ['Basic', 'Full', 'Full + exports'] },
  { feature: 'Interview AI coach',          values: [false, false, true] },
  { feature: 'API access',                  values: [false, false, true] },
  { feature: 'Support',                     values: ['Email', 'Priority email', '24/7 priority'] },
  { feature: '7-day free trial',            values: [true, true, true] },
];

const GATEWAYS: { id: Gateway; label: string; sub: string; icon: React.ElementType; color: string }[] = [
  { id: 'PAYSTACK',    label: 'Paystack',    sub: 'Cards, bank transfer, USSD',    icon: Smartphone, color: 'text-green-500  border-green-500/30  bg-green-500/5'  },
  { id: 'STRIPE',      label: 'Stripe',      sub: 'International cards',            icon: CreditCard, color: 'text-blue-500   border-blue-500/30   bg-blue-500/5'   },
  { id: 'FLUTTERWAVE', label: 'Flutterwave', sub: 'Cards, mobile money, bank',     icon: Globe,      color: 'text-orange-500 border-orange-500/30 bg-orange-500/5' },
];

export default function PlansPage() {
  useSeo({
    title: 'Pricing and Plans | Mune Work',
    description: 'Simple pricing for job seekers and employers. Compare plans and pick the one that fits how you hire or how you search.',
  });

  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [cycle, setCycle]     = useState<BillingCycle>('MONTHLY');
  const [showCompare, setShowCompare] = useState(false);
  const [gatewayModal, setGatewayModal] = useState<{ planId: string; planName: string } | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<Gateway>('PAYSTACK');

  const { data: plansRaw, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn:  () => subscriptionsApi.getPlans().then(r => r.data.data ?? r.data),
    retry: false,
  });

  const { data: subRaw } = useQuery({
    queryKey: ['subscription'],
    queryFn:  () => subscriptionsApi.getMySubscription().then(r => r.data.data ?? r.data),
    retry: false,
    enabled: !!user,
  });

  const allPlans: any[] = Array.isArray(plansRaw) ? plansRaw : (plansRaw as any)?.data ?? [];
  const plans = allPlans.filter(p => !p.billingCycle || p.billingCycle === cycle);
  const currentPlanId    = (subRaw as any)?.planId ?? (subRaw as any)?.plan?.id;
  const currentPlanPrice = (subRaw as any)?.plan?.price ?? (subRaw as any)?.plan?.monthlyPrice ?? 0;

  const cycles = allPlans.length
    ? (Array.from(new Set(allPlans.map((p: any) => p.billingCycle).filter(Boolean))) as BillingCycle[])
    : (['MONTHLY', 'QUARTERLY', 'ANNUALLY'] as BillingCycle[]);

  // Trial expiry
  const trialEndsAt = subRaw && (subRaw as any).status === 'trial' ? new Date((subRaw as any).endsAt) : null;
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : null;

  const subscribe = useMutation({
    mutationFn: ({ planId, gateway }: { planId: string; gateway: Gateway }) =>
      subscriptionsApi.initialize({ planId, gateway }),
    onSuccess: (res) => {
      const data = res.data?.data ?? res.data;
      const url = data?.authorizationUrl ?? data?.redirectUrl ?? data?.url;
      if (url) {
        window.location.href = url;
      } else if (data?.subscriptionId) {
        qc.invalidateQueries({ queryKey: ['subscription'] });
        navigate(`/payment/result?subscriptionId=${data.subscriptionId}&reference=${data.reference || data.subscriptionId}`);
      } else {
        qc.invalidateQueries({ queryKey: ['subscription'] });
        toast.success('Subscription initialized!');
      }
    },
    onError: () => toast.error('Could not start checkout. Please try again.'),
  });

  function handleSubscribe(planId: string, planName: string) {
    if (!user) {
      toast.error('Please log in to subscribe');
      navigate('/login?redirect=/plans');
      return;
    }
    setGatewayModal({ planId, planName });
  }

  function confirmGateway() {
    if (!gatewayModal) return;
    subscribe.mutate({ planId: gatewayModal.planId, gateway: selectedGateway });
    setGatewayModal(null);
  }

  // Determine if a plan is upgrade or downgrade vs current
  function planAction(plan: any, idx: number): 'current' | 'upgrade' | 'downgrade' | 'get-started' {
    if (plan.id === currentPlanId) return 'current';
    if (!currentPlanId) return 'get-started';
    const price = plan.price ?? plan.monthlyPrice ?? 0;
    return price > currentPlanPrice ? 'upgrade' : 'downgrade';
  }

  const staticPlans = [
    { id: 'basic',        name: 'Starter',    price: 9_900,  cycle: 'per month',   badge: null,         features: FALLBACK_FEATURES.slice(0, 4) },
    { id: 'professional', name: 'Pro',        price: 24_900, cycle: 'per quarter',  badge: 'Most popular', features: FALLBACK_FEATURES.slice(0, 6) },
    { id: 'enterprise',   name: 'Enterprise', price: 79_900, cycle: 'per year',    badge: 'Best value',  features: FALLBACK_FEATURES },
  ];

  return (
    <>
      <TopBar title="Subscription Plans" />

      <div className="p-6 max-w-5xl mx-auto space-y-8 pb-16">

        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
            <Zap className="h-3 w-3" /> 7-day free trial on all plans
          </div>
          <h2 className="text-3xl font-bold text-foreground">Choose your plan</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Unlock AI-powered job applications, priority placement, and advanced analytics. Cancel anytime.
          </p>
        </div>

        {/* Trial countdown banner */}
        {trialDaysLeft !== null && (
          <div className={cn(
            'flex items-center justify-between px-5 py-3 rounded-2xl border text-sm font-medium',
            trialDaysLeft <= 2
              ? 'bg-destructive/10 border-destructive/30 text-destructive'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
          )}>
            <span>
              {trialDaysLeft === 0
                ? '⚠️ Your free trial expires today'
                : `⏳ ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left on your free trial`}
            </span>
            <span className="text-xs opacity-70">Subscribe to keep access</span>
          </div>
        )}

        {/* Billing cycle toggle */}
        {cycles.length > 1 && (
          <div className="flex items-center justify-center gap-1 bg-surface-raised border border-border rounded-xl p-1 w-fit mx-auto">
            {cycles.map(c => (
              <button key={c}
                onClick={() => setCycle(c)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  cycle === c ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}>
                {CYCLE_LABELS[c]}
                {c === 'ANNUALLY' && <span className="ml-1.5 text-[10px] text-success font-semibold">Save 30%</span>}
              </button>
            ))}
          </div>
        )}

        {/* Plan cards */}
        {plansLoading ? (
          <div className="grid sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-96 rounded-2xl" />)}
          </div>
        ) : plans.length > 0 ? (
          <div className="grid sm:grid-cols-3 gap-4">
            {plans.map((plan: any, i: number) => {
              const Icon    = PLAN_ICONS[i % 3] ?? Star;
              const colors  = PLAN_COLORS[i % 3];
              const action  = planAction(plan, i);
              const isBest  = i === 1;
              const features: string[] = Array.isArray(plan.features)
                ? plan.features
                : typeof plan.features === 'object'
                ? Object.values(plan.features as Record<string, string>)
                : FALLBACK_FEATURES.slice(0, 4 + i * 2);
              return (
                <PlanCard key={plan.id}
                  name={plan.name}
                  price={`${plan.currency ?? '₦'}${Number(plan.price ?? plan.monthlyPrice ?? 0).toLocaleString()}`}
                  cycle={CYCLE_LABELS[plan.billingCycle as BillingCycle] ?? 'per month'}
                  features={features}
                  icon={Icon}
                  colors={colors}
                  isBest={isBest}
                  action={action}
                  loading={subscribe.isPending && (subscribe.variables as any)?.planId === plan.id}
                  onSubscribe={() => handleSubscribe(plan.id, plan.name)}
                />
              );
            })}
          </div>
        ) : (
          /* Static fallback */
          <div className="grid sm:grid-cols-3 gap-4">
            {staticPlans.map((p, i) => {
              const Icon   = PLAN_ICONS[i];
              const colors = PLAN_COLORS[i];
              return (
                <PlanCard key={p.name}
                  name={p.name}
                  price={`₦${p.price.toLocaleString()}`}
                  cycle={p.cycle}
                  features={p.features}
                  icon={Icon}
                  colors={colors}
                  isBest={i === 1}
                  action="get-started"
                  loading={false}
                  onSubscribe={() => handleSubscribe(p.id, p.name)}
                  badge={p.badge ?? undefined}
                />
              );
            })}
          </div>
        )}

        {/* Guarantee */}
        <p className="text-center text-xs text-muted-foreground">
          All plans include a 7-day free trial · No hidden fees · Cancel anytime
        </p>

        {/* Plan comparison table toggle */}
        <div className="border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowCompare(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-foreground hover:bg-surface-raised transition-colors"
          >
            <span>Compare all features</span>
            {showCompare ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {showCompare && (
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-raised">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground w-1/2">Feature</th>
                    {['Starter', 'Pro', 'Enterprise'].map(n => (
                      <th key={n} className="px-4 py-3 font-semibold text-foreground text-center">{n}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {COMPARISON.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-surface' : 'bg-surface-raised/30'}>
                      <td className="px-5 py-3 text-muted-foreground">{row.feature}</td>
                      {row.values.map((v, j) => (
                        <td key={j} className="px-4 py-3 text-center font-medium">
                          {typeof v === 'boolean' ? (
                            v
                              ? <Check className="h-4 w-4 text-success mx-auto" />
                              : <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                          ) : (
                            <span className={j === 2 ? 'text-primary' : 'text-foreground'}>{v}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Gateway selector modal ── */}
      {gatewayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-sm font-semibold text-foreground">Choose payment method</p>
                <p className="text-xs text-muted-foreground mt-0.5">for <span className="font-medium">{gatewayModal.planName}</span></p>
              </div>
              <button onClick={() => setGatewayModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {GATEWAYS.map(gw => (
                <button
                  key={gw.id}
                  onClick={() => setSelectedGateway(gw.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left',
                    selectedGateway === gw.id ? gw.color : 'border-border bg-surface hover:bg-surface-raised',
                  )}
                >
                  <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', selectedGateway === gw.id ? gw.color.split(' ')[2] : 'bg-surface-raised')}>
                    <gw.icon className={cn('h-4 w-4', selectedGateway === gw.id ? gw.color.split(' ')[0] : 'text-muted-foreground')} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{gw.label}</p>
                    <p className="text-xs text-muted-foreground">{gw.sub}</p>
                  </div>
                  {selectedGateway === gw.id && (
                    <CheckCircle2 className="h-4 w-4 text-success ml-auto shrink-0" />
                  )}
                </button>
              ))}
              <Button
                className="w-full gap-1.5 mt-2"
                onClick={confirmGateway}
                disabled={subscribe.isPending}
              >
                {subscribe.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <ArrowRight className="h-4 w-4" />}
                Continue to payment
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PlanCard({
  name, price, cycle, features, icon: Icon, colors, isBest, action, loading, onSubscribe, badge,
}: {
  name: string; price: string; cycle: string; features: string[];
  icon: React.ElementType;
  colors: { bar: string; ring: string; bg: string };
  isBest: boolean; action: 'current' | 'upgrade' | 'downgrade' | 'get-started';
  loading: boolean; onSubscribe: () => void; badge?: string;
}) {
  return (
    <div className={cn(
      'relative glass rounded-3xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1',
      isBest
        ? 'border-2 border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.2)]'
        : 'border border-border/60 hover:border-primary/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)]',
    )}>
      {isBest && (
        <div className="absolute top-0 inset-x-0 flex justify-center">
          <span className="px-4 py-1 text-[10px] font-bold rounded-b-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white tracking-wide uppercase shadow-lg">
            Most Popular
          </span>
        </div>
      )}

      {/* Gradient header band */}
      <div className={cn('h-24 w-full bg-gradient-to-br relative', colors.bar, 'opacity-90')}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_60%)]" />
        <div className="absolute bottom-4 left-5 flex items-center gap-3">
          <div className={cn('h-10 w-10 rounded-2xl flex items-center justify-center bg-white/20 backdrop-blur-sm shadow-md')}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm font-['Outfit',sans-serif]">{name}</p>
            {(badge || action === 'current') && (
              <span className="text-[10px] font-semibold text-white/80">
                {action === 'current' ? '✓ Current plan' : badge}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 space-y-4">
        <div>
          <p className="text-3xl font-bold text-foreground font-['Outfit',sans-serif]">{price}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{cycle}</p>
        </div>

        <ul className="space-y-2.5">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /> {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-5 pt-0">
        {action === 'current' ? (
          <Button className="w-full text-sm rounded-xl" variant="outline" disabled>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-success" /> Current plan
          </Button>
        ) : action === 'upgrade' ? (
          <Button className="w-full text-sm gap-1.5 rounded-xl" onClick={onSubscribe} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5" />}
            Upgrade
          </Button>
        ) : action === 'downgrade' ? (
          <Button className="w-full text-sm gap-1.5 rounded-xl" variant="outline" onClick={onSubscribe} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowDown className="h-3.5 w-3.5" />}
            Downgrade
          </Button>
        ) : (
          <Button
            className="w-full text-sm gap-1.5 rounded-xl"
            variant={isBest ? 'default' : 'outline'}
            onClick={onSubscribe}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
            Get started
          </Button>
        )}
      </div>
    </div>
  );
}

