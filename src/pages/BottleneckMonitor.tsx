import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  Gauge,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import {
  computeWeeklyResearchEfficiency,
  daysSince,
  getLowFitSubmissionAttempts,
  STALE_THRESHOLDS,
  type VenueFitScoreRecord,
} from '@/lib/research-intelligence';
import type { Paper, Submission, Venue } from '@/types/types';

interface StageInfo {
  label: string;
  statuses: string[];
  color: string;
  bgClass: string;
  icon: typeof FileText;
}

interface PaperWithAge extends Paper {
  daysInStage: number;
  isStale: boolean;
}

const STAGES: StageInfo[] = [
  { label: 'Draft', statuses: ['Draft'], color: 'hsl(0,0%,50%)', bgClass: 'bg-muted/40', icon: FileText },
  { label: 'Ready', statuses: ['Ready'], color: 'hsl(217,91%,60%)', bgClass: 'bg-skill-gap', icon: TrendingUp },
  { label: 'Submitted', statuses: ['Submitted'], color: 'hsl(38,92%,50%)', bgClass: 'bg-fit-mid', icon: Clock3 },
  {
    label: 'Under Review',
    statuses: ['Under Review'],
    color: 'hsl(38,92%,50%)',
    bgClass: 'bg-fit-mid',
    icon: Clock3,
  },
  { label: 'Accepted', statuses: ['Accepted'], color: 'hsl(142,76%,36%)', bgClass: 'bg-fit-high', icon: CheckCircle2 },
  {
    label: 'Rejected',
    statuses: ['Rejected'],
    color: 'hsl(4,86%,58%)',
    bgClass: 'bg-fit-low',
    icon: AlertTriangle,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export default function BottleneckMonitor() {
  const [papers, setPapers] = useState<PaperWithAge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [fitScores, setFitScores] = useState<VenueFitScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [papersRes, submissionsRes, venuesRes, scoresRes] = await Promise.all([
        supabase.from('papers').select('*').order('updated_at', { ascending: false }),
        supabase.from('submissions').select('*'),
        supabase.from('venues').select('*'),
        supabase.from('venue_fit_scores').select('*'),
      ]);

      if (papersRes.error) throw papersRes.error;
      if (submissionsRes.error) throw submissionsRes.error;
      if (venuesRes.error) throw venuesRes.error;
      if (scoresRes.error) throw scoresRes.error;

      const rawPapers = Array.isArray(papersRes.data) ? papersRes.data : [];
      const enrichedPapers: PaperWithAge[] = rawPapers.map((paper) => {
        const stageDays = daysSince(paper.updated_at);
        const threshold = STALE_THRESHOLDS[paper.status];

        return {
          ...paper,
          daysInStage: stageDays,
          isStale: threshold ? stageDays >= threshold : false,
        };
      });

      setPapers(enrichedPapers);
      setSubmissions(Array.isArray(submissionsRes.data) ? submissionsRes.data : []);
      setVenues(Array.isArray(venuesRes.data) ? venuesRes.data : []);
      setFitScores(Array.isArray(scoresRes.data) ? (scoresRes.data as VenueFitScoreRecord[]) : []);
    } catch (error) {
      console.error('Research flow monitor load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const stalledDrafts = useMemo(
    () => papers.filter((paper) => paper.status === 'Draft' && paper.isStale),
    [papers]
  );

  const overdueReviews = useMemo(
    () => papers.filter((paper) => paper.status === 'Under Review' && paper.isStale),
    [papers]
  );

  const lowFitAttempts = useMemo(
    () => getLowFitSubmissionAttempts(papers, submissions, venues, fitScores),
    [fitScores, papers, submissions, venues]
  );

  const researchEfficiency = useMemo(
    () => computeWeeklyResearchEfficiency(papers, submissions, venues, fitScores),
    [fitScores, papers, submissions, venues]
  );

  const biggestStage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const paper of papers) {
      counts[paper.status] = (counts[paper.status] || 0) + 1;
    }
    return Object.entries(counts).sort((left, right) => right[1] - left[1])[0]?.[0] || '-';
  }, [papers]);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-56" />
        <div className="grid gap-3 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((index) => (
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
          <BarChart3 className="h-8 w-8 text-[hsl(38,92%,50%)]" />
          Research Flow Monitor
        </h2>
        <p className="text-muted-foreground">
          Track every paper from Draft to Accepted, then flag the friction points that are consuming
          research time.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-none hover-lift hover-glow">
          <CardContent className="pt-6 space-y-1">
            <p className={`text-4xl font-light ${stalledDrafts.length > 0 ? 'fit-low' : 'fit-high'}`}>
              {stalledDrafts.length}
            </p>
            <p className="text-sm text-muted-foreground">Drafts stuck over 2 weeks</p>
            <p className="text-xs text-muted-foreground">Directly matches the draft-stage risk in the MVP</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none hover-lift hover-glow">
          <CardContent className="pt-6 space-y-1">
            <p className={`text-4xl font-light ${overdueReviews.length > 0 ? 'fit-mid' : 'fit-high'}`}>
              {overdueReviews.length}
            </p>
            <p className="text-sm text-muted-foreground">Reviews beyond turnaround</p>
            <p className="text-xs text-muted-foreground">Papers under review longer than the expected period</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none hover-lift hover-glow">
          <CardContent className="pt-6 space-y-1">
            <p className={`text-4xl font-light ${lowFitAttempts.length > 0 ? 'fit-low' : 'fit-high'}`}>
              {lowFitAttempts.length}
            </p>
            <p className="text-sm text-muted-foreground">Low-fit submission attempts</p>
            <p className="text-xs text-muted-foreground">Attempts where the paper-fit score was below 40</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none hover-lift hover-glow">
          <CardContent className="pt-6 space-y-1">
            <p
              className={`text-4xl font-light ${
                researchEfficiency.score >= 70
                  ? 'fit-high'
                  : researchEfficiency.score >= 45
                    ? 'fit-mid'
                    : 'fit-low'
              }`}
            >
              {researchEfficiency.score}%
            </p>
            <p className="text-sm text-muted-foreground">Weekly Research Efficiency Score</p>
            <p className="text-xs text-muted-foreground">Based on activity, stalled work, review lag, and venue fit</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-orange-500" />
              AI workflow flags
            </CardTitle>
            <CardDescription>{researchEfficiency.summary}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">Draft papers stuck too long</p>
                <Badge variant={stalledDrafts.length > 0 ? 'destructive' : 'secondary'}>
                  {stalledDrafts.length}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Flagged after 14 days in Draft.</p>
              <div className="mt-3 space-y-2">
                {stalledDrafts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No draft papers are currently overdue.</p>
                ) : (
                  stalledDrafts.slice(0, 4).map((paper) => (
                    <div key={paper.id} className="rounded-md bg-muted/40 p-3">
                      <p className="text-sm font-medium line-clamp-1">{paper.title}</p>
                      <p className="text-xs text-muted-foreground">{paper.daysInStage} days in Draft</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">Under-review papers past turnaround</p>
                <Badge variant={overdueReviews.length > 0 ? 'secondary' : 'outline'}>
                  {overdueReviews.length}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Flagged after 90 days in Under Review.</p>
              <div className="mt-3 space-y-2">
                {overdueReviews.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No review delays detected right now.</p>
                ) : (
                  overdueReviews.slice(0, 4).map((paper) => (
                    <div key={paper.id} className="rounded-md bg-muted/40 p-3">
                      <p className="text-sm font-medium line-clamp-1">{paper.title}</p>
                      <p className="text-xs text-muted-foreground">{paper.daysInStage} days under review</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">Submission effort wasted on low-fit venues</p>
                <Badge variant={lowFitAttempts.length > 0 ? 'destructive' : 'outline'}>
                  {lowFitAttempts.length}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Based on prior fit scores below 40.</p>
              <div className="mt-3 space-y-2">
                {lowFitAttempts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No low-fit submission attempts are flagged.</p>
                ) : (
                  lowFitAttempts.slice(0, 4).map((attempt) => (
                    <div key={attempt.submission.id} className="rounded-md bg-muted/40 p-3">
                      <p className="text-sm font-medium line-clamp-1">
                        {attempt.paper?.title ?? 'Untitled paper'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {attempt.venue?.name ?? 'Unknown venue'} - fit score {attempt.fitScore}/100
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border-0 bg-muted/30">
          <CardContent className="py-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span>Biggest current stage: <span className="font-medium text-foreground">{biggestStage}</span></span>
            <span>Recent paper activity: <span className="font-medium text-foreground">{researchEfficiency.recentPaperActivity}</span></span>
            <span>Recent submissions: <span className="font-medium text-foreground">{researchEfficiency.recentSubmissionActivity}</span></span>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-medium mb-4">Pipeline overview</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STAGES.map((stage) => {
            const stagePapers = papers.filter((paper) => stage.statuses.includes(paper.status));
            const stalePapers = stagePapers.filter((paper) => paper.isStale);
            const Icon = stage.icon;

            return (
              <Card
                key={stage.label}
                className={`border transition-all ${stagePapers.length > 0 ? stage.bgClass : 'opacity-50'} hover-lift`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Icon className="h-4 w-4" style={{ color: stage.color }} />
                      {stage.label}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      {stalePapers.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {stalePapers.length} stale
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {stagePapers.length}
                      </Badge>
                    </div>
                  </div>
                  {STALE_THRESHOLDS[stage.label] && (
                    <p className="text-xs text-muted-foreground">Flag after {STALE_THRESHOLDS[stage.label]} days</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {stagePapers.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No papers in this stage</p>
                  ) : (
                    stagePapers.slice(0, 4).map((paper) => (
                      <Link key={paper.id} to={`/papers/${paper.id}`}>
                        <div
                          className={`p-2 rounded-md text-xs hover:bg-background/70 transition-colors cursor-pointer ${
                            paper.isStale ? 'border border-red-200/50' : ''
                          }`}
                        >
                          <p className="font-medium line-clamp-1">{paper.title}</p>
                          <p className="text-muted-foreground mt-0.5">
                            {paper.daysInStage} days in stage
                            {paper.isStale && <span className="fit-low ml-1">- overdue</span>}
                          </p>
                        </div>
                      </Link>
                    ))
                  )}
                  {stagePapers.length > 4 && (
                    <p className="text-xs text-muted-foreground pl-2">+{stagePapers.length - 4} more</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </motion.div>

      {(stalledDrafts.length > 0 || overdueReviews.length > 0 || lowFitAttempts.length > 0) && (
        <motion.div variants={itemVariants}>
          <Card className="border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 fit-low" />
                Priority follow-up queue
              </CardTitle>
              <CardDescription>
                Jump straight into the papers that need intervention first.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[...stalledDrafts, ...overdueReviews].slice(0, 5).map((paper) => (
                <div key={paper.id} className="flex items-center gap-3 p-3 rounded-lg bg-background/70">
                  <AlertTriangle className="h-4 w-4 fit-low shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{paper.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {paper.status} for {paper.daysInStage} days
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/papers/${paper.id}`}>
                      Open
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
