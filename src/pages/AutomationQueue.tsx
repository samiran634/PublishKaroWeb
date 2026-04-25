import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Play, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { AutomationTask, Paper, Venue } from '@/types/types';

export default function AutomationQueue() {
  const [tasks, setTasks] = useState<AutomationTask[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tasksResult, papersResult, venuesResult] = await Promise.all([
        supabase.from('automation_tasks').select('*').order('priority', { ascending: false }).order('created_at', { ascending: true }),
        supabase.from('papers').select('*'),
        supabase.from('venues').select('*'),
      ]);

      setTasks(Array.isArray(tasksResult.data) ? tasksResult.data : []);
      setPapers(Array.isArray(papersResult.data) ? papersResult.data : []);
      setVenues(Array.isArray(venuesResult.data) ? venuesResult.data : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPaperTitle = (paperId: string) => {
    const paper = papers.find(p => p.id === paperId);
    return paper?.title || 'Unknown Paper';
  };

  const getVenueName = (venueId: string) => {
    const venue = venues.find(v => v.id === venueId);
    return venue?.name || 'Unknown Venue';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      queued: 'bg-secondary text-secondary-foreground',
      in_progress: 'bg-primary text-primary-foreground',
      completed: 'bg-primary text-primary-foreground',
      failed: 'bg-destructive text-destructive-foreground',
      cancelled: 'bg-muted text-muted-foreground',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const executeTask = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const { data, error } = await supabase.functions.invoke('submit-paper', {
        body: {
          taskId: task.id,
          paperId: task.paper_id,
          venueId: task.venue_id,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Task executed successfully');
        loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error executing task:', error);
      toast.error('Failed to execute task');
    }
  };

  const cancelTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('automation_tasks')
        .update({ status: 'cancelled' })
        .eq('id', taskId);

      if (error) throw error;
      toast.success('Task cancelled');
      loadData();
    } catch (error) {
      console.error('Error cancelling task:', error);
      toast.error('Failed to cancel task');
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-medium tracking-tight">Automation Queue</h2>
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-medium tracking-tight">Automation Queue</h2>
          <p className="text-muted-foreground">
            Manage queued and active submission tasks
          </p>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-sm">Queued</CardDescription>
            <CardTitle className="text-4xl font-medium">
              {tasks.filter(t => t.status === 'queued').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-sm">In Progress</CardDescription>
            <CardTitle className="text-4xl font-medium">
              {tasks.filter(t => t.status === 'in_progress').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-sm">Completed</CardDescription>
            <CardTitle className="text-4xl font-medium">
              {tasks.filter(t => t.status === 'completed').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-sm">Failed</CardDescription>
            <CardTitle className="text-4xl font-medium">
              {tasks.filter(t => t.status === 'failed').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Task Queue</CardTitle>
          <CardDescription>All automation tasks ordered by priority</CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground mb-4">No tasks in queue</p>
              <Link to="/submission-agent">
                <Button>Create Submission Task</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paper</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">
                      {getPaperTitle(task.paper_id)}
                    </TableCell>
                    <TableCell>{getVenueName(task.venue_id)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{task.task_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{task.priority}</TableCell>
                    <TableCell>
                      {new Date(task.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {task.status === 'queued' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => executeTask(task.id)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelTask(task.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
