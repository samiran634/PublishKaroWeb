import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { analyzeSubmission, type AnalysisResult } from '@/lib/geminiInference';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  LogIn, Building2, FileText, Sparkles, CheckCircle2, AlertCircle,
  Loader2, Upload, X, ExternalLink, Monitor, RefreshCw, FileUp,
  ChevronRight, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import type { Venue } from '@/types/types';

type WizardStep = 'auth' | 'venue' | 'form' | 'inference' | 'done' | 'error';

interface EmbedStatus {
  status: 'idle' | 'loading' | 'loaded' | 'error' | 'destroyed';
  url?: string;
  error?: string;
}

const STEPS = [
  { key: 'auth', label: 'Sign In', icon: Lock },
  { key: 'venue', label: 'Venue', icon: Building2 },
  { key: 'form', label: 'Paper Details', icon: FileText },
  { key: 'inference', label: 'AI Analysis', icon: Sparkles },
] as const;

export default function SubmissionAgent() {
  const { user, signInWithEmail, loading: authLoading } = useAuth();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('auth');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [embedStatus, setEmbedStatus] = useState<EmbedStatus>({ status: 'idle' });
  const [, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(0);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const venueCardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

  // Auto-advance to venue step if already logged in
  useEffect(() => {
    if (!authLoading) {
      setStep(user ? 'venue' : 'auth');
    }
  }, [user, authLoading]);

  // Listen for WebContentsView status from Electron main
  useEffect(() => {
    if (!isElectron) return;
    (window as any).electronAPI.onWebContentsStatus((data: EmbedStatus) => {
      setEmbedStatus(data);
      if (data.status === 'loaded') {
        toast.success('Venue portal loaded inside app');
      } else if (data.status === 'error') {
        toast.error(`Portal failed to load: ${data.error}`);
      }
    });
  }, [isElectron]);

  // Load venues when on venue step
  useEffect(() => {
    if (step === 'venue' && user) {
      supabase.from('venues').select('*').order('priority').then(({ data }) => {
        setVenues(Array.isArray(data) ? data : []);
      });
    }
  }, [step, user]);

  const selectedVenue = venues.find(v => v.id === selectedVenueId);

  // Embed the venue portal via WebContentsView (Electron only)
  const handleEmbedVenue = useCallback(() => {
    if (!selectedVenue?.submission_url) {
      toast.error('This venue has no submission URL configured');
      return;
    }
    if (!isElectron) {
      toast.info('WebContentsView only works in the desktop Electron app');
      setEmbedStatus({ status: 'loaded', url: selectedVenue.submission_url });
      return;
    }
    if (!venueCardRef.current) return;

    setEmbedStatus({ status: 'loading' });
    const rect = venueCardRef.current.getBoundingClientRect();
    (window as any).electronAPI.embedWebContents(selectedVenue.submission_url, {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    });
  }, [selectedVenue, isElectron]);

  const handleDestroyEmbed = () => {
    if (isElectron) (window as any).electronAPI.destroyWebContents();
    setEmbedStatus({ status: 'idle' });
  };

  // Handle PDF drop / select
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === 'application/pdf') {
      setPdfFile(file);
    } else {
      toast.error('Please upload a PDF file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type === 'application/pdf') {
      setPdfFile(file);
    } else if (file) {
      toast.error('Please upload a PDF file');
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    const { error } = await signInWithEmail(email, password);
    setLoginLoading(false);
    if (error) {
      setLoginError(error.message);
    } else {
      setStep('venue');
    }
  };

  // Main submit → AI inference → Supabase log
  const handleSubmit = async () => {
    if (!pdfFile) { toast.error('Please upload a PDF file'); return; }
    if (!title.trim()) { toast.error('Please enter a paper title'); return; }
    if (!abstract.trim()) { toast.error('Please enter an abstract'); return; }
    if (!selectedVenue) { toast.error('Please select a venue'); return; }

    setStep('inference');
    setIsProcessing(true);
    setProgress(10);

    try {
      setProgress(30);
      toast.info('Sending paper to Gemini 2.0 Flash for analysis…');

      const result = await analyzeSubmission(pdfFile, title, abstract);
      setAnalysisResult(result);
      setProgress(70);

      toast.success('AI analysis complete — logging submission…');

      // Create automation task in Supabase
      const { data: task, error: taskErr } = await supabase
        .from('automation_tasks')
        .insert([{
          paper_id: null,
          venue_id: selectedVenueId,
          task_type: 'submission',
          status: 'completed',
          priority: 0,
          user_id: user?.id,
          metadata: {
            title,
            abstract,
            pdfFileName: pdfFile.name,
            pdfFileSizeBytes: pdfFile.size,
            aiAnalysis: result,
          },
        }])
        .select()
        .maybeSingle();

      if (taskErr) console.error('Task log error:', taskErr);

      // Log to submission_logs
      if (task?.id) {
        await supabase.from('submission_logs').insert([{
          submission_id: null,
          action_type: 'ai_analysis',
          action_description: `Gemini 2.0 Flash analyzed "${title}" for ${selectedVenue.name}. Confidence: ${result.confidence}%`,
          status: 'success',
          details: { taskId: task.id, keywords: result.keywords },
        }]);
      }

      setProgress(100);
      setStep('done');
      // Destroy the embedded view after submission
      handleDestroyEmbed();
    } catch (err: any) {
      console.error('Submission error:', err);
      setErrorMsg(err.message ?? 'Unknown error');
      setStep('error');
      toast.error('Submission failed — see details below');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setStep(user ? 'venue' : 'auth');
    setSelectedVenueId('');
    setTitle('');
    setAbstract('');
    setPdfFile(null);
    setAnalysisResult(null);
    setErrorMsg('');
    setProgress(0);
    setEmbedStatus({ status: 'idle' });
    handleDestroyEmbed();
  };

  const stepIndex = ['auth', 'venue', 'form', 'inference', 'done', 'error'].indexOf(step);
  const progressStepIndex = Math.min(stepIndex, STEPS.length - 1);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-medium tracking-tight">Submission Agent</h2>
        <p className="text-muted-foreground">
          Login → select a venue portal → upload your paper → AI inference → submit
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === progressStepIndex;
          const isDone = i < progressStepIndex || step === 'done';
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isDone
                  ? 'bg-primary text-primary-foreground'
                  : isActive
                  ? 'bg-primary/20 text-primary border border-primary'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {isDone ? <CheckCircle2 className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: Auth Gate ─────────────────────────────────────────────── */}
      {step === 'auth' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle>Sign In to Continue</CardTitle>
            </div>
            <CardDescription>You need to be signed in to use the submission agent</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4 max-w-sm">
              <div className="space-y-2">
                <Label htmlFor="sa-email">Email</Label>
                <Input
                  id="sa-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sa-password">Password</Label>
                <Input
                  id="sa-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              {loginError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={loginLoading} className="w-full">
                {loginLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                {loginLoading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: Venue Selection + Embedded Portal ─────────────────────── */}
      {step === 'venue' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Select Submission Venue</CardTitle>
              </div>
              <CardDescription>Pick the journal or conference to submit to</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="venue-select">Target Venue</Label>
                <Select value={selectedVenueId} onValueChange={v => { setSelectedVenueId(v); handleDestroyEmbed(); }}>
                  <SelectTrigger id="venue-select">
                    <SelectValue placeholder="Choose a venue…" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} — {v.type} ({v.priority} priority)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedVenue && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-sm">
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground truncate flex-1">{selectedVenue.submission_url ?? 'No URL configured'}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEmbedVenue}
                    disabled={!selectedVenue.submission_url || embedStatus.status === 'loading'}
                  >
                    {embedStatus.status === 'loading' ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Monitor className="mr-1 h-3 w-3" />
                    )}
                    {embedStatus.status === 'loading' ? 'Loading…' : 'Open Portal'}
                  </Button>
                </div>
              )}

              {/* WebContentsView target area — Electron positions the native view over this */}
              {selectedVenue && (
                <div
                  ref={venueCardRef}
                  className={`relative aspect-video rounded-lg border-2 flex items-center justify-center overflow-hidden transition-colors ${
                    embedStatus.status === 'loaded'
                      ? 'border-primary bg-transparent'
                      : embedStatus.status === 'loading'
                      ? 'border-border bg-muted animate-pulse'
                      : 'border-dashed border-border bg-muted/30'
                  }`}
                  style={{ minHeight: 360 }}
                >
                  {embedStatus.status === 'idle' && (
                    <div className="text-center text-muted-foreground space-y-2 p-8">
                      <Monitor className="h-12 w-12 mx-auto opacity-30" />
                      <p className="text-sm">Click "Open Portal" to load the venue submission page here</p>
                      <p className="text-xs opacity-60">Powered by Electron WebContentsView — no popup window</p>
                    </div>
                  )}
                  {embedStatus.status === 'loading' && (
                    <div className="text-center space-y-2">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <p className="text-sm text-muted-foreground">Loading venue portal…</p>
                    </div>
                  )}
                  {embedStatus.status === 'loaded' && (
                    <div className="absolute top-2 right-2 z-10">
                      <Button size="sm" variant="secondary" onClick={handleDestroyEmbed}>
                        <X className="h-3 w-3 mr-1" /> Close
                      </Button>
                    </div>
                  )}
                  {embedStatus.status === 'error' && (
                    <Alert variant="destructive" className="max-w-sm">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Failed to load portal</AlertTitle>
                      <AlertDescription>{embedStatus.error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  disabled={!selectedVenueId}
                  onClick={() => setStep('form')}
                >
                  Continue to Paper Details
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── STEP 3: Paper Details Form ────────────────────────────────────── */}
      {step === 'form' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Paper Details</CardTitle>
            </div>
            <CardDescription>
              Submitting to: <span className="font-medium text-foreground">{selectedVenue?.name}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="paper-title">Paper Title <span className="text-destructive">*</span></Label>
              <Input
                id="paper-title"
                placeholder="Enter the full paper title…"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paper-abstract">Abstract <span className="text-destructive">*</span></Label>
              <Textarea
                id="paper-abstract"
                placeholder="Paste your abstract here…"
                rows={6}
                value={abstract}
                onChange={e => setAbstract(e.target.value)}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{abstract.length} characters</p>
            </div>

            <Separator />

            {/* PDF Upload */}
            <div className="space-y-2">
              <Label>PDF Manuscript <span className="text-destructive">*</span></Label>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {pdfFile ? (
                  <div className="space-y-2">
                    <FileUp className="h-10 w-10 mx-auto text-primary" />
                    <p className="font-medium text-sm">{pdfFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => { e.stopPropagation(); setPdfFile(null); }}
                    >
                      <X className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">Drop your PDF here or click to browse</p>
                    <p className="text-xs text-muted-foreground">PDF files only</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('venue')}>Back</Button>
              <Button
                onClick={handleSubmit}
                disabled={!pdfFile || !title.trim() || !abstract.trim()}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze & Submit with AI
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 4: AI Inference in Progress ─────────────────────────────── */}
      {step === 'inference' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <CardTitle>AI Analysis in Progress</CardTitle>
            </div>
            <CardDescription>Gemini 2.0 Flash is analyzing your paper…</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Progress value={progress} className="h-2" />
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>PDF uploaded: <span className="text-foreground font-medium">{pdfFile?.name}</span></span>
              </div>
              <div className="flex items-center gap-3">
                {progress >= 30
                  ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  : <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
                <span>Sending to Gemini 2.0 Flash multimodal API…</span>
              </div>
              <div className="flex items-center gap-3">
                {progress >= 70
                  ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                <span>Extracting metadata and keywords…</span>
              </div>
              <div className="flex items-center gap-3">
                {progress >= 100
                  ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                <span>Logging submission to database…</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── DONE ─────────────────────────────────────────────────────────── */}
      {step === 'done' && analysisResult && (
        <div className="space-y-6">
          <Alert className="border-primary/30 bg-primary/5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertTitle>Submission Complete!</AlertTitle>
            <AlertDescription>
              AI analysis complete. Submission logged to database.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>AI Analysis Results</CardTitle>
                <Badge variant="secondary">
                  {analysisResult.confidence}% confidence
                </Badge>
              </div>
              <CardDescription>Extracted by Gemini 2.0 Flash</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Extracted Title</p>
                <p className="font-medium">{analysisResult.extractedTitle}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Summary</p>
                <p className="text-muted-foreground leading-relaxed">{analysisResult.summary}</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.keywords.map(kw => (
                    <Badge key={kw} variant="outline">{kw}</Badge>
                  ))}
                </div>
              </div>
              {analysisResult.suggestions.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Suggestions</p>
                    <ul className="space-y-1 text-muted-foreground">
                      {analysisResult.suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Button onClick={reset} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Start New Submission
          </Button>
        </div>
      )}

      {/* ── ERROR ────────────────────────────────────────────────────────── */}
      {step === 'error' && (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Submission Failed</AlertTitle>
            <AlertDescription>{errorMsg || 'An unexpected error occurred.'}</AlertDescription>
          </Alert>
          <Button onClick={reset} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
