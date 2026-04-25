import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Venue, VenueType, Priority, Submission, Paper } from '@/types/types';

export default function PublicationDashboard() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isVenueDialogOpen, setIsVenueDialogOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [venueForm, setVenueForm] = useState({
    name: '',
    type: 'Journal' as VenueType,
    submission_url: '',
    priority: 'Medium' as Priority,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [venuesResult, submissionsResult, papersResult] = await Promise.all([
        supabase.from('venues').select('*').order('priority', { ascending: true }),
        supabase.from('submissions').select('*').order('submitted_at', { ascending: false }),
        supabase.from('papers').select('*'),
      ]);

      setVenues(Array.isArray(venuesResult.data) ? venuesResult.data : []);
      setSubmissions(Array.isArray(submissionsResult.data) ? submissionsResult.data : []);
      setPapers(Array.isArray(papersResult.data) ? papersResult.data : []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveVenue = async () => {
    if (!venueForm.name.trim()) {
      toast.error('Please enter a venue name');
      return;
    }

    try {
      if (editingVenue) {
        const { error } = await supabase
          .from('venues')
          .update(venueForm)
          .eq('id', editingVenue.id);

        if (error) throw error;
        toast.success('Venue updated successfully');
      } else {
        const { error } = await supabase
          .from('venues')
          .insert([venueForm]);

        if (error) throw error;
        toast.success('Venue created successfully');
      }

      setIsVenueDialogOpen(false);
      resetVenueForm();
      loadData();
    } catch (error) {
      console.error('Error saving venue:', error);
      toast.error('Failed to save venue');
    }
  };

  const deleteVenue = async (id: string) => {
    try {
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Venue deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting venue:', error);
      toast.error('Failed to delete venue');
    }
  };

  const openEditDialog = (venue: Venue) => {
    setEditingVenue(venue);
    setVenueForm({
      name: venue.name,
      type: venue.type,
      submission_url: venue.submission_url || '',
      priority: venue.priority,
    });
    setIsVenueDialogOpen(true);
  };

  const resetVenueForm = () => {
    setEditingVenue(null);
    setVenueForm({
      name: '',
      type: 'Journal',
      submission_url: '',
      priority: 'Medium',
    });
  };

  const getPriorityColor = (priority: Priority) => {
    const colors: Record<Priority, string> = {
      High: 'bg-primary text-primary-foreground',
      Medium: 'bg-secondary text-secondary-foreground',
      Low: 'bg-muted text-muted-foreground',
    };
    return colors[priority];
  };

  const getPaperTitle = (paperId: string) => {
    const paper = papers.find(p => p.id === paperId);
    return paper?.title || 'Unknown Paper';
  };

  const getVenueName = (venueId: string) => {
    const venue = venues.find(v => v.id === venueId);
    return venue?.name || 'Unknown Venue';
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-medium tracking-tight">Publication Dashboard</h2>
        <p className="text-muted-foreground">Manage publication venues and track submissions</p>
      </div>

      <Tabs defaultValue="venues" className="space-y-6">
        <TabsList>
          <TabsTrigger value="venues">Venues</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="venues" className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {venues.length} venue{venues.length !== 1 ? 's' : ''} configured
            </p>
            <Dialog open={isVenueDialogOpen} onOpenChange={(open) => {
              setIsVenueDialogOpen(open);
              if (!open) resetVenueForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Venue
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingVenue ? 'Edit Venue' : 'Add New Venue'}</DialogTitle>
                  <DialogDescription>
                    Configure a publication venue for paper submissions
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="venue-name">Name</Label>
                    <Input
                      id="venue-name"
                      value={venueForm.name}
                      onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })}
                      placeholder="e.g., Nature, IEEE Conference"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="venue-type">Type</Label>
                    <Select
                      value={venueForm.type}
                      onValueChange={(value) => setVenueForm({ ...venueForm, type: value as VenueType })}
                    >
                      <SelectTrigger id="venue-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Journal">Journal</SelectItem>
                        <SelectItem value="Conference">Conference</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="venue-url">Submission URL</Label>
                    <Input
                      id="venue-url"
                      value={venueForm.submission_url}
                      onChange={(e) => setVenueForm({ ...venueForm, submission_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="venue-priority">Priority</Label>
                    <Select
                      value={venueForm.priority}
                      onValueChange={(value) => setVenueForm({ ...venueForm, priority: value as Priority })}
                    >
                      <SelectTrigger id="venue-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setIsVenueDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={saveVenue}>
                      {editingVenue ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {venues.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <h3 className="text-lg font-medium mb-2">No venues configured</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Add your first publication venue to start tracking submissions
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {venues.map((venue) => (
                <Card key={venue.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg font-medium">{venue.name}</CardTitle>
                        <CardDescription>{venue.type}</CardDescription>
                      </div>
                      <Badge variant="secondary" className={getPriorityColor(venue.priority)}>
                        {venue.priority}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(venue)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteVenue(venue.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="submissions" className="space-y-6">
          {submissions.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <h3 className="text-lg font-medium mb-2">No submissions yet</h3>
                <p className="text-sm text-muted-foreground">
                  Use the Submission Agent to submit papers to venues
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Submission History</CardTitle>
                <CardDescription>Track the status of your paper submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paper</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">
                          {getPaperTitle(submission.paper_id)}
                        </TableCell>
                        <TableCell>{getVenueName(submission.venue_id)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{submission.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(submission.submitted_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
