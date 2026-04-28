/**
 * Email Analysis Database Service
 * Stores and retrieves email analysis results from Supabase
 */

import { supabase } from '@/db/supabase';
import type { EmailAnalysisResult } from './email-analysis';

export interface StoredEmailAnalysis {
  id: string;
  email_id: string;
  user_id: string;
  analysis_json: EmailAnalysisResult;
  matched_paper_ids: string[];
  primary_paper_id: string | null;
  urgency_level: string;
  action_items_count: number;
  created_at: string;
  updated_at: string;
  dismissed: boolean;
}

/**
 * Save email analysis to database
 */
export async function saveEmailAnalysis(
  userId: string,
  analysis: EmailAnalysisResult
): Promise<StoredEmailAnalysis | null> {
  const topPaperId = analysis.paperMatches[0]?.paperId || null;

  const { data, error } = await supabase
    .from('email_analyses')
    .insert({
      email_id: analysis.emailId,
      user_id: userId,
      analysis_json: analysis,
      matched_paper_ids: analysis.paperMatches.map(m => m.paperId),
      primary_paper_id: topPaperId,
      urgency_level: analysis.analysis.urgency,
      action_items_count: analysis.nextSteps.length,
      dismissed: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving email analysis:', error);
    return null;
  }

  return data;
}

/**
 * Get analysis for specific email
 */
export async function getEmailAnalysis(emailId: string): Promise<StoredEmailAnalysis | null> {
  const { data, error } = await supabase
    .from('email_analyses')
    .select('*')
    .eq('email_id', emailId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('Error fetching email analysis:', error);
  }

  return data || null;
}

/**
 * Get recent analyses for user
 */
export async function getUserEmailAnalyses(
  userId: string,
  limit: number = 20,
  dismissedOnly: boolean = false
): Promise<StoredEmailAnalysis[]> {
  let query = supabase
    .from('email_analyses')
    .select('*')
    .eq('user_id', userId);

  if (dismissedOnly) {
    query = query.eq('dismissed', false);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching user analyses:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * Get analyses for a specific paper
 */
export async function getPaperEmailAnalyses(
  paperId: string
): Promise<StoredEmailAnalysis[]> {
  const { data, error } = await supabase
    .from('email_analyses')
    .select('*')
    .contains('matched_paper_ids', [paperId])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching paper analyses:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * Dismiss an email analysis
 */
export async function dismissEmailAnalysis(analysisId: string): Promise<boolean> {
  const { error } = await supabase
    .from('email_analyses')
    .update({ dismissed: true })
    .eq('id', analysisId);

  if (error) {
    console.error('Error dismissing analysis:', error);
    return false;
  }

  return true;
}

/**
 * Update analysis paper association
 */
export async function updateAnalysisPaperAssociation(
  analysisId: string,
  paperId: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('email_analyses')
    .select('matched_paper_ids')
    .eq('id', analysisId)
    .single();

  if (!existing) return false;

  const paperIds = existing.matched_paper_ids || [];
  if (!paperIds.includes(paperId)) {
    paperIds.unshift(paperId);
  }

  const { error } = await supabase
    .from('email_analyses')
    .update({
      matched_paper_ids: paperIds,
      primary_paper_id: paperId,
    })
    .eq('id', analysisId);

  if (error) {
    console.error('Error updating paper association:', error);
    return false;
  }

  return true;
}

/**
 * Get action items from analysis
 */
export function extractActionItems(analysis: StoredEmailAnalysis) {
  return analysis.analysis_json.nextSteps.map(step => ({
    id: `${analysis.id}-${analysis.analysis_json.nextSteps.indexOf(step)}`,
    analysisId: analysis.id,
    action: step.action,
    priority: step.priority,
    dueInDays: step.dueInDays,
    estimatedTimeMinutes: step.estimatedTimeMinutes,
    description: step.description,
    completed: false,
  }));
}

/**
 * Get statistics for user's email analyses
 */
export async function getEmailAnalysisStats(userId: string) {
  const { data, error } = await supabase
    .from('email_analyses')
    .select('urgency_level, action_items_count, dismissed')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching analysis stats:', error);
    return null;
  }

  const analyses = Array.isArray(data) ? data : [];

  return {
    totalAnalyses: analyses.length,
    activeAnalyses: analyses.filter(a => !a.dismissed).length,
    criticalUrgency: analyses.filter(a => a.urgency_level === 'critical' && !a.dismissed).length,
    highUrgency: analyses.filter(a => a.urgency_level === 'high' && !a.dismissed).length,
    totalActionItems: analyses.reduce((sum, a) => sum + (a.action_items_count || 0), 0),
  };
}
