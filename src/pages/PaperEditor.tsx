import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Save, History, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import PlagiarismChecker from '@/components/PlagiarismChecker';
import type { Paper, PaperStatus, PaperVersion, PlagiarismCheck } from '@/types/types';

import { useAuth } from '@/contexts/AuthContext';

export default function PaperEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = id === 'new';

  const [paper, setPaper] = useState<Partial<Paper>>({
    title: '',
    abstract: '',
    content: '',
    keywords: [],
    authors: [],
    status: 'Draft',
  });
  const [versions, setVersions] = useState<PaperVersion[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [authorInput, setAuthorInput] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [latestPlagiarismCheck, setLatestPlagiarismCheck] = useState<PlagiarismCheck | null>(null);
  const [abstractModified, setAbstractModified] = useState(false);
  const plagiarismCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isNew && id) {
      loadPaper(id);
      loadVersions(id);
    }
  }, [id, isNew]);

  const loadPaper = async (paperId: string) => {
    try {
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .eq('id', paperId)
        .maybeSingle();

      if (error) throw error;
      if (data) setPaper(data);
    } catch (error) {
      console.error('Error loading paper:', error);
      toast.error('Failed to load paper');
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async (paperId: string) => {
    try {
      const { data, error } = await supabase
        .from('paper_versions')
        .select('*')
        .eq('paper_id', paperId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setVersions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading versions:', error);
    }
  };

  const savePaper = async () => {
    if (!paper.title?.trim()) {
      toast.error('Please enter a paper title');
      return;
    }

    // Check plagiarism threshold before saving
    if (latestPlagiarismCheck && 
        latestPlagiarismCheck.status === 'completed' && 
        latestPlagiarismCheck.similarity_percentage && 
        latestPlagiarismCheck.similarity_percentage > 25) {
      toast.error('Cannot save: Plagiarism similarity exceeds 25%. Please revise your abstract.');
      return;
    }

    // Warn if abstract modified but not checked
    if (abstractModified && paper.abstract && paper.abstract.trim().length >= 50) {
      toast.warning('Abstract has been modified. Consider running a plagiarism check before saving.');
    }

    setSaving(true);
    try {
      if (isNew) {
        const { data, error } = await supabase
          .from('papers')
          .insert([{
            title: paper.title,
            abstract: paper.abstract || null,
            content: paper.content || null,
            keywords: paper.keywords || [],
            authors: paper.authors || [],
            status: paper.status || 'Draft',
            user_id: user?.id,
          }])
          .select()
          .maybeSingle();

        if (error) throw error;
        if (data) {
          await createVersion(data.id, data.content || '', 1);
          toast.success('Paper created successfully');
          navigate(`/papers/${data.id}`);
        }
      } else {
        const { error } = await supabase
          .from('papers')
          .update({
            title: paper.title,
            abstract: paper.abstract || null,
            content: paper.content || null,
            keywords: paper.keywords || [],
            authors: paper.authors || [],
            status: paper.status,
          })
          .eq('id', id);

        if (error) throw error;

        const nextVersion = versions.length > 0 ? versions[0].version_number + 1 : 1;
        await createVersion(id!, paper.content || '', nextVersion);

        toast.success('Paper saved successfully');
        if (id) loadVersions(id);
      }
    } catch (error) {
      console.error('Error saving paper:', error);
      toast.error('Failed to save paper');
    } finally {
      setSaving(false);
    }
  };

  const createVersion = async (paperId: string, content: string, versionNumber: number) => {
    try {
      const { error } = await supabase
        .from('paper_versions')
        .insert([{
          paper_id: paperId,
          content,
          version_number: versionNumber,
          notes: null,
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating version:', error);
    }
  };

  const deletePaper = async () => {
    if (!id || isNew) return;

    try {
      const { error } = await supabase
        .from('papers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Paper deleted successfully');
      navigate('/papers');
    } catch (error) {
      console.error('Error deleting paper:', error);
      toast.error('Failed to delete paper');
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !paper.keywords?.includes(keywordInput.trim())) {
      setPaper({
        ...paper,
        keywords: [...(paper.keywords || []), keywordInput.trim()],
      });
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setPaper({
      ...paper,
      keywords: paper.keywords?.filter(k => k !== keyword) || [],
    });
  };

  const addAuthor = () => {
    if (authorInput.trim() && !paper.authors?.includes(authorInput.trim())) {
      setPaper({
        ...paper,
        authors: [...(paper.authors || []), authorInput.trim()],
      });
      setAuthorInput('');
    }
  };

  const removeAuthor = (author: string) => {
    setPaper({
      ...paper,
      authors: paper.authors?.filter(a => a !== author) || [],
    });
  };

  const restoreVersion = async (version: PaperVersion) => {
    setPaper({
      ...paper,
      content: version.content,
    });
    toast.success('Version restored');
  };

  const handleAbstractChange = useCallback((newAbstract: string) => {
    setPaper(prev => ({ ...prev, abstract: newAbstract }));
    setAbstractModified(true);

    // Clear existing timeout
    if (plagiarismCheckTimeoutRef.current) {
      clearTimeout(plagiarismCheckTimeoutRef.current);
    }

    // Don't auto-trigger if abstract is too short
    if (newAbstract.trim().length < 50) {
      return;
    }

    // Debounce: trigger check 2 seconds after user stops typing
    plagiarismCheckTimeoutRef.current = setTimeout(() => {
      // The PlagiarismChecker component will handle the actual check
      // We just need to mark that the abstract was modified
      setAbstractModified(true);
    }, 2000);
  }, []);

  const handlePlagiarismCheckComplete = useCallback((check: PlagiarismCheck) => {
    setLatestPlagiarismCheck(check);
    setAbstractModified(false);

    // Show notification based on similarity
    if (check.similarity_percentage !== null) {
      if (check.similarity_percentage > 25) {
        toast.error(`High similarity detected (${check.similarity_percentage.toFixed(1)}%). Please revise your abstract.`);
      } else if (check.similarity_percentage > 15) {
        toast.warning(`Moderate similarity detected (${check.similarity_percentage.toFixed(1)}%). Review recommended.`);
      } else {
        toast.success(`Excellent originality (${check.similarity_percentage.toFixed(1)}% similarity).`);
      }
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (plagiarismCheckTimeoutRef.current) {
        clearTimeout(plagiarismCheckTimeoutRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-medium tracking-tight">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/papers')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-3xl font-medium tracking-tight">
              {isNew ? 'New Paper' : 'Edit Paper'}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isNew && (
            <>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <History className="mr-2 h-4 w-4" />
                    Version History ({versions.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Version History</DialogTitle>
                    <DialogDescription>
                      View and restore previous versions of this paper
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {versions.map((version) => (
                      <Card key={version.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-sm font-medium">
                                Version {version.version_number}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(version.created_at).toLocaleString()}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => restoreVersion(version)}
                            >
                              Restore
                            </Button>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={deletePaper}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
          <Button 
            onClick={savePaper} 
            disabled={saving || (latestPlagiarismCheck !== null && latestPlagiarismCheck.similarity_percentage !== null && latestPlagiarismCheck.similarity_percentage > 25)}
            variant={latestPlagiarismCheck !== null && latestPlagiarismCheck.similarity_percentage !== null && latestPlagiarismCheck.similarity_percentage > 25 ? 'destructive' : 'default'}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : (latestPlagiarismCheck !== null && latestPlagiarismCheck.similarity_percentage !== null && latestPlagiarismCheck.similarity_percentage > 25) ? 'Cannot Save (High Similarity)' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Plagiarism Warning Banner */}
      {latestPlagiarismCheck !== null && latestPlagiarismCheck.similarity_percentage !== null && latestPlagiarismCheck.similarity_percentage > 25 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="text-destructive">⚠️</div>
              <div className="flex-1">
                <p className="font-medium text-destructive">Saving Blocked: High Plagiarism Similarity</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your abstract has a similarity score of {latestPlagiarismCheck.similarity_percentage.toFixed(1)}%, which exceeds the 25% threshold. 
                  Please revise your abstract to reduce similarity before saving.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Paper Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={paper.title || ''}
                  onChange={(e) => setPaper({ ...paper, title: e.target.value })}
                  placeholder="Enter paper title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="abstract">Abstract</Label>
                <Textarea
                  id="abstract"
                  value={paper.abstract || ''}
                  onChange={(e) => handleAbstractChange(e.target.value)}
                  placeholder="Enter paper abstract (minimum 50 characters for plagiarism check)"
                  rows={6}
                />
                {paper.abstract && paper.abstract.trim().length < 50 && (
                  <p className="text-xs text-muted-foreground">
                    {50 - paper.abstract.trim().length} more characters needed for plagiarism check
                  </p>
                )}
              </div>

              {/* Plagiarism Checker - Only show if paper has been saved (has ID) */}
              {!isNew && id && paper.abstract && paper.abstract.trim().length >= 50 && (
                <div className="pt-4">
                  <PlagiarismChecker
                    paperId={id}
                    abstractText={paper.abstract}
                    onCheckComplete={handlePlagiarismCheckComplete}
                  />
                </div>
              )}

              {/* Warning for new papers */}
              {isNew && paper.abstract && paper.abstract.trim().length >= 50 && (
                <div className="pt-4">
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="py-4">
                      <p className="text-sm text-yellow-800">
                        💡 Plagiarism check will be available after you save the paper for the first time.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={paper.content || ''}
                  onChange={(e) => setPaper({ ...paper, content: e.target.value })}
                  placeholder="Enter paper content"
                  rows={12}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={paper.status}
                  onValueChange={(value) => setPaper({ ...paper, status: value as PaperStatus })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Ready">Ready</SelectItem>
                    <SelectItem value="Submitted">Submitted</SelectItem>
                    <SelectItem value="Under Review">Under Review</SelectItem>
                    <SelectItem value="Accepted">Accepted</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Authors</Label>
                <div className="flex gap-2">
                  <Input
                    value={authorInput}
                    onChange={(e) => setAuthorInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAuthor())}
                    placeholder="Add author"
                  />
                  <Button type="button" onClick={addAuthor} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {paper.authors?.map((author) => (
                    <Badge key={author} variant="secondary" className="cursor-pointer" onClick={() => removeAuthor(author)}>
                      {author} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Keywords</Label>
                <div className="flex gap-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    placeholder="Add keyword"
                  />
                  <Button type="button" onClick={addKeyword} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {paper.keywords?.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="cursor-pointer" onClick={() => removeKeyword(keyword)}>
                      {keyword} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
