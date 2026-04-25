import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Send, AlertCircle, CheckCircle2, Loader2, ExternalLink, Pause, Play, Hand, X, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import type { Paper, Venue, SubmissionLog, AutomationTask } from '@/types/types';

type SubmissionStep = 'idle' | 'queued' | 'in_progress' | 'completed' | 'error';

export default function SubmissionAgent() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [submissionStep, setSubmissionStep] = useState<SubmissionStep>('idle');
  const [submissionUrl, setSubmissionUrl] = useState<string>('');
  const [currentTask, setCurrentTask] = useState<AutomationTask | null>(null);
  const [activityLogs, setActivityLogs] = useState<SubmissionLog[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    loadData();
    
    // Subscribe to real-time log updates
    const channel = supabase
      .channel('submission_logs_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'submission_logs',
        },
        (payload) => {
          setActivityLogs(prev => [payload.new as SubmissionLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      const [papersResult, venuesResult] = await Promise.all([
        supabase.from('papers').select('*').in('status', ['Ready', 'Draft']).order('updated_at', { ascending: false }),
        supabase.from('venues').select('*').order('priority', { ascending: true }),
      ]);

      setPapers(Array.isArray(papersResult.data) ? papersResult.data : []);
      setVenues(Array.isArray(venuesResult.data) ? venuesResult.data : []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const checkCredentials = async (venueId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('credentials')
      .select('*')
      .eq('venue_id', venueId)
      .maybeSingle();

    return !!data;
  };

  const validatePaper = async (paperId: string, venueType: string) => {
    setValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-paper', {
        body: {
          paperId,
          venueType,
        },
      });

      if (error) throw error;

      setValidationResults(data);
      return data;
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Failed to validate paper');
      return null;
    } finally {
      setValidating(false);
    }
  };

  const startSubmission = async () => {
    if (!selectedPaperId || !selectedVenueId) {
      toast.error('Please select both a paper and a venue');
      return;
    }

    const paper = papers.find(p => p.id === selectedPaperId);
    const venue = venues.find(v => v.id === selectedVenueId);

    if (!paper || !venue) {
      toast.error('Invalid selection');
      return;
    }

    // Run validation first
    toast.info('Validating paper before submission...');
    const validation = await validatePaper(selectedPaperId, venue.type);

    if (!validation || !validation.success) {
      toast.error('Validation failed. Please check the results.');
      return;
    }

    if (!validation.overallPassed) {
      toast.error('Paper has validation errors. Please fix them before submitting.');
      return;
    }

    if (validation.hasWarnings) {
      toast.warning('Paper has warnings. Review them before proceeding.');
    }

    // Check for credentials
    const hasCredentials = await checkCredentials(selectedVenueId);
    if (!hasCredentials) {
      toast.error('No credentials found for this venue. Please add credentials in the Credential Vault.');
      return;
    }

    if (!venue.submission_url) {
      toast.error('Venue does not have a submission URL configured');
      return;
    }

    setSubmissionUrl(venue.submission_url);
    setActivityLogs([]);
    setSubmissionStep('queued');

    try {
      // Create automation task
      const { data: task, error: taskError } = await supabase
        .from('automation_tasks')
        .insert([{
          paper_id: selectedPaperId,
          venue_id: selectedVenueId,
          task_type: 'submission',
          status: 'queued',
          priority: 0,
        }])
        .select()
        .maybeSingle();

      if (taskError || !task) {
        throw new Error('Failed to create automation task');
      }

      setCurrentTask(task);
      setSubmissionStep('in_progress');

      // Call Edge Function to execute submission
      const { data, error } = await supabase.functions.invoke('submit-paper', {
        body: {
          taskId: task.id,
          paperId: selectedPaperId,
          venueId: selectedVenueId,
        },
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setSubmissionStep('completed');
        toast.success('Submission completed successfully!');
      } else {
        throw new Error(data.error || 'Submission failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSubmissionStep('error');
      toast.error('Submission failed. Please check the activity log for details.');
    }
  };

  const pauseSubmission = () => {
    setIsPaused(true);
    toast.info('Submission paused. Click Resume to continue.');
  };

  const resumeSubmission = () => {
    setIsPaused(false);
    toast.success('Submission resumed');
  };

  const cancelSubmission = async () => {
    if (currentTask) {
      await supabase
        .from('automation_tasks')
        .update({ status: 'cancelled' })
        .eq('id', currentTask.id);
    }
    resetSubmission();
    toast.info('Submission cancelled');
  };

  const resetSubmission = () => {
    setSubmissionStep('idle');
    setSelectedPaperId('');
    setSelectedVenueId('');
    setSubmissionUrl('');
    setCurrentTask(null);
    setActivityLogs([]);
    setIsPaused(false);
    loadData();
  };

  const getStepDescription = () => {
    switch (submissionStep) {
      case 'idle':
        return 'Select a paper and venue to begin automated submission';
      case 'queued':
        return 'Submission queued - preparing automation...';
      case 'in_progress':
        return 'Automated submission in progress - watch the activity panel below';
      case 'completed':
        return 'Submission completed successfully!';
      case 'error':
        return 'An error occurred during submission';
      default:
        return '';
    }
  };

  const getLogStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case 'failure':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-medium tracking-tight">WISIWID Submission Agent</h2>
        <p className="text-muted-foreground">
          Automated paper submission with real-time transparency and human-in-the-loop control
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Submission Configuration</CardTitle>
              <CardDescription>Select a paper and target venue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="paper-select">Paper</Label>
                <Select
                  value={selectedPaperId}
                  onValueChange={setSelectedPaperId}
                  disabled={submissionStep !== 'idle'}
                >
                  <SelectTrigger id="paper-select">
                    <SelectValue placeholder="Select a paper" />
                  </SelectTrigger>
                  <SelectContent>
                    {papers.map((paper) => (
                      <SelectItem key={paper.id} value={paper.id}>
                        {paper.title} ({paper.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue-select">Target Venue</Label>
                <Select
                  value={selectedVenueId}
                  onValueChange={setSelectedVenueId}
                  disabled={submissionStep !== 'idle'}
                >
                  <SelectTrigger id="venue-select">
                    <SelectValue placeholder="Select a venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        {venue.name} ({venue.type}) - {venue.priority} Priority
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex gap-3">
                {submissionStep === 'idle' && (
                  <Button onClick={startSubmission} disabled={!selectedPaperId || !selectedVenueId}>
                    <Send className="mr-2 h-4 w-4" />
                    Start Automated Submission
                  </Button>
                )}
                {submissionStep === 'completed' && (
                  <Button onClick={resetSubmission}>
                    Start New Submission
                  </Button>
                )}
                {(submissionStep === 'in_progress' || submissionStep === 'queued') && (
                  <>
                    {!isPaused ? (
                      <Button variant="outline" onClick={pauseSubmission}>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={resumeSubmission}>
                        <Play className="mr-2 h-4 w-4" />
                        Resume
                      </Button>
                    )}
                    <Button variant="outline" onClick={cancelSubmission}>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {submissionStep !== 'idle' && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium">Browser Window</CardTitle>
                    <Monitor className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardDescription>Real-time view of automated actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-border">
                    {submissionUrl ? (
                      <div className="text-center space-y-4 p-8">
                        <Monitor className="h-16 w-16 mx-auto text-muted-foreground" />
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Simulated Browser View</p>
                          <p className="text-xs text-muted-foreground">
                            In production, this would show a live browser window
                          </p>
                          <a
                            href={submissionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center justify-center gap-1"
                          >
                            {submissionUrl}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No active browser session</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Activity Panel</CardTitle>
                  <CardDescription>Real-time log of automated actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {activityLogs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Waiting for activity...
                      </p>
                    ) : (
                      activityLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                          {getLogStatusIcon(log.status)}
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">{log.action_description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {log.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {submissionStep === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : submissionStep === 'error' ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : submissionStep !== 'idle' ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : null}
                  <p className="text-sm">{getStepDescription()}</p>
                </div>
                {isPaused && (
                  <Alert>
                    <Hand className="h-4 w-4" />
                    <AlertTitle>Paused</AlertTitle>
                    <AlertDescription>
                      Automation is paused. Click Resume to continue.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5">1</Badge>
                  <p>Agent discovers and navigates to submission portal</p>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5">2</Badge>
                  <p>Retrieves stored credentials and logs in automatically</p>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5">3</Badge>
                  <p>Extracts paper metadata and auto-fills form fields</p>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5">4</Badge>
                  <p>Uploads manuscript and supplementary files</p>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5">5</Badge>
                  <p>Pauses for CAPTCHA or security challenges</p>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5">6</Badge>
                  <p>Completes submission and captures confirmation</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Control Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>• <strong>Pause:</strong> Temporarily halt automation at current step</p>
              <p>• <strong>Resume:</strong> Continue automation from paused state</p>
              <p>• <strong>Manual Override:</strong> Take control and complete step manually</p>
              <p>• <strong>Cancel:</strong> Abort submission process entirely</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
