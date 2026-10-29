import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, Loader2, Mail, Plus, ShieldCheck, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { vettingApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const unwrap = (response: any) => response?.data?.data ?? response?.data ?? response;
const responseLabel: Record<string, string> = {
  observed_support: 'Observed and supports',
  observed_cannot_support: 'Observed but cannot support',
  did_not_observe: 'Did not observe',
  prefer_not_to_answer: 'Prefers not to answer',
};
const relationshipTypes = [
  { value: 'manager', label: 'Former manager or supervisor' },
  { value: 'direct_report', label: 'Direct report' },
  { value: 'peer', label: 'Peer or teammate' },
  { value: 'cross_functional_colleague', label: 'Cross-functional colleague' },
  { value: 'client', label: 'Client or customer' },
  { value: 'mentor', label: 'Mentor' },
  { value: 'project_collaborator', label: 'Project collaborator' },
  { value: 'other', label: 'Other professional relationship' },
];
const relationshipLabel = (value?: string) => relationshipTypes.find((item) => item.value === value)?.label ?? value ?? 'Professional reference';
const describeRelationship = (type?: string, detail?: string) => {
  const label = relationshipLabel(type);
  if (!type) return detail || 'Professional reference';
  if (type === 'other' && detail && detail.trim().toLowerCase() !== label.toLowerCase()) return `${label} · ${detail}`;
  return detail && detail.trim().toLowerCase() !== label.toLowerCase() ? `${label} · ${detail}` : label;
};

export function VettingReferencesPanel({ experience, skills }: { experience: any[]; skills: any[] }) {
  const qc = useQueryClient();
  const [sourceType, setSourceType] = useState<'experience' | 'skill'>('experience');
  const [sourceIndex, setSourceIndex] = useState('');
  const [claimStatement, setClaimStatement] = useState('');
  const [editingClaimId, setEditingClaimId] = useState('');
  const [editingStatement, setEditingStatement] = useState('');
  const [selectedClaims, setSelectedClaims] = useState<string[]>([]);
  const [refereeName, setRefereeName] = useState('');
  const [refereeEmail, setRefereeEmail] = useState('');
  const [relationshipType, setRelationshipType] = useState('');
  const [relationship, setRelationship] = useState('');
  const [overlapStart, setOverlapStart] = useState('');
  const [overlapEnd, setOverlapEnd] = useState('');
  const [contactConsent, setContactConsent] = useState(false);
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceContribution, setEvidenceContribution] = useState('');
  const [evidenceClaimId, setEvidenceClaimId] = useState('');

  const query = useQuery({
    queryKey: ['vetting-mine'],
    queryFn: () => vettingApi.mine().then(unwrap),
  });
  const data = query.data ?? { claims: [], invitations: [], references: [], evidence: [], settings: { attachToApplications: false } };
  const sources = sourceType === 'experience' ? experience : skills;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['vetting-mine'] });
  const createClaim = useMutation({
    mutationFn: () => vettingApi.createClaim({ sourceType, sourceIndex: Number(sourceIndex), statement: claimStatement.trim() }),
    onSuccess: () => { invalidate(); setClaimStatement(''); setSourceIndex(''); toast.success('Claim saved'); },
    onError: () => toast.error('Could not save this claim'),
  });
  const reviseClaim = useMutation({
    mutationFn: ({ id, statement }: { id: string; statement: string }) => vettingApi.reviseClaim(id, { statement }),
    onSuccess: (_response, variables) => {
      invalidate();
      const oldRevisionId = data.claims.find((claim: any) => claim.id === variables.id)?.currentRevision?.revisionId;
      if (oldRevisionId) setSelectedClaims((current) => current.filter((id) => id !== oldRevisionId));
      setEditingClaimId('');
      setEditingStatement('');
      toast.success('A new claim version was saved');
    },
    onError: () => toast.error('Could not revise this claim'),
  });
  const createInvitation = useMutation({
    mutationFn: () => vettingApi.createInvitation({
      refereeName: refereeName.trim(), refereeEmail: refereeEmail.trim(), relationshipType,
      relationship: relationship.trim() || undefined,
      overlapStart: overlapStart || undefined, overlapEnd: overlapEnd || undefined,
      claimRevisionIds: selectedClaims, contactConsent,
    }, crypto.randomUUID()),
    onSuccess: (response) => {
      const emailDeliveryStatus = unwrap(response)?.emailDeliveryStatus;
      invalidate(); setRefereeName(''); setRefereeEmail(''); setRelationshipType(''); setRelationship(''); setOverlapStart(''); setOverlapEnd(''); setContactConsent(false);
      if (emailDeliveryStatus === 'sent') {
        toast.success('Invitation email accepted by the mail provider');
      } else if (emailDeliveryStatus === 'pending' || emailDeliveryStatus === 'sending') {
        toast.error('Invitation saved, but email delivery is still pending. Retry it from the invitation list.');
      } else {
        toast.success('Invitation already exists');
      }
    },
    onError: () => toast.error('Could not create the invitation'),
  });
  const changeVisibility = useMutation({
    mutationFn: ({ id, state }: { id: string; state: 'published' | 'hidden' }) => vettingApi.setVisibility(id, state),
    onSuccess: () => { invalidate(); toast.success('Visibility updated'); },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Could not update visibility'),
  });
  const settings = useMutation({
    mutationFn: (value: boolean) => vettingApi.setSettings(value),
    onSuccess: () => { invalidate(); toast.success('Application evidence preference saved'); },
    onError: () => toast.error('Could not update the preference'),
  });
  const createEvidence = useMutation({
    mutationFn: () => vettingApi.createEvidence({
      title: evidenceTitle.trim(), url: evidenceUrl.trim(), contribution: evidenceContribution.trim() || undefined,
      claimRevisionId: evidenceClaimId || undefined,
    }),
    onSuccess: () => { invalidate(); setEvidenceTitle(''); setEvidenceUrl(''); setEvidenceContribution(''); toast.success('Evidence link added'); },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Could not add this link'),
  });
  const runAction = useMutation({
    mutationFn: async ({ kind, id }: { kind: 'cancel' | 'resend' | 'correct' | 'withdraw' | 'check' | 'dispute'; id: string }) => {
      if (kind === 'cancel') return vettingApi.cancelInvitation(id);
      if (kind === 'resend') return vettingApi.resendInvitation(id);
      if (kind === 'correct') return vettingApi.requestCorrection(id);
      if (kind === 'withdraw') return vettingApi.withdrawEvidence(id);
      if (kind === 'check') return vettingApi.requestCheck({ checkType: 'relationship', subjectType: 'reference', subjectId: id });
      const explanation = window.prompt('Describe what is inaccurate or should be reviewed.');
      if (!explanation) return null;
      return vettingApi.createDispute({ targetType: 'reference', targetId: id, explanation });
    },
    onSuccess: (response, variables) => {
      invalidate();
      if (variables.kind === 'resend' || variables.kind === 'correct') {
        const emailDeliveryStatus = unwrap(response)?.emailDeliveryStatus;
        if (emailDeliveryStatus === 'sent') {
          toast.success('Invitation email accepted by the mail provider');
        } else {
          toast.error('Request saved, but email delivery is still pending. You can retry it from the list.');
        }
        return;
      }
      toast.success('Request saved');
    },
    onError: () => toast.error('Could not complete that request'),
  });

  const toggleClaim = (id: string) => setSelectedClaims((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  const currentSettings = data.settings?.attachToApplications === true;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Claim-based professional references</h3>
            <p className="text-xs leading-5 text-muted-foreground">A referee responds to specific claims. Email confirmation only shows control of the invited email; it does not verify identity, employment, or skill. A missing reference never blocks an application.</p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Prepare a claim</h3>
          <p className="text-xs text-muted-foreground">Choose an item already on your profile and write the specific work a former colleague can speak to.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium">Profile item type
            <select value={sourceType} onChange={(e) => { setSourceType(e.target.value as any); setSourceIndex(''); }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal">
              <option value="experience">Work experience</option><option value="skill">Skill</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium">Profile item
            <select value={sourceIndex} onChange={(e) => setSourceIndex(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal">
              <option value="">Select an item</option>
              {sources.map((item, index) => <option key={index} value={index}>{sourceType === 'experience' ? `${item.position ?? item.role ?? 'Role'}${item.company ? ` at ${item.company}` : ''}` : (item.skill ?? item.name ?? String(item))}</option>)}
            </select>
          </label>
        </div>
        <Input value={claimStatement} onChange={(e) => setClaimStatement(e.target.value)} placeholder="Example: Led the migration of the billing API and coordinated its rollout" maxLength={2000} />
        <Button size="sm" onClick={() => createClaim.mutate()} disabled={createClaim.isPending || sourceIndex === '' || claimStatement.trim().length < 5}>
          {createClaim.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Save claim
        </Button>
        {(data.claims ?? []).length > 0 && <div className="space-y-2 pt-2">
          <p className="text-xs font-medium">Claims available for references</p>
          {data.claims.map((claim: any) => <div key={claim.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
            <input type="checkbox" aria-label={`Select ${claim.label} for a reference`} checked={selectedClaims.includes(claim.currentRevision?.revisionId ?? '')} onChange={() => claim.currentRevision?.revisionId && toggleClaim(claim.currentRevision.revisionId)} className="mt-1" />
            <span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{claim.label}</span>{editingClaimId === claim.id ? <div className="mt-2 space-y-2"><Input aria-label="Edit claim statement" value={editingStatement} onChange={(e) => setEditingStatement(e.target.value)} maxLength={2000} /><div className="flex gap-3"><button className="text-xs text-primary underline" disabled={reviseClaim.isPending || editingStatement.trim().length < 5} onClick={() => reviseClaim.mutate({ id: claim.id, statement: editingStatement.trim() })}>Save new version</button><button className="text-xs text-muted-foreground underline" onClick={() => { setEditingClaimId(''); setEditingStatement(''); }}>Cancel</button></div></div> : <span className="mt-1 block text-xs text-muted-foreground">{claim.currentRevision?.statement}</span>}</span>
            <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-muted-foreground">{claim.type}</span>
            {editingClaimId !== claim.id && <button className="text-xs text-primary underline" disabled={reviseClaim.isPending} onClick={() => { setEditingClaimId(claim.id); setEditingStatement(claim.currentRevision?.statement ?? ''); }}>Edit</button>}
          </div>)}
        </div>}
      </section>

      <section className="space-y-3 border-t border-border pt-5">
        <div><h3 className="text-sm font-semibold">Invite a referee</h3><p className="text-xs text-muted-foreground">They receive only the selected claims. Preview and confirm your permission before MuneWork sends an email.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input aria-label="Referee name" value={refereeName} onChange={(e) => setRefereeName(e.target.value)} placeholder="Referee name" />
          <Input aria-label="Referee email" type="email" value={refereeEmail} onChange={(e) => setRefereeEmail(e.target.value)} placeholder="Referee email" />
          <label className="space-y-1 text-xs font-medium">Professional relationship
            <select aria-label="Professional relationship" value={relationshipType} onChange={(e) => setRelationshipType(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal">
              <option value="">Choose a relationship</option>
              {relationshipTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2"><Input aria-label="Overlap start" type="date" value={overlapStart} onChange={(e) => setOverlapStart(e.target.value)} /><Input aria-label="Overlap end" type="date" value={overlapEnd} onChange={(e) => setOverlapEnd(e.target.value)} /></div>
          <Input className="sm:col-span-2" aria-label="Relationship detail (optional)" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Optional context, e.g. Engineering team lead" maxLength={120} />
        </div>
        <div className="rounded-lg bg-surface-raised p-3 text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Invitation preview</p>
          <p>{refereeName || 'Your referee'} ({relationshipType ? relationshipLabel(relationshipType).toLowerCase() : 'relationship not selected'}) will be asked to respond to {selectedClaims.length || 'the selected'} claim(s), confirm how you worked together, and choose what may be shared with employers reviewing an application.</p>
        </div>
        <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <input type="checkbox" checked={contactConsent} onChange={(e) => setContactConsent(e.target.checked)} className="mt-1" />
          I have permission to contact this person about the selected claims and include a link to my MuneWork profile so they can identify me. I will not contact a current employer without explicit permission for this invitation.
        </label>
        <Button size="sm" onClick={() => createInvitation.mutate()} disabled={createInvitation.isPending || selectedClaims.length === 0 || !contactConsent || refereeName.trim().length < 2 || !refereeEmail.includes('@') || !relationshipType}>
          {createInvitation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} Send invitation
        </Button>
        {(data.invitations ?? []).length > 0 && <div className="space-y-2 pt-2">
          <h4 className="text-xs font-semibold">Invitations</h4>
          {data.invitations.map((invitation: any) => <div key={invitation.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
            <div className="min-w-0 flex-1"><p className="text-xs font-medium">{invitation.refereeName} · {describeRelationship(invitation.relationshipType, invitation.relationship)}</p><p className="text-[11px] text-muted-foreground">{new Date(invitation.createdAt).toLocaleDateString()} · expires {new Date(invitation.tokenExpiresAt).toLocaleDateString()}</p></div>
            <span className="rounded-full bg-surface-raised px-2 py-1 text-[10px] capitalize text-muted-foreground">{invitation.status}</span>
            {invitation.status === 'pending' && <><button className="text-xs text-primary underline" onClick={() => runAction.mutate({ kind: 'resend', id: invitation.id })}>Resend</button><button className="text-xs text-destructive underline" onClick={() => runAction.mutate({ kind: 'cancel', id: invitation.id })}>Cancel</button></>}
          </div>)}
        </div>}
      </section>

      <section className="space-y-3 border-t border-border pt-5">
        <div><h3 className="text-sm font-semibold">Work evidence links</h3><p className="text-xs text-muted-foreground">Links are candidate-provided and do not prove authorship. Do not add confidential work you are not allowed to share.</p></div>
        <div className="grid gap-3 sm:grid-cols-2"><Input aria-label="Evidence title" value={evidenceTitle} onChange={(e) => setEvidenceTitle(e.target.value)} placeholder="Project or evidence title" /><Input aria-label="Evidence URL" type="url" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://…" /></div>
        <Input aria-label="Your contribution" value={evidenceContribution} onChange={(e) => setEvidenceContribution(e.target.value)} placeholder="What you personally contributed" />
        <label className="block space-y-1 text-xs font-medium">Related claim <select value={evidenceClaimId} onChange={(e) => setEvidenceClaimId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal"><option value="">No specific claim</option>{data.claims.map((claim: any) => claim.currentRevision && <option key={claim.currentRevision.revisionId} value={claim.currentRevision.revisionId}>{claim.label}</option>)}</select></label>
        <Button size="sm" variant="outline" onClick={() => createEvidence.mutate()} disabled={createEvidence.isPending || evidenceTitle.trim().length < 3 || !evidenceUrl.trim()}>{createEvidence.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Add link</Button>
        {(data.evidence ?? []).map((item: any) => <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border p-3"><ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="text-xs font-medium">{item.title}</p><a href={item.url} target="_blank" rel="noreferrer" className="block truncate text-[11px] text-primary underline">{item.url}</a></div>{item.status === 'submitted' && <button className="text-xs text-destructive underline" onClick={() => runAction.mutate({ kind: 'withdraw', id: item.id })}>Remove</button>}</div>)}
      </section>

      <section className="space-y-3 border-t border-border pt-5">
        <label className="flex items-start gap-3 rounded-lg border border-border p-3">
          <input type="checkbox" checked={currentSettings} disabled={settings.isPending} onChange={(e) => settings.mutate(e.target.checked)} className="mt-1" />
          <span><span className="block text-xs font-semibold">Attach evidence to MuneWork applications</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Published references and evidence links may be shown to the employer for an application you submit here, including auto-apply. This does not send them to external job sites. Turn this off to revoke access.</span></span>
        </label>
      </section>

      <section className="space-y-3 border-t border-border pt-5">
        <div><h3 className="text-sm font-semibold">Submitted references</h3><p className="text-xs text-muted-foreground">A reference is shown as one complete response. You cannot remove individual answers.</p></div>
        {(data.references ?? []).length === 0 && <p className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">No submitted references yet.</p>}
        {(data.references ?? []).map((reference: any) => <article key={reference.id} className="space-y-3 rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-center gap-2"><div className="min-w-0 flex-1"><h4 className="text-sm font-semibold">{reference.referee?.displayName ?? 'Referee'}{reference.referee?.declaredRole ? ` · ${reference.referee.declaredRole}` : ''}</h4><p className="text-xs text-muted-foreground">{reference.referee?.declaredOrganization || reference.revision?.submittedAt ? `${reference.referee?.declaredOrganization ?? ''}${reference.revision?.submittedAt ? ` · submitted ${new Date(reference.revision.submittedAt).toLocaleDateString()}` : ''}` : 'Professional reference'}</p></div>
            <span className="rounded-full bg-surface-raised px-2 py-1 text-[10px] capitalize text-muted-foreground">{reference.publicationState}</span>
            {reference.publicationState !== 'withdrawn' && reference.publicationConsented && <Button size="sm" variant="outline" disabled={changeVisibility.isPending} onClick={() => changeVisibility.mutate({ id: reference.id, state: reference.publicationState === 'published' ? 'hidden' : 'published' })}>{reference.publicationState === 'published' ? 'Hide' : 'Publish'}</Button>}
            {reference.publicationState === 'withdrawn' && <span className="text-[10px] text-muted-foreground">Withdrawn</span>}
          </div>
          {reference.refereeRelationshipType && <p className="text-xs text-muted-foreground">You described: {describeRelationship(reference.relationshipType, reference.relationship)} · Referee described: {relationshipLabel(reference.refereeRelationshipType)}</p>}
          {reference.relationshipMismatch && <p className="text-xs text-amber-700">The relationship descriptions differ. This alone does not establish misconduct; you can request a relationship review.</p>}
          {reference.revision?.overallStatement && <p className="text-xs leading-5">{reference.revision.overallStatement}</p>}
          <div className="space-y-2">{(reference.attestations ?? []).map((answer: any) => <div key={answer.id} className="rounded-lg bg-surface-raised p-3"><p className="text-xs font-medium">{answer.claim?.statement ?? 'Claim'}</p><p className="mt-1 text-xs text-muted-foreground">{responseLabel[answer.response] ?? answer.response}{answer.responsibilityLevel ? ` · ${answer.responsibilityLevel.replace(/_/g, ' ')}` : ''}</p>{answer.example && <p className="mt-1 text-xs leading-5">{answer.example}</p>}</div>)}</div>
          <div className="flex flex-wrap gap-3 border-t border-border pt-3">{reference.publicationState !== 'withdrawn' && <><button className="text-xs text-primary underline" onClick={() => runAction.mutate({ kind: 'correct', id: reference.id })}>Request correction</button><button className="text-xs text-primary underline" onClick={() => runAction.mutate({ kind: 'check', id: reference.id })}>Request relationship review</button></>}<button className="text-xs text-destructive underline" onClick={() => runAction.mutate({ kind: 'dispute', id: reference.id })}>Open dispute</button></div>
        </article>)}
        {(data.references ?? []).map((reference: any) => !reference.publicationConsented && reference.publicationState !== 'withdrawn' ? <p key={`consent-${reference.id}`} className="flex items-center gap-2 text-xs text-muted-foreground"><XCircle className="h-3.5 w-3.5" /> This referee has not consented to employer visibility for the current revision.</p> : null)}
      </section>

      {query.isLoading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading vetting information…</div>}
      {query.isError && <p className="text-xs text-destructive">Could not load your vetting information. Refresh to try again.</p>}
      {currentSettings && <div className="flex items-start gap-2 text-[11px] text-muted-foreground"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Application evidence access is enabled. Each employer view still checks current publication consent and the application owner.</div>}
    </div>
  );
}
