import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Info,
  Loader2,
  RefreshCw,
  Target,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import {
  buildOptimalSubmissionPlan,
  computePaperCompleteness,
  computeSubmissionOpportunity,
  type VenueFitScoreRecord,
} from '@/lib/research-intelligence';
import type { Paper, Submission, ValidationError, Venue } from '@/types/types';

function getFitClass(score: number) {
  if (score >= 70) return 'fit-high';
  if (score >= 40) return 'fit-mid';
  return 'fit-low';
}

function getFitBgClass(score: number) {
  if (score >= 70) return 'bg-fit-high border';
  if (score >= 40) return 'bg-fit-mid border';
  return 'bg-fit-low border';
}

function getFitLabel(score: number) {
  if (score >= 70) return 'High fit';
  if (score >= 40) return 'Medium fit';
  return 'Low fit';
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export default function SubmissionOptimizer() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [fitScores, setFitScores] = useState<VenueFitScoreRecord[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [selectedPaper, setSelectedPaper] = useState('all');
  const [loading, setLoading] = useState(true);
  const [analysingAll, setAnalysingAll] = useState(false);
  const [analysingKeys, setAnalysingKeys] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [papersRes, venuesRes, scoresRes, submissionsRes, errorsRes] = await Promise.all([
        supabase.from('papers').select('*').in('status', ['Ready', 'Draft']),
        supabase.from('venues').select('*'),
        supabase.from('venue_fit_scores').select('*'),
        supabase.from('submissions').select('*'),
        supabase.from('validation_errors').select('*').eq('is_resolved', false),
      ]);

      if (papersRes.error) throw papersRes.error;
      if (venuesRes.error) throw venuesRes.error;
      if (scoresRes.error) throw scoresRes.error;
      if (submissionsRes.error) throw submissionsRes.error;
      if (errorsRes.error) throw errorsRes.error;

      setPapers(Array.isArray(papersRes.data) ? papersRes.data : []);
      setVenues(Array.isArray(venuesRes.data) ? venuesRes.data : []);
      setFitScores(Array.isArray(scoresRes.data) ? (scoresRes.data as VenueFitScoreRecord[]) : []);
      setSubmissions(Array.isArray(submissionsRes.data) ? submissionsRes.data : []);
      setValidationErrors(Array.isArray(errorsRes.data) ? errorsRes.data : []);
    } catch (error) {
      console.error('Submission optimizer load error:', error);
      toast.error('Failed to load submission intelligence data.');
    } finally {
      setLoading(false);
    }
  };

  const scoredPairKeys = useMemo(
    () => new Set(fitScores.map((score) => `${score.paper_id}:${score.venue_id}`)),
    [fitScores]
  );

  const filteredPapers = useMemo(
    () => (selectedPaper === 'all' ? papers : papers.filter((paper) => paper.id === selectedPaper)),
    [papers, selectedPaper]
  );

  const opportunities = useMemo(
    () =>
      filteredPapers
        .flatMap((paper) =>
          venues.map((venue) =>
            computeSubmissionOpportunity(paper, venue, fitScores, submissions, validationErrors)
          )
        )
        .sort((left, right) => right.compositeScore - left.compositeScore),
    [filteredPapers, fitScores, submissions, validationErrors, venues]
  );

  const optimalOrder = useMemo(
    () => buildOptimalSubmissionPlan(papers, venues, fitScores, submissions, validationErrors),
    [papers, venues, fitScores, submissions, validationErrors]
  );

  const readyPapers = useMemo(
    () => papers.filter((paper) => paper.status === 'Ready'),
    [papers]
  );

  const analysedCount = fitScores.length;
  const totalPairs = papers.length * venues.length;
  const highFitCount = opportunities.filter((opportunity) => opportunity.compositeScore >= 70).length;
  const avgSlotScore = opportunities.length
    ? Math.round(
        opportunities.reduce((total, opportunity) => total + opportunity.compositeScore, 0) /
          opportunities.length
      )
    : 0;
  const unscoredPairs = papers.flatMap((paper) =>
    venues
      .filter((venue) => !scoredPairKeys.has(`${paper.id}:${venue.id}`))
      .map((venue) => ({ paperId: paper.id, venueId: venue.id }))
  );

  const analysePair = async (paperId: string, venueId: string) => {
    const pairKey = `${paperId}:${venueId}`;
    setAnalysingKeys((current) => (current.includes(pairKey) ? current : [...current, pairKey]));

    try {
      const paper = papers.find((item) => item.id === paperId);
      const venue = venues.find((item) => item.id === venueId);

      if (!paper || !venue) {
        throw new Error('Paper or venue not found.');
      }

      const completeness = computePaperCompleteness(paper, validationErrors);
      const pairSubmissions = submissions.filter(
        (submission) => submission.paper_id === paperId && submission.venue_id === venueId
      );

      const { data, error } = await supabase.functions.invoke('compute-fit-score', {
        body: {
          paper,
          venue,
          completeness: {
            abstractReady: completeness.abstractReady,
            keywordsReady: completeness.keywordsReady,
            referencesReady: completeness.referencesReady,
            formattingReady: completeness.formattingReady,
            score: completeness.score,
          },
          submissionHistory: {
            attempts: pairSubmissions.length,
            previousStatuses: pairSubmissions.map((submission) => submission.status),
          },
        },
      });

      if (error) throw error;

      const { fit_score, reason_summary, strengths, weaknesses } = data;

      const { data: saved, error: saveError } = await supabase
        .from('venue_fit_scores')
        .upsert(
          {
            paper_id: paperId,
            venue_id: venueId,
            fit_score,
            reason_summary,
            strengths: strengths || [],
            weaknesses: weaknesses || [],
            analysed_at: new Date().toISOString(),
          },
          { onConflict: 'paper_id,venue_id' }
        )
        .select()
        .single();

      if (saveError) throw saveError;

      setFitScores((current) => {
        const next = current.filter(
          (score) => !(score.paper_id === paperId && score.venue_id === venueId)
        );
        return [...next, saved as VenueFitScoreRecord];
      });

      toast.success(`Scope fit scored ${fit_score}/100 for "${paper.title}" at ${venue.name}.`);
    } catch (error: any) {
      console.error('Pair analysis error:', error);
      const message =
        error?.error_description ||
        error?.message ||
        (typeof error === 'string' ? error : 'Venue analysis failed.');
      toast.error(message);
    } finally {
      setAnalysingKeys((current) => current.filter((key) => key !== pairKey));
    }
  };

  const analyseAll = async () => {
    if (unscoredPairs.length === 0) {
      toast.info('Every paper and venue pair already has a scope score.');
      return;
    }

    setAnalysingAll(true);
    try {
      for (const pair of unscoredPairs) {
        await analysePair(pair.paperId, pair.venueId);
      }
      toast.success('Finished scoring every unanalysed paper and venue pair.');
    } finally {
      setAnalysingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div className="space-y-8" initial="hidden" animate="visible" variants={containerVariants}>
      <motion.div variants={itemVariants} className="space-y-1">
        <h2 className="text-3xl font-light tracking-tight flex items-center gap-3">
          <Zap className="h-8 w-8 text-amber-500 animate-pulse-slow" />
          Best Slot to Apply
        </h2>
        <p className="text-muted-foreground">
          Rank each paper by venue scope match, previous submission history, and structural readiness
          before you spend a submission slot.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-none hover-lift hover-glow">
          <CardContent className="pt-6 space-y-1">
            <p className="text-4xl font-light">{readyPapers.length}</p>
            <p className="text-sm text-muted-foreground">Ready papers</p>
            <p className="text-xs text-muted-foreground">Currently eligible for submission ranking</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none hover-lift hover-glow">
          <CardContent className="pt-6 space-y-1">
            <p className="text-4xl font-light">{optimalOrder.length}</p>
            <p className="text-sm text-muted-foreground">Optimal submission order</p>
            <p className="text-xs text-muted-foreground">Best venue picked for each ready paper</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none hover-lift hover-glow">
          <CardContent className="pt-6 space-y-1">
            <p className={`text-4xl font-light ${highFitCount > 0 ? 'fit-high' : ''}`}>{highFitCount}</p>
            <p className="text-sm text-muted-foreground">High-confidence slots</p>
            <p className="text-xs text-muted-foreground">Composite score of 70 or above</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none hover-lift hover-glow">
          <CardContent className="pt-6 space-y-1">
            <p className={`text-4xl font-light ${getFitClass(avgSlotScore)}`}>{avgSlotScore || '-'}</p>
            <p className="text-sm text-muted-foreground">Average slot score</p>
            <Progress value={totalPairs > 0 ? (analysedCount / totalPairs) * 100 : 0} className="h-1 mt-2" />
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-500" />
              Intelligent submission order
            </CardTitle>
            <CardDescription>
              You have {readyPapers.length} paper{readyPapers.length === 1 ? '' : 's'} ready. Here is the
              optimal submission order for maximum acceptance probability.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {optimalOrder.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Mark at least one paper as Ready and configure venues to generate an ordered submission plan.
              </div>
            ) : (
              optimalOrder.map((opportunity, index) => (
                <div key={`${opportunity.paper.id}:${opportunity.venue.id}`} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <p className="font-medium">{opportunity.paper.title}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Submit to <span className="font-medium text-foreground">{opportunity.venue.name}</span>
                        {' '}for the strongest current fit.
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`text-3xl font-light ${getFitClass(opportunity.compositeScore)}`}>
                          {opportunity.compositeScore}
                        </p>
                        <p className="text-xs text-muted-foreground">slot score</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setSelectedPaper(opportunity.paper.id)}>
                        Inspect pair
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">Scope fit {opportunity.semanticFitScore}/100</Badge>
                    <Badge variant="secondary">Completeness {opportunity.completeness.score}/100</Badge>
                    <Badge variant="secondary">{opportunity.history.label}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-wrap gap-3 items-center">
        <Select value={selectedPaper} onValueChange={setSelectedPaper}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Filter by paper" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All papers</SelectItem>
            {papers.map((paper) => (
              <SelectItem key={paper.id} value={paper.id}>
                {paper.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Button size="sm" onClick={analyseAll} disabled={analysingAll || unscoredPairs.length === 0}>
          {analysingAll ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Zap className="h-4 w-4 mr-2" />
          )}
          Analyse all unscored
        </Button>
        {unscoredPairs.length > 0 && (
          <Badge variant="outline">{unscoredPairs.length} pairs still need AI scope analysis</Badge>
        )}
      </motion.div>

      {papers.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-2">
            <TriangleAlert className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-medium">No papers in Ready or Draft state</p>
            <p className="text-sm text-muted-foreground">Add papers from Research Papers to start ranking.</p>
          </CardContent>
        </Card>
      )}

      {venues.length === 0 && papers.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-2">
            <TriangleAlert className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-medium">No venues configured</p>
            <p className="text-sm text-muted-foreground">Add journals or conferences in Venues & Journals first.</p>
          </CardContent>
        </Card>
      )}

      {opportunities.length > 0 && (
        <motion.div variants={containerVariants} className="space-y-4">
          {opportunities.map((opportunity) => {
            const pairKey = `${opportunity.paper.id}:${opportunity.venue.id}`;
            const isAnalysing = analysingKeys.includes(pairKey);
            const hasSemanticScore = scoredPairKeys.has(pairKey);

            return (
              <motion.div key={pairKey} variants={itemVariants}>
                <Card className={`border transition-all ${getFitBgClass(opportunity.compositeScore)}`}>
                  <CardHeader className="pb-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{opportunity.paper.title}</CardTitle>
                        <CardDescription>
                          {opportunity.venue.name} <Badge variant="outline" className="ml-1">{opportunity.venue.type}</Badge>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {opportunity.compositeScore >= 70 && (
                          <Badge className="bg-fit-high fit-high border" variant="outline">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Recommended
                          </Badge>
                        )}
                        {!hasSemanticScore && <Badge variant="outline">Scope fit pending</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="rounded-lg bg-background/70 p-4">
                        <p className={`text-4xl font-light ${getFitClass(opportunity.compositeScore)}`}>
                          {opportunity.compositeScore}
                        </p>
                        <p className="text-xs text-muted-foreground">Final slot score</p>
                      </div>
                      <div className="rounded-lg bg-background/70 p-4">
                        <p className={`text-2xl font-light ${getFitClass(opportunity.semanticFitScore)}`}>
                          {hasSemanticScore ? opportunity.semanticFitScore : '-'}
                        </p>
                        <p className="text-xs text-muted-foreground">Keywords vs venue scope</p>
                      </div>
                      <div className="rounded-lg bg-background/70 p-4">
                        <p className={`text-2xl font-light ${getFitClass(opportunity.completeness.score)}`}>
                          {opportunity.completeness.score}
                        </p>
                        <p className="text-xs text-muted-foreground">Completeness readiness</p>
                      </div>
                      <div className="rounded-lg bg-background/70 p-4">
                        <p className={`text-base font-medium ${getFitClass(opportunity.history.score)}`}>
                          {opportunity.history.label}
                        </p>
                        <p className="text-xs text-muted-foreground">Previous submission history</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="secondary">
                        Abstract {opportunity.completeness.abstractReady ? 'ready' : 'missing'}
                      </Badge>
                      <Badge variant="secondary">
                        Keywords {opportunity.completeness.keywordCount > 0 ? opportunity.completeness.keywordCount : 0}
                      </Badge>
                      <Badge variant="secondary">
                        References {opportunity.completeness.referencesReady ? 'ready' : 'missing'}
                      </Badge>
                      <Badge variant="secondary">
                        Formatting {opportunity.completeness.formattingReady ? 'ready' : 'needs work'}
                      </Badge>
                    </div>

                    {opportunity.fitReason && (
                      <p className="text-sm text-muted-foreground">{opportunity.fitReason}</p>
                    )}

                    {opportunity.completeness.notes.length > 0 && (
                      <div className="rounded-lg border border-dashed bg-background/70 p-3 text-sm text-muted-foreground">
                        {opportunity.completeness.notes.join(' ')}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={hasSemanticScore ? 'outline' : 'default'}
                        onClick={() => analysePair(opportunity.paper.id, opportunity.venue.id)}
                        disabled={isAnalysing}
                      >
                        {isAnalysing ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : hasSemanticScore ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Re-analyse scope
                          </>
                        ) : (
                          <>
                            <Zap className="h-3 w-3 mr-1" />
                            Analyse scope
                          </>
                        )}
                      </Button>
                      <Badge variant="outline" className={getFitClass(opportunity.compositeScore)}>
                        {getFitLabel(opportunity.compositeScore)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {opportunities.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 bg-muted/40">
            <CardContent className="py-4 flex gap-3 items-start">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                The slot score combines AI scope fit, previous submission history for the same venue,
                and paper completeness across abstract, keywords, references, and formatting readiness.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {selectedPaper !== 'all' && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 bg-muted/30">
            <CardContent className="py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Showing slot analysis for one paper. Switch back to all papers to compare the full queue.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedPaper('all')}>
                Show all
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
