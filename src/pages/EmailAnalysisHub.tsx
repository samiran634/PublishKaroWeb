/**
 * Email Analysis Hub Page
 * Displays all analyzed emails with paper matches and next steps
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Sparkles,
  Zap,
  Brain,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { useEmailAnalysis } from '@/hooks/use-email-analysis';
import { EmailAnalysisCard } from '@/components/EmailAnalysisCard';
import type { EmailStatus, Paper } from '@/types/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function EmailAnalysisHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { analyses, loading, analyzing, analyzeEmailContent, dismissAnalysis } =
    useEmailAnalysis({ autoLoad: true });

  const [emails, setEmails] = useState<EmailStatus[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setEmailsLoading(true);
    try {
      const [emailsRes, papersRes] = await Promise.all([
        supabase.from('email_statuses').select('*').eq('user_id', user.id).order('received_date', {
          ascending: false,
        }),
        supabase.from('papers').select('*').eq('user_id', user.id).order('created_at', {
          ascending: false,
        }),
      ]);

      if (emailsRes.error) throw emailsRes.error;
      if (papersRes.error) throw papersRes.error;

      setEmails(Array.isArray(emailsRes.data) ? emailsRes.data : []);
      setPapers(Array.isArray(papersRes.data) ? papersRes.data : []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setEmailsLoading(false);
    }
  };

  const handleAnalyzeEmail = async (emailId: string) => {
    const email = emails.find(e => e.id === emailId);
    if (!email) return;

    // Check if already analyzed
    const existing = analyses.find(a => a.email_id === emailId);
    if (existing) {
      toast.info('This email has already been analyzed');
      return;
    }

    try {
      await analyzeEmailContent(email, papers);
      toast.success('Email analyzed successfully');
    } catch (error) {
      toast.error('Failed to analyze email');
    }
  };

  const handleAssociatePaper = async (analysisId: string, paperId: string) => {
    try {
      const { error } = await supabase
        .from('email_analyses')
        .update({ primary_paper_id: paperId })
        .eq('id', analysisId);

      if (error) throw error;
      toast.success('Paper association updated');
    } catch (error) {
      console.error('Error updating paper association:', error);
      toast.error('Failed to update paper association');
    }
  };

  const handleCreateTask = async (action: string, paperId?: string) => {
    // This would create an automation task or todo item
    toast.success(`Task created: ${action}`);
    // Implement task creation logic here
  };

  // Filter analyses
  const filteredAnalyses =
    selectedCategory === 'all'
      ? analyses
      : analyses.filter(a => a.analysis_json.analysis.category === selectedCategory);

  // Calculate stats
  const stats = {
    totalAnalyzed: analyses.length,
    critical: analyses.filter(a => a.urgency_level === 'critical').length,
    totalActions: analyses.reduce((sum, a) => sum + (a.action_items_count || 0), 0),
  };

  return (
    <motion.div
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <div className="flex items-center gap-2">
          <Brain className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Email Analysis Hub</h1>
        </div>
        <p className="text-muted-foreground">
          AI-powered analysis of your research emails with automatic paper matching and actionable
          next steps.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Emails Analyzed</p>
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-3xl font-bold">{stats.totalAnalyzed}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Critical Actions</p>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
              <p className="text-3xl font-bold">{stats.critical}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Action Items</p>
                <Zap className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-3xl font-bold">{stats.totalActions}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Unanalyzed Emails Alert */}
      {emailsLoading ? (
        <Skeleton className="h-24" />
      ) : emails.length > analyses.length ? (
        <motion.div variants={itemVariants}>
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-base">Unanalyzed Emails</CardTitle>
                </div>
                <Badge variant="outline">{emails.length - analyses.length} pending</Badge>
              </div>
              <CardDescription>
                New emails are waiting for AI analysis. Analyze them to get paper matches and next
                steps.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => toast.info('Batch analysis coming soon')} size="sm">
                <Sparkles className="h-4 w-4 mr-1" />
                Analyze All
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      {/* Main Content */}
      {analyses.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed">
            <CardContent className="pt-16 pb-16 flex flex-col items-center justify-center text-center">
              <Brain className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Analyzed Emails Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start by analyzing your research emails to get paper matches and actionable next
                steps.
              </p>
              <Button onClick={loadData}>
                <TrendingUp className="h-4 w-4 mr-1" />
                Load Emails to Analyze
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants}>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all" onClick={() => setSelectedCategory('all')}>
                All ({analyses.length})
              </TabsTrigger>
              <TabsTrigger
                value="revision_request"
                onClick={() => setSelectedCategory('revision_request')}
              >
                Revisions
              </TabsTrigger>
              <TabsTrigger
                value="reviewer_feedback"
                onClick={() => setSelectedCategory('reviewer_feedback')}
              >
                Feedback
              </TabsTrigger>
              <TabsTrigger
                value="decision_notification"
                onClick={() => setSelectedCategory('decision_notification')}
              >
                Decisions
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedCategory} className="space-y-4 mt-6">
              <motion.div
                className="space-y-4"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
              >
                {filteredAnalyses.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      <p>No analyses in this category.</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredAnalyses.map(analysis => {
                    const email = emails.find(e => e.id === analysis.email_id);
                    return (
                      email && (
                        <motion.div key={analysis.id} variants={itemVariants}>
                          <EmailAnalysisCard
                            emailStatus={email}
                            analysis={analysis}
                            papers={papers}
                            onDismiss={() => dismissAnalysis(analysis.id)}
                            onAssociatePaper={(paperId) =>
                              handleAssociatePaper(analysis.id, paperId)
                            }
                          />
                        </motion.div>
                      )
                    );
                  })
                )}
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      )}
    </motion.div>
  );
}
