import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Mail, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Team, TeamMember, Paper } from '@/types/types';

export default function CollaborationHub() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({});
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'reviewer' | 'viewer'>('editor');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamPaper, setNewTeamPaper] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [teamsRes, papersRes] = await Promise.all([
        supabase.from('teams').select('*').order('created_at', { ascending: false }),
        supabase.from('papers').select('*').order('created_at', { ascending: false }),
      ]);

      if (teamsRes.error) throw teamsRes.error;
      if (papersRes.error) throw papersRes.error;

      const teamsData = Array.isArray(teamsRes.data) ? teamsRes.data : [];
      setTeams(teamsData);
      setPapers(Array.isArray(papersRes.data) ? papersRes.data : []);

      // Load team members for each team
      const membersData: Record<string, TeamMember[]> = {};
      for (const team of teamsData) {
        const { data } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', team.id);
        membersData[team.id] = Array.isArray(data) ? data : [];
      }
      setTeamMembers(membersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load collaboration data');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!selectedTeam || !inviteEmail) {
      toast.error('Please select a team and enter an email');
      return;
    }

    try {
      const { error } = await supabase.from('team_members').insert({
        team_id: selectedTeam,
        user_id: null,
        email: inviteEmail,
        role: inviteRole,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Invitation sent successfully');
      setInviteEmail('');
      loadData();
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Failed to send invitation');
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamPaper || !newTeamName) {
      toast.error('Please select a paper and enter a team name');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to create a team');
        return;
      }

      const { error } = await supabase.from('teams').insert({
        paper_id: newTeamPaper,
        name: newTeamName,
        owner_id: user.id,
      });

      if (error) throw error;

      toast.success('Team created successfully');
      setNewTeamName('');
      setNewTeamPaper('');
      loadData();
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'declined':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'outline' => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'editor':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="space-y-2">
        <h2 className="text-3xl font-medium tracking-tight">Collaboration Hub</h2>
        <p className="text-muted-foreground">
          Manage teams and collaborate on paper submissions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Team</CardTitle>
          <CardDescription>
            Start a new collaboration team for a paper
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paper">Select Paper</Label>
            <Select value={newTeamPaper} onValueChange={setNewTeamPaper}>
              <SelectTrigger id="paper">
                <SelectValue placeholder="Choose a paper" />
              </SelectTrigger>
              <SelectContent>
                {papers.map((paper) => (
                  <SelectItem key={paper.id} value={paper.id}>
                    {paper.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teamName">Team Name</Label>
            <Input
              id="teamName"
              type="text"
              placeholder="e.g., Research Team Alpha"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
            />
          </div>

          <Button onClick={handleCreateTeam} className="w-full">
            <Users className="mr-2 h-4 w-4" />
            Create Team
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite Team Member</CardTitle>
          <CardDescription>
            Add collaborators to your submission teams
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team">Select Team</Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger id="team">
                <SelectValue placeholder="Choose a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => {
                  const paper = papers.find(p => p.id === team.paper_id);
                  return (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} - {paper?.title || 'Unknown Paper'}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@university.edu"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'editor' | 'reviewer' | 'viewer')}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor - Can edit and submit</SelectItem>
                <SelectItem value="reviewer">Reviewer - Can view and comment</SelectItem>
                <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleInviteMember} className="w-full">
            <UserPlus className="mr-2 h-4 w-4" />
            Send Invitation
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <h3 className="text-xl font-medium">Your Teams</h3>
        {teams.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No teams yet</h3>
              <p className="text-muted-foreground text-center">
                Create your first team using the form above
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {teams.map((team) => {
              const paper = papers.find(p => p.id === team.paper_id);
              const members = teamMembers[team.id] || [];

              return (
                <Card key={team.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <Badge>{members.length} member(s)</Badge>
                    </div>
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    <CardDescription>{paper?.title || 'Unknown Paper'}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Team Members</Label>
                      {members.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No members yet</p>
                      ) : (
                        <div className="space-y-2">
                          {members.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-2 rounded-md bg-muted"
                            >
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{member.email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={getRoleBadgeVariant(member.role)}>
                                  {member.role}
                                </Badge>
                                {getStatusIcon(member.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
