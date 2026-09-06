import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, TrendingUp, Award, MapPin, GraduationCap, Briefcase,
  Star, CheckCircle, AlertCircle, Clock, Target, Brain, Loader2, Sparkles
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { jobsApi } from '@/lib/api';
import { cn } from '@/lib/utils';

interface MatchDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicantId: string;
  jobId: string;
  applicantName: string;
}

export function MatchDetailsModal({
  isOpen,
  onClose,
  applicantId,
  jobId,
  applicantName,
}: MatchDetailsModalProps) {
  const { data: raw, isLoading, error } = useQuery({
    queryKey: ['job-match-details', applicantId, jobId],
    queryFn: () => jobsApi.getMatchDetails(applicantId, jobId).then(r => r.data.data ?? r.data),
    enabled: isOpen && !!applicantId && !!jobId,
  });

  const matchData = raw;

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-success bg-success/10 border-success/20';
    if (score >= 0.6) return 'text-warning bg-warning/10 border-warning/20';
    if (score >= 0.4) return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    return 'text-destructive bg-destructive/10 border-destructive/20';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 0.8) return <CheckCircle className="h-4 w-4" />;
    if (score >= 0.6) return <Star className="h-4 w-4" />;
    if (score >= 0.4) return <AlertCircle className="h-4 w-4" />;
    return <X className="h-4 w-4" />;
  };

  const formatPercentage = (score: number) => `${Math.round(score * 100)}%`;

  const getOverallMatchScore = (): number => {
    if (matchData?.breakdown?.ai_enhancements?.ai_decision?.adjusted_score != null) {
      return matchData.breakdown.ai_enhancements.ai_decision.adjusted_score;
    }
    if (matchData?.breakdown?.component_scores && matchData?.breakdown?.weights_used) {
      const scores = matchData.breakdown.component_scores;
      const weights = matchData.breakdown.weights_used;
      return Math.round(
        ((scores.skills ?? 0) * (weights.skills ?? 0.25) +
          (scores.experience ?? 0) * (weights.experience ?? 0.2) +
          (scores.title_intelligence ?? 0) * (weights.title_intelligence ?? 0.15) +
          (scores.requirements_analysis ?? 0) * (weights.requirements_analysis ?? 0.15)) * 100
      );
    }
    return 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-surface border-border/60 rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-border/40 flex items-center justify-between bg-surface-raised/50 shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-0.5 mb-1.5">
              <Sparkles className="h-3.5 w-3.5" /> AI Match Analysis
            </div>
            <DialogTitle className="text-xl font-bold text-foreground font-['Outfit',sans-serif]">
              Candidate Match breakdown
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Evaluating fit for {applicantName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <DialogBody className="p-6 overflow-y-auto space-y-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm font-semibold text-foreground">Analyzing Candidate Match Details...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-3" />
              <p className="text-sm font-bold text-foreground">Error Loading Match Breakdown</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">Unable to retrieve AI analysis for this applicant.</p>
            </div>
          )}

          {!isLoading && !error && matchData && (
            <div className="space-y-6">
              {/* Overall Match Hero Card */}
              <div className="glass rounded-2xl border border-primary/20 p-6 bg-gradient-to-r from-primary/10 via-surface-raised to-accent/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-foreground font-['Outfit',sans-serif]">
                      {getOverallMatchScore().toFixed(1)}%
                    </h3>
                    <p className="text-xs font-semibold text-muted-foreground">Overall AI Match Score</p>
                  </div>
                </div>

                {matchData.breakdown?.ai_enhancements?.ai_decision && (
                  <div className={cn(
                    'px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2',
                    matchData.breakdown.ai_enhancements.ai_decision.decision === 'AUTO_ACCEPT'
                      ? 'bg-success/10 border-success/30 text-success'
                      : matchData.breakdown.ai_enhancements.ai_decision.decision === 'AUTO_REJECT'
                      ? 'bg-destructive/10 border-destructive/30 text-destructive'
                      : 'bg-warning/10 border-warning/30 text-warning'
                  )}>
                    <Brain className="h-4 w-4" />
                    <span>AI Recommendation: {matchData.breakdown.ai_enhancements.ai_decision.decision.replace('_', ' ')}</span>
                  </div>
                )}
              </div>

              {/* Component Scores Grid */}
              {matchData.breakdown?.component_scores && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Skills */}
                  <div className={cn('rounded-2xl border p-4 space-y-2', getScoreColor(matchData.breakdown.component_scores.skills))}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        <span className="text-xs font-bold">Skills Match</span>
                      </div>
                      {getScoreIcon(matchData.breakdown.component_scores.skills)}
                    </div>
                    <p className="text-2xl font-black font-['Outfit',sans-serif]">
                      {formatPercentage(matchData.breakdown.component_scores.skills)}
                    </p>
                    <p className="text-[11px] font-medium opacity-80">
                      Matched: {matchData.breakdown.detailed_analysis?.skills?.total_matched ?? 0} / Missing: {matchData.breakdown.detailed_analysis?.skills?.missing_skills?.length ?? 0}
                    </p>
                  </div>

                  {/* Experience */}
                  <div className={cn('rounded-2xl border p-4 space-y-2', getScoreColor(matchData.breakdown.component_scores.experience))}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        <span className="text-xs font-bold">Experience</span>
                      </div>
                      {getScoreIcon(matchData.breakdown.component_scores.experience)}
                    </div>
                    <p className="text-2xl font-black font-['Outfit',sans-serif]">
                      {formatPercentage(matchData.breakdown.component_scores.experience)}
                    </p>
                    <p className="text-[11px] font-medium opacity-80 capitalize">
                      {matchData.breakdown.detailed_analysis?.experience?.evidence ?? matchData.breakdown.detailed_analysis?.experience?.status ?? 'Evaluated'}
                    </p>
                  </div>

                  {/* Title Intelligence */}
                  <div className={cn('rounded-2xl border p-4 space-y-2', getScoreColor(matchData.breakdown.component_scores.title_intelligence))}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        <span className="text-xs font-bold">Title Intelligence</span>
                      </div>
                      {getScoreIcon(matchData.breakdown.component_scores.title_intelligence)}
                    </div>
                    <p className="text-2xl font-black font-['Outfit',sans-serif]">
                      {formatPercentage(matchData.breakdown.component_scores.title_intelligence)}
                    </p>
                    <p className="text-[11px] font-medium opacity-80 truncate">
                      {matchData.breakdown.detailed_analysis?.title?.evidence ?? matchData.breakdown.detailed_analysis?.title?.applicant_title ?? 'Title Similarity'}
                    </p>
                  </div>

                  {/* Location */}
                  <div className={cn('rounded-2xl border p-4 space-y-2', getScoreColor(matchData.breakdown.component_scores.location))}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="text-xs font-bold">Location</span>
                      </div>
                      {getScoreIcon(matchData.breakdown.component_scores.location)}
                    </div>
                    <p className="text-2xl font-black font-['Outfit',sans-serif]">
                      {formatPercentage(matchData.breakdown.component_scores.location)}
                    </p>
                    <p className="text-[11px] font-medium opacity-80 truncate">
                      {matchData.breakdown.detailed_analysis?.location?.evidence ?? matchData.breakdown.detailed_analysis?.location?.reason ?? 'Location Compatible'}
                    </p>
                  </div>

                  {/* Education */}
                  <div className={cn('rounded-2xl border p-4 space-y-2', getScoreColor(matchData.breakdown.component_scores.education))}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        <span className="text-xs font-bold">Education</span>
                      </div>
                      {getScoreIcon(matchData.breakdown.component_scores.education)}
                    </div>
                    <p className="text-2xl font-black font-['Outfit',sans-serif]">
                      {formatPercentage(matchData.breakdown.component_scores.education)}
                    </p>
                    <p className="text-[11px] font-medium opacity-80 truncate">
                      {matchData.breakdown.detailed_analysis?.education?.evidence ?? matchData.breakdown.detailed_analysis?.education?.status ?? 'Degree Qualified'}
                    </p>
                  </div>

                  {/* Requirements */}
                  <div className={cn('rounded-2xl border p-4 space-y-2', getScoreColor(matchData.breakdown.component_scores.requirements_analysis))}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs font-bold">Requirements</span>
                      </div>
                      {getScoreIcon(matchData.breakdown.component_scores.requirements_analysis)}
                    </div>
                    <p className="text-2xl font-black font-['Outfit',sans-serif]">
                      {formatPercentage(matchData.breakdown.component_scores.requirements_analysis)}
                    </p>
                    <p className="text-[11px] font-medium opacity-80 truncate">
                      {matchData.breakdown.detailed_analysis?.requirements?.evidence ?? 'Criteria fulfilled'}
                    </p>
                  </div>
                </div>
              )}

              {/* Detailed Skills Analysis */}
              {matchData.breakdown?.detailed_analysis?.skills && (
                <div className="glass rounded-2xl border border-border/50 p-5 space-y-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" /> Detailed Skills Analysis
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Matched */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-success flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5" /> Matched Skills ({matchData.breakdown.detailed_analysis.skills.matched_skills?.length ?? 0})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {matchData.breakdown.detailed_analysis.skills.matched_skills?.map((s: string, i: number) => (
                          <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-success/10 text-success border border-success/20">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Missing */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-destructive flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5" /> Missing Skills ({matchData.breakdown.detailed_analysis.skills.missing_skills?.length ?? 0})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {matchData.breakdown.detailed_analysis.skills.missing_skills?.map((s: string, i: number) => (
                          <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Insights & Reasoning */}
              {matchData.breakdown?.ai_enhancements?.ai_decision?.reason && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-2">
                  <h4 className="text-xs font-bold text-primary flex items-center gap-2">
                    <Brain className="h-4 w-4" /> AI Analysis Insight
                  </h4>
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    {matchData.breakdown.ai_enhancements.ai_decision.reason}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
