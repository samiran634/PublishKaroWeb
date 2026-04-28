/**
 * Email Analysis Card Component
 * Displays email analysis summary with paper matches and next steps
 */

import {
  AlertCircle,
  Check2,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  Link2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { StoredEmailAnalysis } from '@/lib/email-analysis-db';
import type { EmailStatus, Paper } from '@/types/types';

interface EmailAnalysisCardProps {
  emailStatus: EmailStatus;
  analysis: StoredEmailAnalysis;
  papers: Paper[];
  onDismiss: () => void;
  onAssociatePaper: (paperId: string) => void;
}

function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'critical':
      return 'bg-red-100 text-red-900 border-red-300';
    case 'high':
      return 'bg-orange-100 text-orange-900 border-orange-300';
    case 'medium':
      return 'bg-amber-100 text-amber-900 border-amber-300';
    default:
      return 'bg-slate-100 text-slate-900 border-slate-300';
  }
}

function getUrgencyIcon(urgency: string) {
  switch (urgency) {
    case 'critical':
      return <Flame className="h-4 w-4 text-red-600" />;
    case 'high':
      return <AlertCircle className="h-4 w-4 text-orange-600" />;
    default:
      return <Clock className="h-4 w-4 text-amber-600" />;
  }
}

export function EmailAnalysisCard({
  emailStatus,
  analysis,
  papers,
  onDismiss,
  onAssociatePaper,
}: EmailAnalysisCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { analysis: emailAnalysis, paperMatches, nextSteps } = analysis.analysis_json;

  const getMatchedPaper = (paperId: string) => papers.find(p => p.id === paperId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className={`border-l-4 ${getUrgencyColor(emailAnalysis.urgency)}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <CardTitle className="text-base">{emailAnalysis.summary.substring(0, 100)}...</CardTitle>
              </div>
              <CardDescription className="line-clamp-2">{emailStatus.subject}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`border ${getUrgencyColor(emailAnalysis.urgency)}`}
              >
                <div className="flex items-center gap-1">
                  {getUrgencyIcon(emailAnalysis.urgency)}
                  {emailAnalysis.urgency}
                </div>
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setExpanded(!expanded)}
                className="h-8 w-8"
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Separator />
              <CardContent className="space-y-4 pt-4">
                {/* Summary */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Summary</h4>
                  <p className="text-sm text-muted-foreground">{emailAnalysis.summary}</p>
                </div>

                {/* Key Points */}
                {emailAnalysis.keyPoints.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Key Points</h4>
                    <ul className="space-y-1">
                      {emailAnalysis.keyPoints.map((point, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                          <Check2 className="h-4 w-4 flex-shrink-0 text-green-600 mt-0.5" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Paper Matches */}
                {paperMatches.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      Matched Papers ({paperMatches.length})
                    </h4>
                    <div className="space-y-2">
                      {paperMatches.map(match => (
                        <div key={match.paperId} className="rounded-lg border p-2 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{match.paperTitle}</p>
                              <p className="text-xs text-muted-foreground">
                                Match score: {match.matchScore}%
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onAssociatePaper(match.paperId)}
                              className="h-7 px-2 text-xs"
                            >
                              Link
                            </Button>
                          </div>
                          {match.matchReasons.length > 0 && (
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              {match.matchReasons.slice(0, 2).map((reason, idx) => (
                                <p key={idx}>• {reason}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                {nextSteps.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Next Steps ({nextSteps.length})</h4>
                    <div className="space-y-2">
                      {nextSteps.slice(0, 3).map((step, idx) => (
                        <div key={idx} className="rounded-lg bg-slate-50 p-3 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">{step.action}</p>
                            <Badge variant="outline" className="h-6 px-2 text-xs">
                              {step.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{step.description}</p>
                          {step.estimatedTimeMinutes && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              ~{step.estimatedTimeMinutes}min
                              {step.dueInDays && ` • Due in ${step.dueInDays} days`}
                            </div>
                          )}
                        </div>
                      ))}
                      {nextSteps.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{nextSteps.length - 3} more actions
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={onDismiss}>
                    <X className="h-4 w-4 mr-1" />
                    Dismiss
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
