import type { Paper, Submission, ValidationError, Venue } from '@/types/types';

export interface VenueFitScoreRecord {
  id?: string;
  paper_id: string;
  venue_id: string;
  fit_score: number;
  reason_summary?: string | null;
  strengths?: string[] | null;
  weaknesses?: string[] | null;
  analysed_at?: string;
}

export interface PaperCompleteness {
  score: number;
  abstractReady: boolean;
  keywordsReady: boolean;
  keywordCount: number;
  referencesReady: boolean;
  formattingReady: boolean;
  blockingIssues: number;
  notes: string[];
}

export interface SubmissionHistorySummary {
  attempts: number;
  rejectedCount: number;
  hasAccepted: boolean;
  hasActiveSubmission: boolean;
  score: number;
  label: string;
}

export interface SubmissionOpportunity {
  paper: Paper;
  venue: Venue;
  semanticFitScore: number;
  completeness: PaperCompleteness;
  history: SubmissionHistorySummary;
  compositeScore: number;
  fitReason: string | null;
}

export interface LowFitSubmissionAttempt {
  submission: Submission;
  paper: Paper | undefined;
  venue: Venue | undefined;
  fitScore: number;
}

export interface ResearchEfficiencyReport {
  score: number;
  recentPaperActivity: number;
  recentSubmissionActivity: number;
  stalledCount: number;
  overdueReviewCount: number;
  lowFitCount: number;
  summary: string;
}

export const STALE_THRESHOLDS: Record<string, number> = {
  Draft: 14,
  Ready: 7,
  Submitted: 60,
  'Under Review': 90,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

export function countKeywords(keywords: string[] | null | undefined) {
  return keywords?.filter((keyword) => keyword.trim().length > 0).length ?? 0;
}

export function hasReferenceSection(content: string | null | undefined) {
  if (!content) return false;

  return (
    /(^|\n)\s*(references|bibliography)\s*$/im.test(content) ||
    /\[[0-9]+\]/.test(content) ||
    /\([A-Z][A-Za-z-]+,\s?\d{4}[a-z]?\)/.test(content)
  );
}

function isFormattingIssue(error: ValidationError) {
  if (error.is_resolved) return false;

  return (
    error.severity === 'error' ||
    error.error_type === 'citation_format' ||
    error.error_code.includes('FORMAT') ||
    error.error_code.includes('FILE_') ||
    error.error_code.includes('MISSING_')
  );
}

export function getPaperValidationErrors(paperId: string, errors: ValidationError[]) {
  return errors.filter((error) => error.paper_id === paperId && !error.is_resolved);
}

export function computePaperCompleteness(paper: Paper, errors: ValidationError[] = []): PaperCompleteness {
  const paperErrors = getPaperValidationErrors(paper.id, errors);
  const keywordCount = countKeywords(paper.keywords);
  const abstractReady = Boolean(paper.abstract?.trim());
  const keywordsReady = keywordCount >= 3;
  const referencesReady = hasReferenceSection(paper.content);
  const blockingIssues = paperErrors.filter(isFormattingIssue).length;
  const formattingReady = blockingIssues === 0;

  const score = Math.round(
    (abstractReady ? 25 : 0) +
      (keywordsReady ? 25 : keywordCount > 0 ? 10 : 0) +
      (referencesReady ? 25 : 0) +
      (formattingReady ? 25 : paperErrors.length > 0 ? 10 : 0)
  );

  const notes: string[] = [];
  if (!abstractReady) notes.push('Add a complete abstract.');
  if (!keywordsReady) notes.push(keywordCount === 0 ? 'Add keywords.' : 'Expand keywords to at least 3.');
  if (!referencesReady) notes.push('Add a references or bibliography section.');
  if (!formattingReady) notes.push('Resolve validation issues before submission.');

  return {
    score,
    abstractReady,
    keywordsReady,
    keywordCount,
    referencesReady,
    formattingReady,
    blockingIssues,
    notes,
  };
}

export function summarizeSubmissionHistory(submissions: Submission[]): SubmissionHistorySummary {
  const attempts = submissions.length;
  const rejectedCount = submissions.filter((submission) => submission.status === 'Rejected').length;
  const hasAccepted = submissions.some((submission) => submission.status === 'Accepted');
  const hasActiveSubmission = submissions.some(
    (submission) => submission.status === 'Submitted' || submission.status === 'Under Review'
  );

  if (hasAccepted) {
    return {
      attempts,
      rejectedCount,
      hasAccepted,
      hasActiveSubmission,
      score: 0,
      label: 'Already accepted at this venue',
    };
  }

  if (hasActiveSubmission) {
    return {
      attempts,
      rejectedCount,
      hasAccepted,
      hasActiveSubmission,
      score: 15,
      label: 'Already in progress at this venue',
    };
  }

  if (rejectedCount === 0) {
    return {
      attempts,
      rejectedCount,
      hasAccepted,
      hasActiveSubmission,
      score: 100,
      label: attempts === 0 ? 'Fresh venue opportunity' : 'No rejection history',
    };
  }

  if (rejectedCount === 1) {
    return {
      attempts,
      rejectedCount,
      hasAccepted,
      hasActiveSubmission,
      score: 60,
      label: 'Rejected once before',
    };
  }

  if (rejectedCount === 2) {
    return {
      attempts,
      rejectedCount,
      hasAccepted,
      hasActiveSubmission,
      score: 35,
      label: 'Rejected twice before',
    };
  }

  return {
    attempts,
    rejectedCount,
    hasAccepted,
    hasActiveSubmission,
    score: 20,
    label: 'Repeated rejections at this venue',
  };
}

export function computeSubmissionOpportunity(
  paper: Paper,
  venue: Venue,
  fitScores: VenueFitScoreRecord[],
  submissions: Submission[],
  errors: ValidationError[]
): SubmissionOpportunity {
  const fitScore = fitScores.find((score) => score.paper_id === paper.id && score.venue_id === venue.id) ?? null;
  const pairSubmissions = submissions.filter(
    (submission) => submission.paper_id === paper.id && submission.venue_id === venue.id
  );
  const completeness = computePaperCompleteness(paper, errors);
  const history = summarizeSubmissionHistory(pairSubmissions);
  const semanticFitScore = fitScore?.fit_score ?? 0;

  const compositeScore = clamp(
    Math.round(semanticFitScore * 0.55 + completeness.score * 0.25 + history.score * 0.2),
    0,
    100
  );

  return {
    paper,
    venue,
    semanticFitScore,
    completeness,
    history,
    compositeScore,
    fitReason: fitScore?.reason_summary ?? null,
  };
}

export function buildOptimalSubmissionPlan(
  papers: Paper[],
  venues: Venue[],
  fitScores: VenueFitScoreRecord[],
  submissions: Submission[],
  errors: ValidationError[]
) {
  const readyPapers = papers.filter((paper) => paper.status === 'Ready');

  return readyPapers
    .map((paper) => {
      const opportunities = venues.map((venue) =>
        computeSubmissionOpportunity(paper, venue, fitScores, submissions, errors)
      );
      const eligibleOpportunities = opportunities.filter(
        (opportunity) => !opportunity.history.hasAccepted && !opportunity.history.hasActiveSubmission
      );
      const rankedOpportunities = (eligibleOpportunities.length > 0 ? eligibleOpportunities : opportunities).sort(
        (left, right) => right.compositeScore - left.compositeScore
      );

      return rankedOpportunities[0] ?? null;
    })
    .filter((opportunity): opportunity is SubmissionOpportunity => Boolean(opportunity))
    .sort((left, right) => right.compositeScore - left.compositeScore);
}

export function getLowFitSubmissionAttempts(
  papers: Paper[],
  submissions: Submission[],
  venues: Venue[],
  fitScores: VenueFitScoreRecord[]
) {
  return submissions
    .map((submission) => {
      const fitScore = fitScores.find(
        (score) => score.paper_id === submission.paper_id && score.venue_id === submission.venue_id
      );

      return {
        submission,
        paper: papers.find((paper) => paper.id === submission.paper_id),
        venue: venues.find((venue) => venue.id === submission.venue_id),
        fitScore: fitScore?.fit_score ?? 0,
      };
    })
    .filter((attempt) => attempt.fitScore < 40 && attempt.submission.status !== 'Accepted')
    .sort((left, right) => left.fitScore - right.fitScore);
}

export function computeWeeklyResearchEfficiency(
  papers: Paper[],
  submissions: Submission[],
  venues: Venue[],
  fitScores: VenueFitScoreRecord[]
): ResearchEfficiencyReport {
  if (papers.length === 0 && submissions.length === 0) {
    return {
      score: 0,
      recentPaperActivity: 0,
      recentSubmissionActivity: 0,
      stalledCount: 0,
      overdueReviewCount: 0,
      lowFitCount: 0,
      summary: 'No paper activity yet.',
    };
  }

  const weekAgo = Date.now() - 7 * 86_400_000;
  const recentPaperActivity = papers.filter(
    (paper) => new Date(paper.updated_at).getTime() >= weekAgo
  ).length;
  const recentSubmissionActivity = submissions.filter(
    (submission) => new Date(submission.submitted_at).getTime() >= weekAgo
  ).length;
  const stalledCount = papers.filter((paper) => {
    const threshold = STALE_THRESHOLDS[paper.status];
    return threshold ? daysSince(paper.updated_at) >= threshold : false;
  }).length;
  const overdueReviewCount = papers.filter(
    (paper) => paper.status === 'Under Review' && daysSince(paper.updated_at) >= STALE_THRESHOLDS['Under Review']
  ).length;
  const lowFitCount = getLowFitSubmissionAttempts(papers, submissions, venues, fitScores).length;

  const activityRatio = clamp(
    (recentPaperActivity + recentSubmissionActivity) / Math.max(papers.length, 1),
    0,
    1
  );
  const stallHealth = papers.length > 0 ? 1 - stalledCount / papers.length : 1;
  const reviewPopulation = papers.filter((paper) => paper.status === 'Under Review').length;
  const reviewHealth = reviewPopulation > 0 ? 1 - overdueReviewCount / reviewPopulation : 1;
  const strategyHealth = submissions.length > 0 ? 1 - lowFitCount / submissions.length : 1;

  const score = Math.round(
    clamp(activityRatio * 35 + stallHealth * 25 + reviewHealth * 20 + strategyHealth * 20, 0, 100)
  );

  let summary = 'Research effort is moving smoothly this week.';
  if (score < 45) {
    summary = 'Too much effort is being lost to stalled papers or low-fit submissions.';
  } else if (score < 70) {
    summary = 'Progress is healthy, but a few workflow blockers still need attention.';
  }

  return {
    score,
    recentPaperActivity,
    recentSubmissionActivity,
    stalledCount,
    overdueReviewCount,
    lowFitCount,
    summary,
  };
}
