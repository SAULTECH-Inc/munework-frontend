import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { vettingApi } from '@/lib/api';

const unwrap = (response: any) => response?.data?.data ?? response?.data ?? response;
const responseLabel: Record<string, string> = {
  observed_support: 'Observed and supports',
  observed_cannot_support: 'Observed but cannot support',
  did_not_observe: 'Did not observe',
  prefer_not_to_answer: 'Prefers not to answer',
};
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
const normalizeLabel = (value?: string) => value?.trim().normalize('NFKC').toLocaleLowerCase() ?? '';
const describeRelationship = (type?: string, detail?: string) => {
  if (!type) return detail ?? '';
  const label = relationshipLabels[type] ?? detail ?? 'Professional reference';
  if (type === 'other' && detail && detail.toLowerCase() !== label.toLowerCase()) return `${label} · ${detail}`;
  return detail && detail.toLowerCase() !== label.toLowerCase() ? `${label} · ${detail}` : label;
};

export function VettingEvidencePanel({ applicationId }: { applicationId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['application-vetting', applicationId],
    queryFn: () => vettingApi.applicationEvidence(applicationId).then(unwrap),
  });
  const items = data?.items ?? [];
  const evidenceRequests = data?.evidenceRequests ?? [];

  if (isLoading) return <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading evidence…</div>;
  if (isError) return <p className="text-xs text-muted-foreground">Evidence is unavailable for this application.</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-primary" /><p className="text-xs leading-5 text-muted-foreground">Any evidence shown below was shared with candidate consent. References are candidate-selected and may not represent all feedback. Email confirmation alone does not verify identity, employment, working relationship, or skill. Missing evidence is unknown, not a failed assessment.</p></div>
      </div>
      {evidenceRequests.length > 0 && <section className="space-y-3 rounded-xl border border-border p-4">
        <div><h3 className="text-sm font-semibold">Evidence requested for this job</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">These are employer review prompts. They do not change the match score, and no evidence remains unknown.</p></div>
        {evidenceRequests.map((request: any) => <div key={request.skill} className="rounded-lg bg-surface-raised p-3">
          <p className="text-xs font-semibold">{request.skill}</p>
          <div className="mt-2 space-y-1.5">{request.evidenceTypes.map((type: string) => {
            const matching = items.filter((item: any) => {
              const requestedType = type === 'reference' ? item.type === 'reference' : type === 'work_sample' && item.type === 'link';
              if (!requestedType) return false;
              if (item.type === 'reference') return (item.claims ?? []).some((entry: any) => normalizeLabel(entry.claim?.label) === normalizeLabel(request.skill));
              return normalizeLabel(item.claim?.label) === normalizeLabel(request.skill);
            });
            const label = type === 'reference' ? 'Professional reference' : 'Work sample / portfolio link';
            return <p key={type} className="text-[11px] text-muted-foreground">{label}: {matching.length ? `${matching.length} item${matching.length === 1 ? '' : 's'} linked to this skill; review below.` : 'No item linked to this skill (unknown).'}</p>;
          })}</div>
        </div>)}
      </section>}
      {items.length === 0 && <p className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">No vetting evidence was attached to this application.</p>}
      {items.map((item: any, index: number) => item.type === 'reference' ? (
        <article key={`${item.referenceId}-${item.revisionId}`} className="space-y-3 rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-start gap-2"><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{item.referee?.name ?? 'Professional reference'}</h3><p className="text-xs text-muted-foreground">{[item.referee?.role, item.referee?.organization, `Candidate described: ${describeRelationship(item.relationshipType, item.relationship)}`, item.relationshipConfirmed ? 'Referee confirmed the stated relationship' : null, item.overlapStart || item.overlapEnd ? `period ${item.overlapStart ?? 'not specified'} to ${item.overlapEnd ?? 'present'}` : null].filter(Boolean).join(' · ')}</p>{item.refereeRelationshipType && <p className="mt-1 text-xs text-muted-foreground">Referee described: {relationshipLabels[item.refereeRelationshipType] ?? item.refereeRelationshipType}</p>}{item.relationshipMismatch && <p className="mt-1 text-xs font-medium text-amber-700">The relationship descriptions differ. Review the details; a difference alone does not establish misconduct.</p>}</div>
            {item.emailConfirmed && <span className="rounded-full bg-surface-raised px-2 py-1 text-[10px] text-muted-foreground">Email confirmed</span>}
            {item.disputed && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] text-amber-900">Disputed</span>}
          </div>
          {item.statement && <p className="text-xs leading-5">{item.statement}</p>}
          {(item.claims ?? []).map((entry: any, claimIndex: number) => <div key={claimIndex} className="rounded-lg bg-surface-raised p-3">
            <p className="text-xs font-semibold">{entry.claim?.label ?? entry.claim?.statement ?? 'Claim'}</p>
            {entry.claim?.statement && entry.claim?.label && <p className="mt-1 text-xs text-muted-foreground">{entry.claim.statement}</p>}
            <p className="mt-2 text-xs">{responseLabel[entry.response] ?? entry.response}{entry.responsibilityLevel ? ` · ${entry.responsibilityLevel.replace(/_/g, ' ')}` : ''}</p>
            {entry.example && <p className="mt-1 text-xs leading-5 text-muted-foreground">{entry.example}</p>}
          </div>)}
          {(item.checks ?? []).length > 0 && <div className="space-y-1 border-t border-border pt-2"><p className="text-[11px] font-semibold">Separate checks</p>{item.checks.map((check: any, checkIndex: number) => <p key={checkIndex} className="text-[11px] text-muted-foreground">{check.type.replace(/_/g, ' ')}: {check.status}{check.checkedAt ? ` · checked ${new Date(check.checkedAt).toLocaleDateString()}` : ''}{check.method ? ` · ${check.method}` : ''}{check.reason ? ` · ${check.reason}` : ''}</p>)}</div>}
          <p className="text-[10px] text-muted-foreground">{item.limitations}</p>
        </article>
      ) : (
        <article key={`evidence-${index}`} className="rounded-xl border border-border p-4">
          <h3 className="text-xs font-semibold">{item.title}</h3>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-primary underline"><span className="truncate">{item.url}</span><ExternalLink className="h-3 w-3 shrink-0" /></a>
          {item.contribution && <p className="mt-2 text-xs leading-5">{item.contribution}</p>}
          {item.claim?.label && <p className="mt-2 text-[11px] text-muted-foreground">Linked claim: {item.claim.label}</p>}
          <p className="mt-2 text-[10px] text-muted-foreground">{item.label}</p>
        </article>
      ))}
    </div>
  );
}
