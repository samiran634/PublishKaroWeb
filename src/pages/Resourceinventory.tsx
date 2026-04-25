import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, FileText, Database, Code, StickyNote, File, ExternalLink, Trash2, Library } from 'lucide-react';
import { toast } from 'sonner';
import type { Resource, ResourceType } from '@/types/types';

const resourceIcons: Record<ResourceType, typeof FileText> = {
  Reference: FileText,
  Dataset: Database,
  Code: Code,
  Note: StickyNote,
  Document: File,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
    },
  },
};

export default function ResourceInventory() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resourceForm, setResourceForm] = useState({
    name: '',
    type: 'Reference' as ResourceType,
    description: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  useEffect(() => {
    loadResources();
  }, []);

  useEffect(() => {
    filterResources();
  }, [resources, searchQuery, typeFilter]);

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

  const filterResources = () => {
    let filtered = resources;

    if (searchQuery) {
      filtered = filtered.filter(resource =>
        resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(resource => resource.type === typeFilter);
    }

    setFilteredResources(filtered);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const saveResource = async () => {
    if (!resourceForm.name.trim()) {
      toast.error('Please enter a resource name');
      return;
    }

    setUploading(true);
    try {
      let fileUrl = null;

      if (fileToUpload) {
        fileUrl = await uploadFile(fileToUpload);
        if (!fileUrl) {
          toast.error('Failed to upload file');
          setUploading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('resources')
        .insert([{
          name: resourceForm.name,
          type: resourceForm.type,
          description: resourceForm.description || null,
          tags: resourceForm.tags.length > 0 ? resourceForm.tags : null,
          file_url: fileUrl,
        }]);

      if (error) throw error;

      toast.success('Resource added successfully');
      setIsDialogOpen(false);
      resetForm();
      loadResources();
    } catch (error) {
      console.error('Error saving resource:', error);
      toast.error('Failed to save resource');
    } finally {
      setUploading(false);
    }
  };

  const deleteResource = async (id: string, fileUrl: string | null) => {
    try {
      if (fileUrl) {
        const fileName = fileUrl.split('/').pop();
        if (fileName) {
          await supabase.storage.from('resources').remove([fileName]);
        }
      }

      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Resource deleted successfully');
      loadResources();
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast.error('Failed to delete resource');
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !resourceForm.tags.includes(tagInput.trim())) {
      setResourceForm({
        ...resourceForm,
        tags: [...resourceForm.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setResourceForm({
      ...resourceForm,
      tags: resourceForm.tags.filter(t => t !== tag),
    });
  };

  const resetForm = () => {
    setResourceForm({
      name: '',
      type: 'Reference',
      description: '',
      tags: [],
    });
    setTagInput('');
    setFileToUpload(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-medium tracking-tight">Resource Inventory</h2>
          <p className="text-muted-foreground">Organize and manage your research resources</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Resource
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Resource</DialogTitle>
              <DialogDescription>
                Upload and organize research materials
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resource-name">Name</Label>
                <Input
                  id="resource-name"
                  value={resourceForm.name}
                  onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })}
                  placeholder="Resource name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resource-type">Type</Label>
                <Select
                  value={resourceForm.type}
                  onValueChange={(value) => setResourceForm({ ...resourceForm, type: value as ResourceType })}
                >
                  <SelectTrigger id="resource-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Reference">Reference</SelectItem>
                    <SelectItem value="Dataset">Dataset</SelectItem>
                    <SelectItem value="Code">Code</SelectItem>
                    <SelectItem value="Note">Note</SelectItem>
                    <SelectItem value="Document">Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resource-description">Description</Label>
                <Textarea
                  id="resource-description"
                  value={resourceForm.description}
                  onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                  placeholder="Brief description"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add tag"
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {resourceForm.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resource-file">File (optional)</Label>
                <Input
                  id="resource-file"
                  type="file"
                  onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveResource} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Add Resource'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Reference">Reference</SelectItem>
            <SelectItem value="Dataset">Dataset</SelectItem>
            <SelectItem value="Code">Code</SelectItem>
            <SelectItem value="Note">Note</SelectItem>
            <SelectItem value="Document">Document</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredResources.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Library className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No resources found</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {resources.length === 0
                ? 'Start building your research library'
                : 'Try adjusting your search or filter criteria'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((resource) => {
            const Icon = resourceIcons[resource.type];
            return (
              <Card key={resource.id}>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <Badge variant="secondary">{resource.type}</Badge>
                  </div>
                  <CardTitle className="text-lg font-medium">{resource.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {resource.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {resource.tags && resource.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {resource.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      {resource.file_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => deleteResource(resource.id, resource.file_url)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
