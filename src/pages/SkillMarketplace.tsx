import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, Clock, CheckCircle2, AlertCircle, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ResearcherProfile {
  id: string;
  user_id: string;
  display_name: string;
  skills: string[];
  available_hours_per_week: number;
  bio: string | null;
  institution: string | null;
  research_areas: string[];
  is_visible: boolean;
}

interface PaperSkillGap {
  id: string;
  paper_id: string;
  skill_needed: string;
  description: string | null;
  is_filled: boolean;
  filled_by_user_id: string | null;
  paper_title?: string;
}

interface MatchSuggestion {
  gap: PaperSkillGap;
  researcher: ResearcherProfile;
  matchScore: number;
}

const COMMON_SKILLS = ['Statistics', 'Machine Learning', 'Deep Learning', 'Natural Language Processing', 'Computer Vision', 'Data Analysis', 'Literature Review', 'LaTeX', 'Python', 'R', 'Domain Expert', 'Peer Review', 'Writing', 'Editing'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export default function SkillMarketplace() {
  const { user } = useAuth();
  const [researchers, setResearchers] = useState<ResearcherProfile[]>([]);
  const [gaps, setGaps] = useState<PaperSkillGap[]>([]);
  const [matches, setMatches] = useState<MatchSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<ResearcherProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [gapOpen, setGapOpen] = useState(false);
  const [search, setSearch] = useState('');

  const [profileForm, setProfileForm] = useState({
    display_name: '',
    bio: '',
    institution: '',
    available_hours_per_week: 5,
    skills: [] as string[],
    research_areas: [] as string[],
  });
  const [skillInput, setSkillInput] = useState('');

  // Gap form
  const [papers, setPapers] = useState<{ id: string; title: string }[]>([]);
  const [gapForm, setGapForm] = useState({ paper_id: '', skill_needed: '', description: '' });

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { buildMatches(); }, [researchers, gaps]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [rRes, gRes, pRes] = await Promise.all([
        supabase.from('researcher_profiles').select('*'),
        supabase.from('paper_skill_gaps').select('*, papers(title)'),
        supabase.from('papers').select('id, title'),
      ]);

      const resData: ResearcherProfile[] = Array.isArray(rRes.data) ? rRes.data : [];
      setResearchers(resData);
      setMyProfile(resData.find(r => r.user_id === user?.id) || null);

      const gapData = Array.isArray(gRes.data) ? gRes.data.map((g: any) => ({
        ...g,
        paper_title: g.papers?.title || 'Unknown Paper',
      })) : [];
      setGaps(gapData);
      setPapers(Array.isArray(pRes.data) ? pRes.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const buildMatches = () => {
    const openGaps = gaps.filter(g => !g.is_filled);
    const suggestions: MatchSuggestion[] = [];
    for (const gap of openGaps) {
      for (const researcher of researchers) {
        if (researcher.user_id === user?.id) continue;
        const skillMatch = researcher.skills.some(s =>
          s.toLowerCase().includes(gap.skill_needed.toLowerCase()) ||
          gap.skill_needed.toLowerCase().includes(s.toLowerCase())
        );
        if (skillMatch) {
          const score = researcher.available_hours_per_week >= 5 ? 90 : 60;
          suggestions.push({ gap, researcher, matchScore: score });
        }
      }
    }
    suggestions.sort((a, b) => b.matchScore - a.matchScore);
    setMatches(suggestions);
  };

  const saveProfile = async () => {
    if (!profileForm.display_name.trim()) return toast.error('Display name required');
    try {
      const payload = {
        user_id: user!.id,
        display_name: profileForm.display_name,
        bio: profileForm.bio || null,
        institution: profileForm.institution || null,
        available_hours_per_week: profileForm.available_hours_per_week,
        skills: profileForm.skills,
        research_areas: profileForm.research_areas,
        is_visible: true,
      };
      const { error } = await supabase.from('researcher_profiles').upsert(payload, { onConflict: 'user_id' });
      if (error) throw error;
      toast.success('Profile saved!');
      setProfileOpen(false);
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const addSkillGap = async () => {
    if (!gapForm.paper_id || !gapForm.skill_needed.trim()) return toast.error('Select a paper and enter a skill');
    try {
      const { error } = await supabase.from('paper_skill_gaps').insert({
        paper_id: gapForm.paper_id,
        skill_needed: gapForm.skill_needed,
        description: gapForm.description || null,
      });
      if (error) throw error;
      toast.success('Skill gap posted!');
      setGapOpen(false);
      setGapForm({ paper_id: '', skill_needed: '', description: '' });
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const fillGap = async (gapId: string) => {
    try {
      const { error } = await supabase.from('paper_skill_gaps').update({
        is_filled: true,
        filled_by_user_id: user?.id,
      }).eq('id', gapId);
      if (error) throw error;
      toast.success('Marked as filled!');
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const filteredResearchers = researchers.filter(r =>
    r.is_visible && (
      !search ||
      r.display_name.toLowerCase().includes(search.toLowerCase()) ||
      r.skills.some(s => s.toLowerCase().includes(search.toLowerCase()))
    )
  );

  const openGaps = gaps.filter(g => !g.is_filled);

  if (loading) return (
    <div className="space-y-8">
      <Skeleton className="h-10 w-72" />
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>
        <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>
      </div>
    </div>
  );

  return (
    <motion.div className="space-y-8" initial="hidden" animate="visible" variants={containerVariants}>
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-light tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-[hsl(217,91%,60%)]" />
            Skill Marketplace
          </h2>
          <p className="text-muted-foreground">Match your paper's skill gaps with researchers who have available bandwidth.</p>
        </div>
        <div className="flex gap-2">
          {!myProfile ? (
            <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Register as Researcher</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Researcher Profile</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-1">
                    <Label>Display Name</Label>
                    <Input value={profileForm.display_name} onChange={e => setProfileForm({...profileForm, display_name: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label>Institution</Label>
                    <Input value={profileForm.institution} onChange={e => setProfileForm({...profileForm, institution: e.target.value})} placeholder="e.g. IIT Delhi" />
                  </div>
                  <div className="space-y-1">
                    <Label>Available hours/week: {profileForm.available_hours_per_week}h</Label>
                    <Input type="range" min={1} max={40} value={profileForm.available_hours_per_week}
                      onChange={e => setProfileForm({...profileForm, available_hours_per_week: +e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Skills</Label>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {COMMON_SKILLS.map(s => (
                        <Badge key={s} variant={profileForm.skills.includes(s) ? 'default' : 'outline'}
                          className="cursor-pointer text-xs"
                          onClick={() => setProfileForm(prev => ({
                            ...prev,
                            skills: prev.skills.includes(s) ? prev.skills.filter(x => x !== s) : [...prev.skills, s]
                          }))}
                        >{s}</Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="Custom skill" />
                      <Button type="button" variant="outline" size="sm" onClick={() => {
                        if (skillInput.trim()) {
                          setProfileForm(p => ({...p, skills: [...p.skills, skillInput.trim()]}));
                          setSkillInput('');
                        }
                      }}>Add</Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Bio</Label>
                    <Textarea value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} rows={2} />
                  </div>
                  <Button className="w-full" onClick={saveProfile}>Save Profile</Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Badge variant="outline" className="py-2 px-3">
              <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" /> Registered: {myProfile.display_name}
            </Badge>
          )}

          <Dialog open={gapOpen} onOpenChange={setGapOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><AlertCircle className="h-4 w-4 mr-2" /> Post Skill Gap</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Post a Skill Gap</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1">
                  <Label>Paper</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={gapForm.paper_id} onChange={e => setGapForm({...gapForm, paper_id: e.target.value})}>
                    <option value="">Select a paper…</option>
                    {papers.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Skill Needed</Label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {COMMON_SKILLS.slice(0, 8).map(s => (
                      <Badge key={s} variant={gapForm.skill_needed === s ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => setGapForm({...gapForm, skill_needed: s})}>{s}</Badge>
                    ))}
                  </div>
                  <Input value={gapForm.skill_needed} onChange={e => setGapForm({...gapForm, skill_needed: e.target.value})} placeholder="or type custom skill" />
                </div>
                <div className="space-y-1">
                  <Label>Description (optional)</Label>
                  <Textarea value={gapForm.description} onChange={e => setGapForm({...gapForm, description: e.target.value})} rows={2} placeholder="What kind of help do you need?" />
                </div>
                <Button className="w-full" onClick={addSkillGap}>Post Gap</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* AI Matches banner */}
      {matches.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="bg-[hsl(217,91%,60%)]/10 border border-[hsl(217,91%,60%)]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[hsl(217,91%,60%)]" />
                {matches.length} Smart Match{matches.length > 1 ? 'es' : ''} Found
              </CardTitle>
              <CardDescription>Researchers whose skills align with your open gaps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {matches.slice(0, 3).map((m, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background/70">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{m.researcher.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Can help with <span className="font-medium">{m.gap.skill_needed}</span> on "{m.gap.paper_title}"
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-2.5 w-2.5 mr-1" />{m.researcher.available_hours_per_week}h/wk
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => fillGap(m.gap.id)}>
                        Connect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Two-panel layout */}
      <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-8">
        {/* Left: Open Gaps */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <AlertCircle className="h-5 w-5 fit-low" />
            Open Skill Gaps
            {openGaps.length > 0 && <Badge variant="secondary">{openGaps.length}</Badge>}
          </h3>
          {openGaps.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No open skill gaps — post one to find collaborators.</p>
              </CardContent>
            </Card>
          ) : (
            openGaps.map(gap => (
              <Card key={gap.id} className="hover-lift">
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="outline" className="bg-skill-gap text-xs mb-1">{gap.skill_needed}</Badge>
                      <p className="text-sm font-medium line-clamp-1">{gap.paper_title}</p>
                      {gap.description && <p className="text-xs text-muted-foreground mt-1">{gap.description}</p>}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => fillGap(gap.id)}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Right: Available Researchers */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Users className="h-5 w-5 text-[hsl(217,91%,60%)]" />
            Available Researchers
            {filteredResearchers.length > 0 && <Badge variant="secondary">{filteredResearchers.length}</Badge>}
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name or skill…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {filteredResearchers.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No researchers registered yet.</p>
              </CardContent>
            </Card>
          ) : (
            filteredResearchers.map(r => (
              <Card key={r.id} className="hover-lift">
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{r.display_name}</p>
                      {r.institution && <p className="text-xs text-muted-foreground">{r.institution}</p>}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      <Clock className="h-2.5 w-2.5 mr-1" />{r.available_hours_per_week}h/wk
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {r.skills.slice(0, 5).map(s => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                    {r.skills.length > 5 && <Badge variant="outline" className="text-xs">+{r.skills.length - 5}</Badge>}
                  </div>
                  {r.bio && <p className="text-xs text-muted-foreground line-clamp-2">{r.bio}</p>}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
