/**
 * Email Analysis Panel Component
 * Detailed view of email analysis with all insights and actions
 */

import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock,
  Flame,
  Link2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { StoredEmailAnalysis } from '@/lib/email-analysis-db';
import type { Paper } from '@/types/types';

interface EmailAnalysisPanelProps {
  analysis: StoredEmailAnalysis;
  papers: Paper[];
  onAssociatePaper: (paperId: string) => Promise<void>;
  onCreateTask: (action: string, paperId?: string) => Promise<void>;
}

function getCategoryBadgeColor(category: string): string {
  switch (category) {
    case 'revision_request':
      return 'bg-purple-100 text-purple-900 border-purple-300';
    case 'reviewer_feedback':
      return 'bg-blue-100 text-blue-900 border-blue-300';
    case 'decision_notification':
      return 'bg-green-100 text-green-900 border-green-300';
    case 'deadline_notification':
      return 'bg-red-100 text-red-900 border-red-300';
    case 'query_response':
      return 'bg-cyan-100 text-cyan-900 border-cyan-300';
    default:
      return 'bg-slate-100 text-slate-900 border-slate-300';
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return 'text-red-600 bg-red-50';
    case 'high':
      return 'text-orange-600 bg-orange-50';
    case 'medium':
      return 'text-amber-600 bg-amber-50';
    default:
      return 'text-slate-600 bg-slate-50';
  }
}

export function EmailAnalysisPanel({
  analysis,
  papers,
  onAssociatePaper,
  onCreateTask,
}: EmailAnalysisPanelProps) {
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');
  const [associating, setAssociating] = useState(false);
  const [creatingTasks, setCreatingTasks] = useState(false);

  const { analysis: emailAnalysis, paperMatches, nextSteps } = analysis.analysis_json;

  const handleAssociatePaper = async () => {
    if (!selectedPaperId) return;

    setAssociating(true);
    try {
      await onAssociatePaper(selectedPaperId);
      setSelectedPaperId('');
    } finally {
      setAssociating(false);
    }
  };

  const handleCreateAllTasks = async () => {
    setCreatingTasks(true);
    try {
      for (const step of nextSteps) {
        await onCreateTask(step.action, analysis.primary_paper_id || undefined);
      }
    } finally {
      setCreatingTasks(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h2 className="text-2xl font-bold">Email Analysis</h2>
            </div>
            <p className="text-muted-foreground">{emailAnalysis.summary}</p>
          </div>
          <Badge
            variant="outline"
            className={`h-fit ${getCategoryBadgeColor(emailAnalysis.category)}`}
          >
            {emailAnalysis.category.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="papers">Matched Papers</TabsTrigger>
          <TabsTrigger value="actions">Next Steps</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Relevance</p>
                  <p className="text-lg font-bold">{emailAnalysis.relevanceScore}%</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Urgency</p>
                  <p className="text-lg font-bold capitalize">{emailAnalysis.urgency}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Paper Matches</p>
                  <p className="text-lg font-bold">{paperMatches.length}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Actions</p>
                  <p className="text-lg font-bold">{nextSteps.length}</p>
                </div>
              </div>

              {/* Key Points */}
              {emailAnalysis.keyPoints.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Key Points</h4>
                  <ul className="space-y-2">
                    {emailAnalysis.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex gap-2 text-sm">
                        <Check className="h-4 w-4 flex-shrink-0 text-green-600 mt-0.5" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Research Keywords */}
              {emailAnalysis.suggestedPaperKeywords.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Research Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {emailAnalysis.suggestedPaperKeywords.map((keyword, idx) => (
                      <Badge key={idx} variant="secondary">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Papers Tab */}
        <TabsContent value="papers" className="space-y-4">
          {paperMatches.length > 0 ? (
            <div className="space-y-4">
              {paperMatches.map((match, idx) => {
                const matchedPaper = papers.find(p => p.id === match.paperId);
                const isSelected = analysis.primary_paper_id === match.paperId;

                return (
                  <Card key={match.paperId} className={isSelected ? 'border-primary' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <CardTitle className="text-base">{match.paperTitle}</CardTitle>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">
                              {match.matchScore}% match
                            </Badge>
                            {isSelected && (
                              <Badge className="bg-primary">Primary</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Match Reasons */}
                      {match.matchReasons.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Why matched:</p>
                          <ul className="space-y-1">
                            {match.matchReasons.map((reason, ridx) => (
                              <li key={ridx} className="text-sm text-muted-foreground flex gap-2">
                                <ArrowRight className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Paper Info */}
                      {matchedPaper && (
                        <div className="space-y-2 pt-2 border-t">
                          <p className="text-xs font-medium text-muted-foreground">Paper Status</p>
                          <Badge variant="secondary">{matchedPaper.status}</Badge>
                          {matchedPaper.abstract && (
                            <p className="text-xs text-muted-foreground line-clamp-2 italic">
                              {matchedPaper.abstract}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action */}
                      {!isSelected && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => setSelectedPaperId(match.paperId)}
                        >
                          <Link2 className="h-4 w-4 mr-1" />
                          Associate with This Paper
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {/* Associate New Paper */}
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">Associate Different Paper</CardTitle>
                  <CardDescription>
                    Link this email analysis to a different paper
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select value={selectedPaperId} onValueChange={setSelectedPaperId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a paper..." />
                    </SelectTrigger>
                    <SelectContent>
                      {papers.map(paper => (
                        <SelectItem key={paper.id} value={paper.id}>
                          {paper.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAssociatePaper}
                    disabled={!selectedPaperId || associating}
                    className="w-full"
                    loading={associating}
                  >
                    Associate Paper
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <p>No papers matched this email.</p>
                <p className="text-sm mt-1">You can manually associate it above.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          {nextSteps.length > 0 ? (
            <>
              <div className="flex justify-end">
                <Button
                  onClick={handleCreateAllTasks}
                  disabled={creatingTasks}
                  loading={creatingTasks}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Create All Tasks
                </Button>
              </div>

              <div className="space-y-3">
                {nextSteps.map((step, idx) => (
                  <Card key={idx} className={`border-l-4 ${getPriorityColor(step.priority)}`}>
                    <CardHeader className="pb-3">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-base">{step.action}</CardTitle>
                          </div>
                          <Badge
                            variant="outline"
                            className={getPriorityColor(step.priority)}
                          >
                            {step.priority}
                          </Badge>
                        </div>
                        <CardDescription>{step.description}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Metadata */}
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {step.estimatedTimeMinutes && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            ~{step.estimatedTimeMinutes}min
                          </div>
                        )}
                        {step.dueInDays && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <AlertCircle className="h-4 w-4" />
                            Due in {step.dueInDays} days
                          </div>
                        )}
                        {step.priority === 'critical' && (
                          <div className="flex items-center gap-2 text-sm text-red-600">
                            <Flame className="h-4 w-4" />
                            Critical
                          </div>
                        )}
                      </div>

                      {/* Create Task Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          onCreateTask(step.action, analysis.primary_paper_id || undefined)
                        }
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Create Task
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <p>No suggested next steps for this email.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
