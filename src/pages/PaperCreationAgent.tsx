import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Loader2, CheckCircle2, BookOpen, Search } from 'lucide-react';
import { toast } from 'sonner';
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
  const [currentStep, setCurrentStep] = useState<'configure' | 'generate' | 'review'>('configure');

  useEffect(() => {
    loadResources();
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
    setSelectedResources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resourceId)) {
        newSet.delete(resourceId);
      } else {
        newSet.add(resourceId);
      }
      return newSet;
    });
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

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
      toast.error('Failed to search Google Scholar');
    } finally {
      setSearchingScholar(false);
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
      const selectedResourceData = resources.filter(r => selectedResources.has(r.id));

      const { data, error } = await supabase.functions.invoke('generate-paper', {
        body: {
          title,
          keywords,
          resources: selectedResourceData.map(r => ({
            id: r.id,
            name: r.name,
            type: r.type,
            description: r.description,
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
        .insert([{
          title,
          abstract: generatedPaper.abstract,
          content: fullContent,
          keywords,
          authors: [],
          status: 'Draft',
        }])
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
          AI-powered paper generation from your resource inventory
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
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter your paper title"
                  />
                </div>

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
                    {keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="cursor-pointer" onClick={() => removeKeyword(keyword)}>
                        {keyword} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-venue">Target Venue (Optional)</Label>
                  <Input
                    id="target-venue"
                    value={targetVenue}
                    onChange={(e) => setTargetVenue(e.target.value)}
                    placeholder="e.g., IEEE Conference, Nature Journal"
                  />
                </div>

                <Separator />

                <div className="flex gap-3">
                  <Button onClick={searchScholar} disabled={searchingScholar || keywords.length === 0}>
                    {searchingScholar ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Search Related Papers
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
                      <div key={resource.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <Checkbox
                          checked={selectedResources.has(resource.id)}
                          onCheckedChange={() => toggleResource(resource.id)}
                        />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">{resource.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {resource.description || 'No description'}
                          </p>
                          <Badge variant="outline" className="text-xs">{resource.type}</Badge>
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
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Abstract</li>
                    <li>• Introduction</li>
                    <li>• Literature Review</li>
                    <li>• Methodology</li>
                    <li>• Results</li>
                    <li>• Discussion</li>
                    <li>• Conclusion</li>
                    <li>• References</li>
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
                  <CardTitle className="text-lg font-medium">Related Papers</CardTitle>
                  <CardDescription>From Google Scholar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {scholarPapers.map((paper, index) => (
                      <div key={index} className="pb-3 border-b last:border-0">
                        <p className="text-sm font-medium line-clamp-2">{paper.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {paper.authors} • {paper.year} • Cited by {paper.citedBy}
                        </p>
                      </div>
                    ))}
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
            <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary mb-4" />
            <h3 className="text-lg font-medium mb-2">Generating Your Paper</h3>
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
              <div className="flex flex-wrap gap-2 mt-2">
                {keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary">{keyword}</Badge>
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
                      onChange={(e) => setGeneratedPaper({ ...generatedPaper, abstract: e.target.value })}
                      rows={6}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="introduction" className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Introduction</h4>
                    <Textarea
                      value={generatedPaper.introduction}
                      onChange={(e) => setGeneratedPaper({ ...generatedPaper, introduction: e.target.value })}
                      rows={12}
                    />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Literature Review</h4>
                    <Textarea
                      value={generatedPaper.literature_review}
                      onChange={(e) => setGeneratedPaper({ ...generatedPaper, literature_review: e.target.value })}
                      rows={12}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="methodology" className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Methodology</h4>
                    <Textarea
                      value={generatedPaper.methodology}
                      onChange={(e) => setGeneratedPaper({ ...generatedPaper, methodology: e.target.value })}
                      rows={12}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="results" className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Results</h4>
                    <Textarea
                      value={generatedPaper.results}
                      onChange={(e) => setGeneratedPaper({ ...generatedPaper, results: e.target.value })}
                      rows={12}
                    />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Discussion</h4>
                    <Textarea
                      value={generatedPaper.discussion}
                      onChange={(e) => setGeneratedPaper({ ...generatedPaper, discussion: e.target.value })}
                      rows={12}
                    />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Conclusion</h4>
                    <Textarea
                      value={generatedPaper.conclusion}
                      onChange={(e) => setGeneratedPaper({ ...generatedPaper, conclusion: e.target.value })}
                      rows={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">References</h4>
                    <div className="space-y-2">
                      {generatedPaper.references.map((ref, index) => (
                        <p key={index} className="text-sm">{index + 1}. {ref}</p>
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
