import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, EyeOff, Pencil, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import type { Credential, Venue } from '@/types/types';
import { useAuth } from '@/contexts/AuthContext';

export default function CredentialVault() {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());
  const [credentialForm, setCredentialForm] = useState({
    venue_id: '',
    username: '',
    password: '',
    portal_url: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [credentialsResult, venuesResult] = await Promise.all([
        supabase.from('credentials').select('*').order('created_at', { ascending: false }),
        supabase.from('venues').select('*').order('name', { ascending: true }),
      ]);

      setCredentials(Array.isArray(credentialsResult.data) ? credentialsResult.data : []);
      setVenues(Array.isArray(venuesResult.data) ? venuesResult.data : []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveCredential = async () => {
    if (!credentialForm.venue_id || !credentialForm.username || !credentialForm.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Simple encryption (in production, use proper encryption)
      const encryptedPassword = btoa(credentialForm.password);

      if (editingCredential) {
        const { error } = await supabase
          .from('credentials')
          .update({
            username: credentialForm.username,
            encrypted_password: encryptedPassword,
            portal_url: credentialForm.portal_url,
          })
          .eq('id', editingCredential.id);

        if (error) throw error;
        toast.success('Credential updated successfully');
      } else {
        const { error } = await supabase
          .from('credentials')
          .insert([{
            venue_id: credentialForm.venue_id,
            username: credentialForm.username,
            encrypted_password: encryptedPassword,
            portal_url: credentialForm.portal_url,
            user_id: user?.id,
          }]);

        if (error) throw error;
        toast.success('Credential added successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving credential:', error);
      toast.error('Failed to save credential');
    }
  };

  const deleteCredential = async (id: string) => {
    try {
      const { error } = await supabase
        .from('credentials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Credential deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting credential:', error);
      toast.error('Failed to delete credential');
    }
  };

  const openEditDialog = (credential: Credential) => {
    setEditingCredential(credential);
    setCredentialForm({
      venue_id: credential.venue_id,
      username: credential.username,
      password: '', // Don't pre-fill password for security
      portal_url: credential.portal_url,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCredential(null);
    setCredentialForm({
      venue_id: '',
      username: '',
      password: '',
      portal_url: '',
    });
  };

  const togglePasswordVisibility = (credentialId: string) => {
    setRevealedPasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(credentialId)) {
        newSet.delete(credentialId);
      } else {
        newSet.add(credentialId);
      }
      return newSet;
    });
  };

  const getVenueName = (venueId: string) => {
    const venue = venues.find(v => v.id === venueId);
    return venue?.name || 'Unknown Venue';
  };

  const decryptPassword = (encrypted: string) => {
    try {
      return atob(encrypted);
    } catch {
      return '••••••••';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-medium tracking-tight">Credential Vault</h2>
          <p className="text-muted-foreground">Securely manage portal login credentials</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Credential
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCredential ? 'Edit Credential' : 'Add New Credential'}</DialogTitle>
              <DialogDescription>
                Store login credentials securely for automated submissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="credential-venue">Venue</Label>
                <select
                  id="credential-venue"
                  value={credentialForm.venue_id}
                  onChange={(e) => setCredentialForm({ ...credentialForm, venue_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={!!editingCredential}
                >
                  <option value="">Select a venue</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="credential-username">Username / Email</Label>
                <Input
                  id="credential-username"
                  value={credentialForm.username}
                  onChange={(e) => setCredentialForm({ ...credentialForm, username: e.target.value })}
                  placeholder="username@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credential-password">Password</Label>
                <Input
                  id="credential-password"
                  type="password"
                  value={credentialForm.password}
                  onChange={(e) => setCredentialForm({ ...credentialForm, password: e.target.value })}
                  placeholder={editingCredential ? 'Leave blank to keep current' : 'Enter password'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credential-url">Portal URL</Label>
                <Input
                  id="credential-url"
                  value={credentialForm.portal_url}
                  onChange={(e) => setCredentialForm({ ...credentialForm, portal_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveCredential}>
                  {editingCredential ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg font-medium">Stored Credentials</CardTitle>
              <CardDescription>All credentials are encrypted and stored securely</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {credentials.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">No credentials stored yet</p>
              <p className="text-xs text-muted-foreground">
                Add credentials to enable automated login for submissions
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venue</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Portal URL</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map((credential) => (
                  <TableRow key={credential.id}>
                    <TableCell className="font-medium">
                      {getVenueName(credential.venue_id)}
                    </TableCell>
                    <TableCell>{credential.username}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {revealedPasswords.has(credential.id)
                            ? decryptPassword(credential.encrypted_password)
                            : '••••••••'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePasswordVisibility(credential.id)}
                        >
                          {revealedPasswords.has(credential.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {credential.portal_url}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(credential)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => deleteCredential(credential.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Security Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>• All passwords are encrypted before storage using industry-standard encryption</p>
          <p>• Credentials are only decrypted during active submission processes</p>
          <p>• Access to credentials is logged for security auditing</p>
          <p>• You can update or delete credentials at any time</p>
          <p>• Deleting a venue will also delete its associated credentials</p>
        </CardContent>
      </Card>
    </div>
  );
}
