import {
  BookmarkPlus,
  BookOpen,
  Check,
  CheckCircle2,
  ExternalLink,
  Library,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import type { Resource } from '@/types/types';

interface GeneratedPaper {
  abstract: string;
  introduction: string;
  literature_review: string;
  methodology: string;
  results: string;
  discussion: string;
  conclusion: string;
  references: string[];
}

interface ScholarPaper {
  title: string;
  authors: string;
  year: string;
  snippet: string;
  link: string;
  citedBy: number;
  source: string;
}

export default function PaperCreationAgent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResources, setSelectedResources] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [targetVenue, setTargetVenue] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedPaper, setGeneratedPaper] = useState<GeneratedPaper | null>(null);
  const [scholarPapers, setScholarPapers] = useState<ScholarPaper[]>([]);
  const [searchingScholar, setSearchingScholar] = useState(false);
  const [savingScholarLinks, setSavingScholarLinks] = useState<Set<string>>(new Set());
  const [currentStep, setCurrentStep] = useState<'configure' | 'generate' | 'review'>('configure');

  useEffect(() => {
    void loadResources();
  }, []);

  const loadResources = async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  };

  const toggleResource = (resourceId: string) => {
    setSelectedResources((prev) => {
      const next = new Set(prev);
      if (next.has(resourceId)) {
        next.delete(resourceId);
      } else {
        next.add(resourceId);
      }
      return next;
    });
  };

  const addKeyword = () => {
    const nextKeyword = keywordInput.trim();
    if (nextKeyword && !keywords.includes(nextKeyword)) {
      setKeywords((prev) => [...prev, nextKeyword]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords((prev) => prev.filter((item) => item !== keyword));
  };

  const getScholarResourceMatch = (paper: ScholarPaper) =>
    resources.find(
      (resource) =>
        resource.file_url === paper.link ||
        (resource.name === paper.title && resource.tags?.includes('google-scholar'))
    );

  const buildScholarResourcePayload = (paper: ScholarPaper) => ({
    name: paper.title,
    type: 'Reference' as const,
    description: [
      `${paper.authors}${paper.year ? ` (${paper.year})` : ''}`,
      paper.snippet,
      `Source: ${paper.source}`,
      `Cited by: ${paper.citedBy}`,
    ]
      .filter(Boolean)
      .join(' | '),
    tags: Array.from(
      new Set([
        'google-scholar',
        'reference',
        ...keywords.map((keyword) => keyword.trim().toLowerCase()).filter(Boolean),
      ])
    ),
    file_url: paper.link || null,
    user_id: user?.id,
  });

  const searchScholar = async () => {
    if (keywords.length === 0) {
      toast.error('Please add keywords first');
      return;
    }

    setSearchingScholar(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-scholar', {
        body: {
          query: keywords.join(' '),
          limit: 10,
        },
      });

      if (error) throw error;

      if (data.success) {
        setScholarPapers(data.papers || []);
        toast.success(`Found ${data.papers?.length || 0} related papers`);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Scholar search error:', error);
      toast.error('Failed to search Google Scholar from Supabase.');
    } finally {
      setSearchingScholar(false);
    }
  };

  const saveScholarPaperToInventory = async (paper: ScholarPaper) => {
    const existingResource = getScholarResourceMatch(paper);
    if (existingResource) {
      setSelectedResources((prev) => {
        const next = new Set(prev);
        next.add(existingResource.id);
        return next;
      });
      toast.info('This Google Scholar reference is already saved in Resource Inventory.');
      return;
    }

    setSavingScholarLinks((prev) => new Set(prev).add(paper.link));
    try {
      const { data, error } = await supabase
        .from('resources')
        .insert([buildScholarResourcePayload(paper)])
        .select()
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setResources((prev) => [data, ...prev]);
        setSelectedResources((prev) => {
          const next = new Set(prev);
          next.add(data.id);
          return next;
        });
      }

      toast.success('Google Scholar paper saved to Resource Inventory.');
    } catch (error) {
      console.error('Error saving scholar paper:', error);
      toast.error('Failed to save Google Scholar paper to Resource Inventory.');
    } finally {
      setSavingScholarLinks((prev) => {
        const next = new Set(prev);
        next.delete(paper.link);
        return next;
      });
    }
  };

  const saveAllScholarPapersToInventory = async () => {
    const unsavedPapers = scholarPapers.filter((paper) => !getScholarResourceMatch(paper));
    if (unsavedPapers.length === 0) {
      toast.info('All visible Google Scholar papers are already in Resource Inventory.');
      return;
    }

    setSavingScholarLinks(new Set(unsavedPapers.map((paper) => paper.link)));
    try {
      const { data, error } = await supabase
        .from('resources')
        .insert(unsavedPapers.map(buildScholarResourcePayload))
        .select();

      if (error) throw error;

      const savedResources = Array.isArray(data) ? data : [];
      setResources((prev) => [...savedResources, ...prev]);
      setSelectedResources((prev) => {
        const next = new Set(prev);
        for (const resource of savedResources) {
          next.add(resource.id);
        }
        return next;
      });

      toast.success(`${savedResources.length} Google Scholar references saved to Resource Inventory.`);
    } catch (error) {
      console.error('Error saving scholar papers:', error);
      toast.error('Failed to save Google Scholar references to Resource Inventory.');
    } finally {
      setSavingScholarLinks(new Set());
    }
  };

  const generatePaper = async () => {
    if (!title.trim()) {
      toast.error('Please enter a paper title');
      return;
    }

    if (keywords.length === 0) {
      toast.error('Please add at least one keyword');
      return;
    }

    if (selectedResources.size === 0) {
      toast.error('Please select at least one resource');
      return;
    }

    setGenerating(true);
    setCurrentStep('generate');

    try {
      const selectedResourceData = resources.filter((resource) => selectedResources.has(resource.id));

      const { data, error } = await supabase.functions.invoke('generate-paper', {
        body: {
          title,
          keywords,
          resources: selectedResourceData.map((resource) => ({
            id: resource.id,
            name: resource.name,
            type: resource.type,
            description: resource.description,
          })),
          targetVenue,
        },
      });

      if (error) throw error;

      if (data.success) {
        setGeneratedPaper(data.paper);
        setCurrentStep('review');
        toast.success('Paper generated successfully!');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Paper generation error:', error);
      toast.error('Failed to generate paper. Please try again.');
      setCurrentStep('configure');
    } finally {
      setGenerating(false);
    }
  };

  const savePaper = async () => {
    if (!generatedPaper) return;

    try {
      const fullContent = `# Abstract\n\n${generatedPaper.abstract}\n\n# Introduction\n\n${generatedPaper.introduction}\n\n# Literature Review\n\n${generatedPaper.literature_review}\n\n# Methodology\n\n${generatedPaper.methodology}\n\n# Results\n\n${generatedPaper.results}\n\n# Discussion\n\n${generatedPaper.discussion}\n\n# Conclusion\n\n${generatedPaper.conclusion}\n\n# References\n\n${generatedPaper.references.join('\n')}`;

      const { data, error } = await supabase
        .from('papers')
        .insert([
          {
            title,
            abstract: generatedPaper.abstract,
            content: fullContent,
            keywords,
            authors: [],
            status: 'Draft',
            user_id: user?.id,
          },
        ])
        .select()
        .maybeSingle();

      if (error) throw error;

      toast.success('Paper saved successfully!');
      navigate(`/papers/${data.id}`);
    } catch (error) {
      console.error('Error saving paper:', error);
      toast.error('Failed to save paper');
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-medium tracking-tight">Paper Creation Agent</h2>
        <p className="text-muted-foreground">
          AI-powered paper generation from your Resource Inventory, with Google Scholar references
          that can be stored in Supabase and reused.
        </p>
      </div>

      {currentStep === 'configure' && (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Paper Configuration</CardTitle>
                <CardDescription>Set up your paper details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="paper-title">Paper Title</Label>
                  <Input
                    id="paper-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Enter your paper title"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Keywords</Label>
                  <div className="flex gap-2">
                    <Input
                      value={keywordInput}
                      onChange={(event) => setKeywordInput(event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), addKeyword())}
                      placeholder="Add keyword"
                    />
                    <Button type="button" onClick={addKeyword} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <Badge
                        key={keyword}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeKeyword(keyword)}
                      >
                        {keyword} x
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-venue">Target Venue (Optional)</Label>
                  <Input
                    id="target-venue"
                    value={targetVenue}
                    onChange={(event) => setTargetVenue(event.target.value)}
                    placeholder="e.g., IEEE Conference, Nature Journal"
                  />
                </div>

                <Separator />

                <div className="flex flex-wrap gap-3">
                  <Button onClick={searchScholar} disabled={searchingScholar || keywords.length === 0}>
                    {searchingScholar ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Search Related Papers
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/resources')}>
                    <Library className="mr-2 h-4 w-4" />
                    Open Resource Inventory
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Select Resources</CardTitle>
                <CardDescription>
                  Choose resources to include in your paper ({selectedResources.size} selected)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {resources.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground mb-4">No resources available</p>
                    <Button variant="outline" onClick={() => navigate('/resources')}>
                      Add Resources
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {resources.map((resource) => (
                      <div key={resource.id} className="flex items-start gap-3 rounded-lg border p-3">
                        <Checkbox
                          checked={selectedResources.has(resource.id)}
                          onCheckedChange={() => toggleResource(resource.id)}
                        />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">{resource.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {resource.description || 'No description'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">
                              {resource.type}
                            </Badge>
                            {resource.tags?.includes('google-scholar') && (
                              <Badge variant="secondary" className="text-xs">
                                Google Scholar
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Generation Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    The AI will generate a complete academic paper with:
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>- Abstract</li>
                    <li>- Introduction</li>
                    <li>- Literature Review</li>
                    <li>- Methodology</li>
                    <li>- Results</li>
                    <li>- Discussion</li>
                    <li>- Conclusion</li>
                    <li>- References</li>
                  </ul>
                </div>
                <Separator />
                <Button
                  onClick={generatePaper}
                  disabled={!title || keywords.length === 0 || selectedResources.size === 0}
                  className="w-full"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Paper with AI
                </Button>
              </CardContent>
            </Card>

            {scholarPapers.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg font-medium">Related Papers</CardTitle>
                      <CardDescription>
                        From Google Scholar and ready to save into Supabase Resource Inventory
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={saveAllScholarPapersToInventory}>
                      <BookmarkPlus className="mr-2 h-4 w-4" />
                      Save all
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {scholarPapers.map((paper, index) => {
                      const savedResource = getScholarResourceMatch(paper);
                      const isSaving = savingScholarLinks.has(paper.link);

                      return (
                        <div key={`${paper.link}-${index}`} className="border-b pb-3 last:border-0">
                          <p className="text-sm font-medium line-clamp-2">{paper.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {paper.authors} | {paper.year} | Cited by {paper.citedBy}
                          </p>
                          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{paper.snippet}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void saveScholarPaperToInventory(paper)}
                              disabled={isSaving}
                            >
                              {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : savedResource ? (
                                <Check className="mr-2 h-4 w-4" />
                              ) : (
                                <BookmarkPlus className="mr-2 h-4 w-4" />
                              )}
                              {savedResource ? 'Saved to inventory' : 'Save to inventory'}
                            </Button>
                            {paper.link && (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={paper.link} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Open source
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {currentStep === 'generate' && (
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="mx-auto mb-4 h-16 w-16 animate-spin text-primary" />
            <h3 className="mb-2 text-lg font-medium">Generating Your Paper</h3>
            <p className="text-sm text-muted-foreground">
              AI is analyzing your resources and creating a structured academic paper...
            </p>
          </CardContent>
        </Card>
      )}

      {currentStep === 'review' && generatedPaper && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">Paper Generated Successfully</h3>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep('configure')}>
                Start Over
              </Button>
              <Button onClick={savePaper}>
                <BookOpen className="mr-2 h-4 w-4" />
                Save to Papers
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-medium">{title}</CardTitle>
              <div className="mt-2 flex flex-wrap gap-2">
                {keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="abstract">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="abstract">Abstract</TabsTrigger>
                  <TabsTrigger value="introduction">Introduction</TabsTrigger>
                  <TabsTrigger value="methodology">Methodology</TabsTrigger>
                  <TabsTrigger value="results">Results</TabsTrigger>
                </TabsList>
                <TabsContent value="abstract" className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Abstract</h4>
                    <Textarea
                      value={generatedPaper.abstract}
                      onChange={(event) =>
                        setGeneratedPaper({ ...generatedPaper, abstract: event.target.value })
                      }
                      rows={6}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="introduction" className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Introduction</h4>
                    <Textarea
                      value={generatedPaper.introduction}
                      onChange={(event) =>
                        setGeneratedPaper({ ...generatedPaper, introduction: event.target.value })
                      }
                      rows={12}
                    />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Literature Review</h4>
                    <Textarea
                      value={generatedPaper.literature_review}
                      onChange={(event) =>
                        setGeneratedPaper({
                          ...generatedPaper,
                          literature_review: event.target.value,
                        })
                      }
                      rows={12}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="methodology" className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Methodology</h4>
                    <Textarea
                      value={generatedPaper.methodology}
                      onChange={(event) =>
                        setGeneratedPaper({ ...generatedPaper, methodology: event.target.value })
                      }
                      rows={12}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="results" className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Results</h4>
                    <Textarea
                      value={generatedPaper.results}
                      onChange={(event) =>
                        setGeneratedPaper({ ...generatedPaper, results: event.target.value })
                      }
                      rows={12}
                    />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Discussion</h4>
                    <Textarea
                      value={generatedPaper.discussion}
                      onChange={(event) =>
                        setGeneratedPaper({ ...generatedPaper, discussion: event.target.value })
                      }
                      rows={12}
                    />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Conclusion</h4>
                    <Textarea
                      value={generatedPaper.conclusion}
                      onChange={(event) =>
                        setGeneratedPaper({ ...generatedPaper, conclusion: event.target.value })
                      }
                      rows={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">References</h4>
                    <div className="space-y-2">
                      {generatedPaper.references.map((reference, index) => (
                        <p key={index} className="text-sm">
                          {index + 1}. {reference}
                        </p>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
