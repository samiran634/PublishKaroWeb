import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle2, FileSearch, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { PlagiarismCheck, MatchedSource } from '@/types/types';

interface PlagiarismCheckerProps {
    paperId: string;
    abstractText: string;
    onCheckComplete?: (check: PlagiarismCheck) => void;
}

export default function PlagiarismChecker({ paperId, abstractText, onCheckComplete }: PlagiarismCheckerProps) {
    const [checking, setChecking] = useState(false);
    const [latestCheck, setLatestCheck] = useState<PlagiarismCheck | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLatestCheck();
    }, [paperId]);

    const loadLatestCheck = async () => {
        try {
            const { data, error } = await supabase
                .from('plagiarism_checks')
                .select('*')
                .eq('paper_id', paperId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            if (data) setLatestCheck(data as PlagiarismCheck);
        } catch (error) {
            console.error('Error loading plagiarism check:', error);
        } finally {
            setLoading(false);
        }
    };

    const runPlagiarismCheck = async () => {
        if (!abstractText || abstractText.trim().length < 50) {
            toast.error('Abstract must be at least 50 characters long to check for plagiarism');
            return;
        }

        setChecking(true);
        try {
            const { data, error } = await supabase.functions.invoke('check-plagiarism', {
                body: {
                    paperId,
                    abstractText: abstractText.trim(),
                },
            });

            if (error) {
                const errorMsg = await error?.context?.text();
                throw new Error(errorMsg || error?.message || 'Failed to check plagiarism');
            }

            if (!data.success) {
                throw new Error(data.error || 'Plagiarism check failed');
            }

            toast.success('Plagiarism check completed');
            await loadLatestCheck();

            if (onCheckComplete && latestCheck) {
                onCheckComplete(latestCheck);
            }
        } catch (error) {
            console.error('Error checking plagiarism:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to check plagiarism');
        } finally {
            setChecking(false);
        }
    };

    const getSeverityColor = (percentage: number | null) => {
        if (!percentage) return 'text-muted-foreground';
        if (percentage < 15) return 'text-green-600';
        if (percentage < 25) return 'text-yellow-600';
        return 'text-destructive';
    };

    const getSeverityBadge = (percentage: number | null) => {
        if (!percentage) return null;
        if (percentage < 15) return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Excellent</Badge>;
        if (percentage < 25) return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Acceptable</Badge>;
        return <Badge variant="destructive">High Similarity</Badge>;
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <FileSearch className="h-5 w-5" />
                            Plagiarism Check
                        </CardTitle>
                        <CardDescription>
                            Automatic originality verification for your abstract
                        </CardDescription>
                    </div>
                    <Button
                        onClick={runPlagiarismCheck}
                        disabled={checking || !abstractText || abstractText.trim().length < 50}
                        size="sm"
                    >
                        {checking ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Checking...
                            </>
                        ) : (
                            <>
                                <FileSearch className="mr-2 h-4 w-4" />
                                {latestCheck ? 'Re-check' : 'Check Now'}
                            </>
                        )}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {checking && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Analyzing abstract...</span>
                            <span className="text-muted-foreground">This may take a moment</span>
                        </div>
                        <Progress value={undefined} className="h-2" />
                    </div>
                )}

                {!checking && !latestCheck && (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>No plagiarism check performed yet</AlertTitle>
                        <AlertDescription>
                            Click "Check Now" to verify the originality of your abstract. This check is required before submission.
                        </AlertDescription>
                    </Alert>
                )}

                {!checking && latestCheck && latestCheck.status === 'completed' && (
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">Similarity Score</div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-3xl font-medium ${getSeverityColor(latestCheck.similarity_percentage)}`}>
                                        {latestCheck.similarity_percentage?.toFixed(1)}%
                                    </span>
                                    {getSeverityBadge(latestCheck.similarity_percentage)}
                                </div>
                                <Progress
                                    value={latestCheck.similarity_percentage || 0}
                                    className="h-2"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">Originality Score</div>
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl font-medium text-green-600">
                                        {latestCheck.originality_score?.toFixed(1)}%
                                    </span>
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                </div>
                                <Progress
                                    value={latestCheck.originality_score || 0}
                                    className="h-2"
                                />
                            </div>
                        </div>

                        {latestCheck.similarity_percentage && latestCheck.similarity_percentage > 25 && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>High Similarity Detected</AlertTitle>
                                <AlertDescription>
                                    The similarity score ({latestCheck.similarity_percentage.toFixed(1)}%) exceeds the acceptable threshold (25%).
                                    Please review the matched sources below and revise your abstract to reduce similarity.
                                </AlertDescription>
                            </Alert>
                        )}

                        {latestCheck.matched_sources && latestCheck.matched_sources.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-sm font-medium">Matched Sources ({latestCheck.matched_sources.length})</div>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {latestCheck.matched_sources.map((source: MatchedSource, index: number) => (
                                        <Card key={index} className="p-3">
                                            <div className="space-y-2">
                                                <div className="flex items-start justify-between">
                                                    <div className="space-y-1">
                                                        <div className="text-sm font-medium">{source.source_title}</div>
                                                        <div className="text-xs text-muted-foreground">{source.source_url}</div>
                                                    </div>
                                                    <Badge variant="outline">
                                                        {source.similarity_percentage?.toFixed(1)}%
                                                    </Badge>
                                                </div>
                                                {source.matched_text && (
                                                    <div className="text-xs bg-muted p-2 rounded">
                                                        "{source.matched_text}"
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                            Last checked: {new Date(latestCheck.checked_at).toLocaleString()}
                        </div>
                    </div>
                )}

                {!checking && latestCheck && latestCheck.status === 'failed' && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Plagiarism check failed</AlertTitle>
                        <AlertDescription>
                            {latestCheck.error_message || 'An error occurred while checking for plagiarism. Please try again.'}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
