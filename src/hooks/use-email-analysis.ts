/**
 * useEmailAnalysis Hook
 * Manage email analysis state and operations
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import {
  analyzeEmail,
  type EmailAnalysisResult,
} from '@/lib/email-analysis';
import {
  getEmailAnalysis,
  getUserEmailAnalyses,
  saveEmailAnalysis,
  type StoredEmailAnalysis,
} from '@/lib/email-analysis-db';
import type { EmailStatus, Paper } from '@/types/types';

interface UseEmailAnalysisOptions {
  autoLoad?: boolean;
}

export function useEmailAnalysis(options: UseEmailAnalysisOptions = {}) {
  const { autoLoad = true } = options;
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<StoredEmailAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load analyses on mount
  useEffect(() => {
    if (autoLoad && user) {
      loadAnalyses();
    }
  }, [user, autoLoad]);

  const loadAnalyses = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await getUserEmailAnalyses(user.id, 50, false);
      setAnalyses(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load analyses';
      setError(message);
      console.error('Error loading analyses:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const analyzeEmailContent = useCallback(
    async (email: EmailStatus, papers: Paper[]) => {
      if (!user) {
        setError('User not authenticated');
        return null;
      }

      setAnalyzing(email.id);
      try {
        // Perform analysis
        const analysis = await analyzeEmail(email, papers);

        // Save to database
        const stored = await saveEmailAnalysis(user.id, analysis);

        if (stored) {
          // Update local state
          setAnalyses(prev => [stored, ...prev]);
          setError(null);
        }

        return analysis;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to analyze email';
        setError(message);
        console.error('Error analyzing email:', err);
        return null;
      } finally {
        setAnalyzing(null);
      }
    },
    [user]
  );

  const dismissAnalysis = useCallback(async (analysisId: string) => {
    try {
      const { error: err } = await supabase
        .from('email_analyses')
        .update({ dismissed: true })
        .eq('id', analysisId);

      if (err) throw err;

      setAnalyses(prev => prev.filter(a => a.id !== analysisId));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to dismiss analysis';
      setError(message);
      console.error('Error dismissing analysis:', err);
    }
  }, []);

  const refreshAnalysis = useCallback(async (analysisId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('email_analyses')
        .select('*')
        .eq('id', analysisId)
        .single();

      if (err) throw err;

      setAnalyses(prev =>
        prev.map(a => (a.id === analysisId ? data : a))
      );
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh analysis';
      setError(message);
      console.error('Error refreshing analysis:', err);
    }
  }, []);

  return {
    analyses,
    loading,
    analyzing,
    error,
    loadAnalyses,
    analyzeEmailContent,
    dismissAnalysis,
    refreshAnalysis,
  };
}
