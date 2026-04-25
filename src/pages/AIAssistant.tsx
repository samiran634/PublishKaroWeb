import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, FileText, MessageSquare, Loader2, Download, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { Paper, Venue, Submission } from '@/types/types';

export default function AIAssistant() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Cover Letter state
  const [selectedPaper, setSelectedPaper] = useState('');
  const [selectedVenue, setSelectedVenue] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState('');

  // Reviewer Response state
  const [selectedSubmission, setSelectedSubmission] = useState('');
  const [reviewerComments, setReviewerComments] = useState('');
  const [generatedResponse, setGeneratedResponse] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [papersRes, venuesRes, submissionsRes] = await Promise.all([
        supabase.from('papers').select('*').order('created_at', { ascending: false }),
        supabase.from('venues').select('*').order('name'),
        supabase.from('submissions').select('*').order('submitted_at', { ascending: false }),
      ]);

      if (papersRes.error) throw papersRes.error;
      if (venuesRes.error) throw venuesRes.error;
      if (submissionsRes.error) throw submissionsRes.error;

      setPapers(Array.isArray(papersRes.data) ? papersRes.data : []);
      setVenues(Array.isArray(venuesRes.data) ? venuesRes.data : []);
      setSubmissions(Array.isArray(submissionsRes.data) ? submissionsRes.data : []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!selectedPaper || !selectedVenue) {
      toast.error('Please select a paper and venue');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-cover-letter', {
        body: {
          paperId: selectedPaper,
          venueId: selectedVenue,
          additionalContext,
        },
      });

      if (error) throw error;

      if (data.success && data.coverLetter) {
        setGeneratedCoverLetter(data.coverLetter);
        toast.success('Cover letter generated successfully');
      } else {
        toast.error(data.error || 'Failed to generate cover letter');
      }
    } catch (error) {
      console.error('Error generating cover letter:', error);
      toast.error('Failed to generate cover letter');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateReviewerResponse = async () => {
    if (!selectedSubmission || !reviewerComments.trim()) {
      toast.error('Please select a submission and enter reviewer comments');
      return;
    }

    const submission = submissions.find(s => s.id === selectedSubmission);
    if (!submission) {
      toast.error('Submission not found');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-reviewer-response', {
        body: {
          paperId: submission.paper_id,
          submissionId: selectedSubmission,
          reviewerComments,
        },
      });

      if (error) throw error;

      if (data.success && data.response) {
        setGeneratedResponse(data.response);
        toast.success('Reviewer response generated successfully');
      } else {
        toast.error(data.error || 'Failed to generate response');
      }
    } catch (error) {
      console.error('Error generating reviewer response:', error);
      toast.error('Failed to generate reviewer response');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded successfully');
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="space-y-2">
        <h2 className="text-3xl font-medium tracking-tight">AI Assistant</h2>
        <p className="text-muted-foreground">
          Generate cover letters and reviewer responses using AI
        </p>
      </div>

      <Tabs defaultValue="cover-letter" className="space-y-6">
        <TabsList>
          <TabsTrigger value="cover-letter">
            <FileText className="mr-2 h-4 w-4" />
            Cover Letter
          </TabsTrigger>
          <TabsTrigger value="reviewer-response">
            <MessageSquare className="mr-2 h-4 w-4" />
            Reviewer Response
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cover-letter" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Cover Letter</CardTitle>
              <CardDescription>
                Create a tailored cover letter for your paper submission
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="paper">Select Paper *</Label>
                <Select value={selectedPaper} onValueChange={setSelectedPaper}>
                  <SelectTrigger id="paper">
                    <SelectValue placeholder="Choose a paper" />
                  </SelectTrigger>
                  <SelectContent>
                    {papers.map((paper) => (
                      <SelectItem key={paper.id} value={paper.id}>
                        {paper.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Select Venue *</Label>
                <Select value={selectedVenue} onValueChange={setSelectedVenue}>
                  <SelectTrigger id="venue">
                    <SelectValue placeholder="Choose a venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        {venue.name} ({venue.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="context">Additional Context (Optional)</Label>
                <Textarea
                  id="context"
                  placeholder="Add any specific points you want to highlight..."
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  rows={4}
                />
              </div>

              <Button
                onClick={handleGenerateCoverLetter}
                disabled={generating || !selectedPaper || !selectedVenue}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Cover Letter
                  </>
                )}
              </Button>

              {generatedCoverLetter && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Generated Cover Letter</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(generatedCoverLetter)}
                      >
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(generatedCoverLetter, 'cover-letter.txt')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={generatedCoverLetter}
                    onChange={(e) => setGeneratedCoverLetter(e.target.value)}
                    rows={15}
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviewer-response" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Reviewer Response</CardTitle>
              <CardDescription>
                Create a point-by-point response to reviewer comments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="submission">Select Submission *</Label>
                <Select value={selectedSubmission} onValueChange={setSelectedSubmission}>
                  <SelectTrigger id="submission">
                    <SelectValue placeholder="Choose a submission" />
                  </SelectTrigger>
                  <SelectContent>
                    {submissions.map((submission) => {
                      const paper = papers.find(p => p.id === submission.paper_id);
                      return (
                        <SelectItem key={submission.id} value={submission.id}>
                          {paper?.title || 'Unknown Paper'} - {submission.status}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">Reviewer Comments *</Label>
                <Textarea
                  id="comments"
                  placeholder="Paste the reviewer comments here..."
                  value={reviewerComments}
                  onChange={(e) => setReviewerComments(e.target.value)}
                  rows={8}
                />
              </div>

              <Button
                onClick={handleGenerateReviewerResponse}
                disabled={generating || !selectedSubmission || !reviewerComments.trim()}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Response
                  </>
                )}
              </Button>

              {generatedResponse && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Generated Response</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(generatedResponse)}
                      >
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(generatedResponse, 'reviewer-response.txt')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={generatedResponse}
                    onChange={(e) => setGeneratedResponse(e.target.value)}
                    rows={20}
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
