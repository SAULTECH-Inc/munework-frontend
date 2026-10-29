import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/lib/api';
import type { Job } from '@/types';

const SCORE_BATCH_SIZE = 20;

interface MatchScoresResponse {
  scores?: Record<string, number>;
}

export function useJobMatchScores(jobs: Job[], applicantId?: string) {
  const missingJobIds = applicantId
    ? [...new Set(jobs
        .filter((job) => job.aiMatchScore == null && job.matchScore == null)
        .map((job) => job.id))]
    : [];

  const scoreQuery = useQuery({
    queryKey: ['job-match-scores', applicantId, missingJobIds],
    queryFn: async (): Promise<MatchScoresResponse> => {
      const scores: Record<string, number> = {};
      for (let start = 0; start < missingJobIds.length; start += SCORE_BATCH_SIZE) {
        const batch = missingJobIds.slice(start, start + SCORE_BATCH_SIZE);
        const response = await jobsApi.getMatchScores(batch);
        const payload = response.data?.data ?? response.data;
        Object.assign(scores, payload?.scores ?? {});
      }
      return { scores };
    },
    enabled: Boolean(applicantId && missingJobIds.length),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const scores = scoreQuery.data?.scores ?? {};
  const enrichedJobs = jobs.map((job) => {
    const score = scores[job.id];
    return score == null || job.aiMatchScore != null || job.matchScore != null
      ? job
      : { ...job, matchScore: score, aiMatchScore: score / 100 };
  });

  const matchScoreStatus = !applicantId
    ? undefined
    : scoreQuery.isFetching
      ? 'pending'
      : scoreQuery.isError || scoreQuery.data
        ? 'unavailable'
        : undefined;

  return { jobs: enrichedJobs, matchScoreStatus } as const;
}
