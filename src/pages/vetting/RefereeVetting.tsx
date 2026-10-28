import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { vettingApi } from '@/lib/api';

const unwrap = (response: any) => response?.data?.data ?? response?.data ?? response;
const options = [
  { value: 'observed_support', label: 'Observed and can support this claim' },
  { value: 'observed_cannot_support', label: 'Observed the work but cannot support this claim' },
  { value: 'did_not_observe', label: 'Did not observe this work' },
  { value: 'prefer_not_to_answer', label: 'Prefer not to answer' },
];
const relationshipLabels: Record<string, string> = {
  manager: 'Former manager or supervisor',
  direct_report: 'Direct report',
  peer: 'Peer or teammate',
  cross_functional_colleague: 'Cross-functional colleague',
  client: 'Client or customer',
  mentor: 'Mentor',
  project_collaborator: 'Project collaborator',
  other: 'Other professional relationship',
};
const describeRelationship = (type?: string, detail?: string) => {
  if (!type) return detail || 'Professional reference';
  const label = relationshipLabels[type] ?? detail ?? 'Professional reference';
  if (type === 'other' && detail && detail.toLowerCase() !== label.toLowerCase()) return `${label} · ${detail}`;
  return detail && detail.toLowerCase() !== label.toLowerCase() ? `${label} · ${detail}` : label;
};

export default function RefereeVettingPage() {
  const invitationToken = useMemo(() => new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') ?? '', []);
  const [stage, setStage] = useState<'start' | 'code' | 'form' | 'complete'>(invitationToken ? 'start' : 'complete');
  const [code, setCode] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [context, setContext] = useState<any>(null);
  const [name, setName] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [organization, setOrganization] = useState('');
  const [refereeRelationshipType, setRefereeRelationshipType] = useState('');
  const [relationshipConfirmed, setRelationshipConfirmed] = useState(false);
  const [consentToPublish, setConsentToPublish] = useState(false);
  const [overallStatement, setOverallStatement] = useState('');
  const [disputeExplanation, setDisputeExplanation] = useState('');
  const [attestations, setAttestations] = useState<Record<string, { response: string; responsibilityLevel: string; example: string }>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (invitationToken) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }, [invitationToken]);

  const startSession = useMutation({
    mutationFn: () => vettingApi.startRefereeSession(invitationToken),
    onSuccess: () => { setError(''); setStage('code'); },
    onError: () => setError('We could not open this invitation. Check the link and try again.'),
  });
  const verify = useMutation({
    mutationFn: () => vettingApi.verifyRefereeSession(invitationToken, code),
    onSuccess: async (response) => {
      const session = unwrap(response);
      setSessionToken(session.sessionToken);
      try {
        const result = unwrap(await vettingApi.refereeContext(session.sessionToken));
        setContext(result);
        setRefereeRelationshipType(result.refereeRelationshipType ?? '');
        setAttestations(Object.fromEntries((result.claims ?? []).map((claim: any) => [claim.claimRevisionId, { response: '', responsibilityLevel: '', example: '' }])));
        setName('');
        setStage('form');
        setError('');
      } catch {
        setError('This invitation is no longer available. Reopen the link from your email to continue.');
      }
    },
    onError: () => setError('That code is invalid or expired. Request a new code from the invitation link.'),
  });
  const submit = useMutation({
    mutationFn: () => vettingApi.submitReference(sessionToken, {
      refereeName: name.trim(), currentRole: currentRole.trim() || undefined, organization: organization.trim() || undefined,
      refereeRelationshipType,
      relationshipConfirmed, overlapStart: context?.overlapStart || undefined, overlapEnd: context?.overlapEnd || undefined,
      attestations: Object.entries(attestations).map(([claimRevisionId, answer]) => ({ claimRevisionId, ...answer, responsibilityLevel: answer.responsibilityLevel || undefined, example: answer.example.trim() || undefined })),
      statement: overallStatement.trim() || undefined, consentToPublish, consentAudience: 'employer_application',
    }, context?.invitationStatus === 'submitted'),
    onSuccess: () => { setError(''); setStage('complete'); },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'The response could not be submitted. Please review each selected claim.'),
  });
  const decline = useMutation({
    mutationFn: () => vettingApi.declineInvitation(sessionToken),
    onSuccess: () => { setError(''); setStage('complete'); },
    onError: () => setError('We could not decline this invitation.'),
  });
  const withdraw = useMutation({
    mutationFn: () => vettingApi.withdrawReference(sessionToken),
    onSuccess: () => { setError(''); setStage('complete'); },
    onError: () => setError('We could not withdraw this reference.'),
  });
  const dispute = useMutation({
    mutationFn: () => vettingApi.refereeDispute(sessionToken, {
      targetType: 'reference', targetId: context.referenceId, explanation: disputeExplanation.trim(),
    }),
    onSuccess: () => { setError(''); setStage('complete'); },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'We could not open this dispute.'),
  });

  const setAnswer = (claimId: string, patch: Partial<{ response: string; responsibilityLevel: string; example: string }>) => {
    setAttestations((current) => ({ ...current, [claimId]: { ...current[claimId], ...patch } }));
  };
  const validAnswers = (context?.claims ?? []).every((claim: any) => {
    const answer = attestations[claim.claimRevisionId];
    return answer?.response && (answer.response !== 'observed_support' || (answer.responsibilityLevel && answer.example.trim().length >= 5));
  });

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-primary">MuneWork · Professional reference</p><h1 className="text-2xl font-bold">Share what you personally observed</h1><p className="text-sm leading-6 text-muted-foreground">You do not need a MuneWork account. Your response is private until you submit it, and you can choose whether the candidate may share it with employers reviewing an application.</p></header>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          {!invitationToken && <p className="text-sm text-muted-foreground">This invitation link is missing or has expired. Reopen the link in the invitation email.</p>}

          {stage === 'start' && <div className="space-y-4"><div className="flex gap-3 rounded-lg bg-surface-raised p-3 text-xs leading-5 text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0 text-primary" />We will send a one-time code to the email address that received this invitation. The candidate’s private profile and contact details are not shown.</div><Button onClick={() => startSession.mutate()} disabled={startSession.isPending}>{startSession.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send email confirmation code</Button></div>}

          {stage === 'code' && <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); verify.mutate(); }}><p className="text-sm text-muted-foreground">Enter the six-digit code sent to the invited email. Codes expire after ten minutes.</p><Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" aria-label="Email confirmation code" /><Button type="submit" disabled={code.length !== 6 || verify.isPending}>{verify.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm email</Button></form>}

          {stage === 'form' && context && <div className="space-y-5">
            <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Reference requested by</p><p className="text-sm font-semibold">{context.candidateName}</p><p className="text-xs text-muted-foreground">Relationship: {describeRelationship(context.relationshipType, context.relationship)}{context.overlapStart || context.overlapEnd ? ` · ${context.overlapStart ?? 'start not provided'} to ${context.overlapEnd ?? 'present'}` : ''}</p></div>
            {context.invitationStatus === 'submitted' && <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">You are submitting a correction to your earlier response. This will create a new version.</p>}
            <label className="block space-y-1 text-xs font-medium">Your name<Input value={name} onChange={(e) => setName(e.target.value)} maxLength={160} /></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs font-medium">Current role (optional)<Input value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} maxLength={160} /></label><label className="space-y-1 text-xs font-medium">Organization (optional)<Input value={organization} onChange={(e) => setOrganization(e.target.value)} maxLength={200} /></label></div>
            <label className="block space-y-1 text-xs font-medium">How did you work with this candidate?
              <select value={refereeRelationshipType} onChange={(e) => setRefereeRelationshipType(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal">
                <option value="">Choose your relationship</option>
                {Object.entries(relationshipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><input type="checkbox" checked={relationshipConfirmed} onChange={(e) => setRelationshipConfirmed(e.target.checked)} className="mt-1" />I confirm that the relationship and dates shown are accurate to the best of my knowledge. I will answer each claim only from what I personally observed.</label>

            <div className="space-y-3"><h2 className="text-sm font-semibold">Claims to review</h2>{(context.claims ?? []).map((claim: any) => {
              const answer = attestations[claim.claimRevisionId] ?? { response: '', responsibilityLevel: '', example: '' };
              return <section key={claim.claimRevisionId} className="space-y-3 rounded-lg border border-border p-4">
                <div><p className="text-xs font-semibold">{claim.label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{claim.statement}</p>{claim.sourceSnapshot?.company && <p className="mt-1 text-[11px] text-muted-foreground">{claim.sourceSnapshot.role} at {claim.sourceSnapshot.company}</p>}</div>
                <label className="block space-y-1 text-xs font-medium">Your response<select value={answer.response} onChange={(e) => setAnswer(claim.claimRevisionId, { response: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal"><option value="">Choose a response</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                {answer.response === 'observed_support' && <><label className="block space-y-1 text-xs font-medium">Candidate’s level of responsibility<select value={answer.responsibilityLevel} onChange={(e) => setAnswer(claim.claimRevisionId, { responsibilityLevel: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal"><option value="">Choose a level</option><option value="assisted_delivery">Assisted delivery</option><option value="independent_delivery">Independent delivery</option><option value="led_work">Led the work</option><option value="unable_to_judge">Unable to judge</option></select></label><label className="block space-y-1 text-xs font-medium">A concrete example<textarea value={answer.example} onChange={(e) => setAnswer(claim.claimRevisionId, { example: e.target.value })} rows={3} maxLength={3000} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal" placeholder="Describe the work you personally observed." /></label></>}
              </section>;
            })}</div>

            <label className="block space-y-1 text-xs font-medium">Additional context (optional)<textarea value={overallStatement} onChange={(e) => setOverallStatement(e.target.value)} rows={3} maxLength={5000} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal" placeholder="Add relevant context without sharing confidential company information." /></label>
            <p className="rounded-lg bg-surface-raised p-3 text-xs leading-5 text-muted-foreground">Do not include confidential company information or personal data about other people. Review the entire response before submitting. The candidate cannot edit your testimony or publish only favorable answers.</p>
            <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><input type="checkbox" checked={consentToPublish} onChange={(e) => setConsentToPublish(e.target.checked)} className="mt-1" />I consent to the candidate sharing this complete response with employers reviewing an application on MuneWork. I can withdraw publication permission later.</label>
            {context.invitationStatus === 'submitted' && <div className="space-y-2 rounded-lg border border-border p-3"><p className="text-xs font-semibold">Dispute or withdraw</p><p className="text-xs leading-5 text-muted-foreground">If the candidate’s use or description of your reference is inaccurate, explain what should be reviewed. A platform reviewer will see your dispute.</p><textarea value={disputeExplanation} onChange={(e) => setDisputeExplanation(e.target.value)} rows={3} maxLength={4000} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal" placeholder="Describe the issue (at least 10 characters)." /><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => dispute.mutate()} disabled={dispute.isPending || disputeExplanation.trim().length < 10 || !context.referenceId}>{dispute.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Open dispute</Button><Button type="button" variant="outline" onClick={() => withdraw.mutate()} disabled={withdraw.isPending}>{withdraw.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Withdraw previous reference</Button></div></div>}
            <div className="flex flex-wrap gap-2"><Button onClick={() => submit.mutate()} disabled={submit.isPending || !name.trim() || !refereeRelationshipType || !relationshipConfirmed || !validAnswers}>{submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit complete response</Button>{context.invitationStatus === 'pending' && <Button variant="outline" onClick={() => decline.mutate()} disabled={decline.isPending}>Decline</Button>}</div>
          </div>}

          {stage === 'complete' && <div className="space-y-3 py-4 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-primary" /><h2 className="text-lg font-semibold">{invitationToken ? 'Thank you' : 'Invitation link unavailable'}</h2><p className="text-sm leading-6 text-muted-foreground">{invitationToken ? 'Your response or choice has been recorded. You can close this page.' : 'Reopen the link from the invitation email to continue.'}</p></div>}
          {error && <p role="alert" className="mt-4 text-xs text-destructive">{error}</p>}
        </div>
        <p className="text-center text-[11px] text-muted-foreground">Email confirmation proves control of an email address at the time of confirmation only.</p>
      </div>
    </main>
  );
}
