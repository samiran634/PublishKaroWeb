import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  BookOpen,
  Bot,
  Gauge,
  Mail,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FloatingShapes } from '@/components/ui/floating-shapes';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { classifyEmailAlert } from '@/lib/email-monitoring';
import {
  buildOptimalSubmissionPlan,
  computeWeeklyResearchEfficiency,
  daysSince,
  getLowFitSubmissionAttempts,
  type VenueFitScoreRecord,
} from '@/lib/research-intelligence';
import type { EmailStatus, Paper, Submission, ValidationError, Venue } from '@/types/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

const STALLED_DRAFT_DAYS = 14;

export default function Dashboard() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [fitScores, setFitScores] = useState<VenueFitScoreRecord[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [emailStatuses, setEmailStatuses] = useState<EmailStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [papersResult, venuesResult, scoresResult, submissionsResult, errorsResult, emailResult] =
        await Promise.all([
          supabase.from('papers').select('*'),
          supabase.from('venues').select('*'),
          supabase.from('venue_fit_scores').select('*'),
          supabase.from('submissions').select('*'),
          supabase.from('validation_errors').select('*').eq('is_resolved', false),
          supabase.from('email_statuses').select('*').order('received_date', { ascending: false }),
        ]);

      if (papersResult.error) throw papersResult.error;
      if (venuesResult.error) throw venuesResult.error;
      if (scoresResult.error) throw scoresResult.error;
      if (submissionsResult.error) throw submissionsResult.error;
      if (errorsResult.error) throw errorsResult.error;
      if (emailResult.error) throw emailResult.error;

      setPapers(Array.isArray(papersResult.data) ? papersResult.data : []);
      setVenues(Array.isArray(venuesResult.data) ? venuesResult.data : []);
      setFitScores(Array.isArray(scoresResult.data) ? (scoresResult.data as VenueFitScoreRecord[]) : []);
      setSubmissions(Array.isArray(submissionsResult.data) ? submissionsResult.data : []);
      setValidationErrors(Array.isArray(errorsResult.data) ? errorsResult.data : []);
      setEmailStatuses(Array.isArray(emailResult.data) ? emailResult.data : []);
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const readyPapers = useMemo(
    () => papers.filter((paper) => paper.status === 'Ready'),
    [papers]
  );

  const optimalOrder = useMemo(
    () => buildOptimalSubmissionPlan(papers, venues, fitScores, submissions, validationErrors),
    [fitScores, papers, submissions, validationErrors, venues]
  );

  const highConfidenceSlots = useMemo(
    () => optimalOrder.filter((opportunity) => opportunity.compositeScore >= 70).length,
    [optimalOrder]
  );

  const weeklyEfficiency = useMemo(
    () => computeWeeklyResearchEfficiency(papers, submissions, venues, fitScores),
    [fitScores, papers, submissions, venues]
  );

  const stalledDrafts = useMemo(
    () =>
      papers.filter(
        (paper) => paper.status === 'Draft' && daysSince(paper.updated_at) >= STALLED_DRAFT_DAYS
      ),
    [papers]
  );

  const lowFitAttempts = useMemo(
    () => getLowFitSubmissionAttempts(papers, submissions, venues, fitScores),
    [fitScores, papers, submissions, venues]
  );

  const urgentEmailAlerts = useMemo(
    () =>
      emailStatuses.filter((status) => status.is_new && classifyEmailAlert(status).priority === 'urgent'),
    [emailStatuses]
  );

  const actionRequiredEmailAlerts = useMemo(
    () =>
      emailStatuses.filter((status) => status.is_new && classifyEmailAlert(status).actionRequired),
    [emailStatuses]
  );

  const topRecommendation = optimalOrder[0] ?? null;

  if (loading) {
    return (
      <>
        <FloatingShapes />
        <div className="space-y-12">
          <div>
            <Skeleton className="h-10 w-72 mb-3" />
            <Skeleton className="h-6 w-[40rem]" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((index) => (
              <Card key={index} className="border-0 shadow-none">
                <CardHeader className="pb-4">
                  <Skeleton className="h-8 w-8" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-12 w-24" />
                  <Skeleton className="h-4 w-36" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {[1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-64" />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <FloatingShapes />
      <motion.div className="space-y-12" initial="hidden" animate="visible" variants={containerVariants}>
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-4xl font-light tracking-tight">Command Centre</h2>
            <p className="text-muted-foreground text-lg max-w-4xl">
              Researchers should spend more time creating knowledge, not managing paperwork. This
              dashboard keeps the best submission order, workflow bottlenecks, and publication emails
              visible in one place.
            </p>
          </div>

          {topRecommendation && (
            <Card className="border">
              <CardContent className="py-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">Next best slot to apply</p>
                  <p className="text-lg font-medium">
                    {topRecommendation.paper.title}
                    {' -> '}
                    {topRecommendation.venue.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {topRecommendation.compositeScore}/100 composite score based on venue scope, submission
                    history, and paper completeness.
                  </p>
                </div>
                <Button asChild>
                  <Link to="/optimizer">
                    Open submission optimizer
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>

        <motion.div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" variants={containerVariants}>
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-none hover-lift hover-glow">
              <CardHeader className="pb-4">
                <TrendingUp className="h-8 w-8 text-muted-foreground animate-float" />
              </CardHeader>
              <CardContent className="space-y-2">
                <CardTitle className="text-5xl font-light">
                  <AnimatedCounter value={readyPapers.length} />
                </CardTitle>
                <p className="text-sm text-muted-foreground">Ready papers</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-none hover-lift hover-glow">
              <CardHeader className="pb-4">
                <Target className="h-8 w-8 text-amber-500 animate-float" style={{ animationDelay: '0.3s' }} />
              </CardHeader>
              <CardContent className="space-y-2">
                <CardTitle className="text-5xl font-light">
                  <AnimatedCounter value={highConfidenceSlots} />
                </CardTitle>
                <p className="text-sm text-muted-foreground">High-confidence submission slots</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-none hover-lift hover-glow">
              <CardHeader className="pb-4">
                <Gauge className="h-8 w-8 text-muted-foreground animate-float" style={{ animationDelay: '0.6s' }} />
              </CardHeader>
              <CardContent className="space-y-2">
                <CardTitle
                  className={`text-5xl font-light ${
                    weeklyEfficiency.score >= 70
                      ? 'fit-high'
                      : weeklyEfficiency.score >= 45
                        ? 'fit-mid'
                        : 'fit-low'
                  }`}
                >
                  <AnimatedCounter value={weeklyEfficiency.score} />%
                </CardTitle>
                <p className="text-sm text-muted-foreground">Weekly Research Efficiency Score</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-none hover-lift hover-glow">
              <CardHeader className="pb-4">
                <BellRing
                  className={`h-8 w-8 animate-float ${urgentEmailAlerts.length > 0 ? 'fit-low' : 'text-muted-foreground'}`}
                  style={{ animationDelay: '0.9s' }}
                />
              </CardHeader>
              <CardContent className="space-y-2">
                <CardTitle className={`text-5xl font-light ${urgentEmailAlerts.length > 0 ? 'fit-low' : ''}`}>
                  <AnimatedCounter value={urgentEmailAlerts.length} />
                </CardTitle>
                <p className="text-sm text-muted-foreground">Urgent publication alerts</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <motion.div className="grid gap-6 lg:grid-cols-2" variants={containerVariants}>
          <motion.div variants={itemVariants}>
            <Card className="h-full border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  <CardTitle>Best Slot to Apply</CardTitle>
                </div>
                <CardDescription>
                  You have {readyPapers.length} paper{readyPapers.length === 1 ? '' : 's'} ready. Here is the
                  optimal submission order for maximum acceptance probability.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {optimalOrder.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Add ready papers and venues to generate a ranked submission queue.
                  </p>
                ) : (
                  optimalOrder.slice(0, 3).map((opportunity, index) => (
                    <div key={`${opportunity.paper.id}:${opportunity.venue.id}`} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Priority #{index + 1}</p>
                          <p className="font-medium">{opportunity.paper.title}</p>
                          <p className="text-sm text-muted-foreground">{opportunity.venue.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-light">{opportunity.compositeScore}</p>
                          <p className="text-xs text-muted-foreground">score</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <Button asChild variant="outline" className="w-full">
                  <Link to="/optimizer">
                    Open Best Slot to Apply
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="h-full border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-orange-500" />
                  <CardTitle>Research Flow Monitor</CardTitle>
                </div>
                <CardDescription>
                  Spot where research effort is actually going, and where it is being wasted.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <p className="text-2xl font-light fit-low">{stalledDrafts.length}</p>
                    <p className="text-xs text-muted-foreground">Drafts stuck over 2 weeks</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-2xl font-light fit-mid">{weeklyEfficiency.overdueReviewCount}</p>
                    <p className="text-xs text-muted-foreground">Reviews beyond turnaround</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-2xl font-light fit-low">{lowFitAttempts.length}</p>
                    <p className="text-xs text-muted-foreground">Low-fit attempts</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{weeklyEfficiency.summary}</p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/bottleneck">
                    Open Research Flow Monitor
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="h-full border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-sky-500" />
                  <CardTitle>Paper Submitter Helper</CardTitle>
                </div>
                <CardDescription>
                  Email monitoring agent for confirmations, reviewer comments, revisions, and deadlines.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <p className="text-2xl font-light fit-low">{urgentEmailAlerts.length}</p>
                    <p className="text-xs text-muted-foreground">Urgent alerts</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-2xl font-light fit-mid">{actionRequiredEmailAlerts.length}</p>
                    <p className="text-xs text-muted-foreground">Need response</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-2xl font-light">{emailStatuses.length}</p>
                    <p className="text-xs text-muted-foreground">Tracked updates</p>
                  </div>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/email-monitor">
                    Open Paper Submitter Helper
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="h-full border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-violet-500" />
                  <CardTitle>Submission Portal Assistant</CardTitle>
                </div>
                <CardDescription>
                  Keep the researcher inside the app while the assistant prepares the submission flow.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border p-4">
                  <p className="font-medium">Stored draft and portal handoff</p>
                  <p className="text-sm text-muted-foreground">
                    Pick an existing paper or upload a new manuscript, then continue directly to the
                    publication portal inside the desktop app.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button asChild className="flex-1">
                    <Link to="/submission-agent">
                      Open Submission Tracker
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/papers">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Papers
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {papers.length === 0 && (
          <motion.div variants={itemVariants}>
            <Card className="border-0 bg-muted/30 hover-lift">
              <CardContent className="py-16 text-center space-y-6">
                <BookOpen className="h-16 w-16 mx-auto text-muted-foreground" />
                <div className="space-y-3">
                  <h3 className="text-xl font-medium">Get started</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Create your first paper, then let the optimizer, flow monitor, and email helper build
                    the rest of the publication workflow around it.
                  </p>
                </div>
                <div className="flex gap-4 justify-center">
                  <Link to="/papers">
                    <Button variant="outline" size="lg">Create paper</Button>
                  </Link>
                  <Link to="/paper-creation">
                    <Button size="lg">Use AI agent</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
