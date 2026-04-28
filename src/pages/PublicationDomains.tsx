import { motion } from 'framer-motion';
import { Edit, Globe, Loader2, Mail, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import type { PublicationDomain } from '@/types/types';

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
  },
};

export default function PublicationDomains() {
  const [domains, setDomains] = useState<PublicationDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [domainForm, setDomainForm] = useState({
    name: '',
    domain: '',
    website_url: '',
    official_emails: [] as string[],
  });
  const [extractedEmails, setExtractedEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    try {
      const { data, error } = await supabase
        .from('publication_domains')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDomains(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading domains:', error);
      toast.error('Failed to load publication domains');
    } finally {
      setLoading(false);
    }
  };

  const handleExtractEmails = async () => {
    if (!domainForm.website_url) {
      toast.error('Please enter a website URL');
      return;
    }

    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-emails', {
        body: { websiteUrl: domainForm.website_url },
      });

      if (error) throw error;

      if (data.success && data.emails.length > 0) {
        setExtractedEmails(data.emails);
        toast.success(`Found ${data.emails.length} email addresses`);
      } else {
        toast.warning('No email addresses found. You can add them manually.');
      }
    } catch (error) {
      console.error('Error extracting emails:', error);
      toast.error('Failed to extract email addresses');
    } finally {
      setExtracting(false);
    }
  };

  const handleAddEmail = () => {
    if (emailInput && !domainForm.official_emails.includes(emailInput)) {
      setDomainForm({
        ...domainForm,
        official_emails: [...domainForm.official_emails, emailInput],
      });
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setDomainForm({
      ...domainForm,
      official_emails: domainForm.official_emails.filter(e => e !== email),
    });
  };

  const handleSelectExtractedEmail = (email: string) => {
    if (!domainForm.official_emails.includes(email)) {
      setDomainForm({
        ...domainForm,
        official_emails: [...domainForm.official_emails, email],
      });
    }
  };

  const handleSaveDomain = async () => {
    if (!domainForm.name || !domainForm.domain) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('publication_domains')
        .insert({
          name: domainForm.name,
          domain: domainForm.domain,
          website_url: domainForm.website_url || null,
          official_emails: domainForm.official_emails,
        });

      if (error) throw error;

      toast.success('Publication domain added successfully');
      setIsDialogOpen(false);
      setDomainForm({ name: '', domain: '', website_url: '', official_emails: [] });
      setExtractedEmails([]);
      loadDomains();
    } catch (error) {
      console.error('Error saving domain:', error);
      toast.error('Failed to save publication domain');
    }
  };

  const handleDeleteDomain = async (id: string) => {
    try {
      const { error } = await supabase
        .from('publication_domains')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Publication domain deleted');
      loadDomains();
    } catch (error) {
      console.error('Error deleting domain:', error);
      toast.error('Failed to delete publication domain');
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-48" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-medium tracking-tight">Publication Sender Domains</h2>
          <p className="text-muted-foreground">
            Configure the sender domains and official publication emails the monitoring agent should look for in the researcher's mailbox.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Domain
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Publication Sender Domain</DialogTitle>
              <DialogDescription>
                Add the publication's sender domain and the official email addresses that usually send submission updates.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Publication Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., IEEE Transactions on Software Engineering"
                  value={domainForm.name}
                  onChange={(e) => setDomainForm({ ...domainForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="domain">Sender Domain *</Label>
                <Input
                  id="domain"
                  placeholder="e.g., ieee.org"
                  value={domainForm.domain}
                  onChange={(e) => setDomainForm({ ...domainForm, domain: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website_url">Website URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="website_url"
                    placeholder="https://www.ieee.org/contact"
                    value={domainForm.website_url}
                    onChange={(e) => setDomainForm({ ...domainForm, website_url: e.target.value })}
                  />
                  <Button
                    onClick={handleExtractEmails}
                    disabled={extracting || !domainForm.website_url}
                  >
                    {extracting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      'Extract Emails'
                    )}
                  </Button>
                </div>
              </div>

              {extractedEmails.length > 0 && (
                <div className="space-y-2">
                  <Label>Extracted Email Addresses</Label>
                  <div className="flex flex-wrap gap-2">
                    {extractedEmails.map((email) => (
                      <Badge
                        key={email}
                        variant={domainForm.official_emails.includes(email) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => handleSelectExtractedEmail(email)}
                      >
                        {email}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Click on an email to add it to the official list
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Official Sender Email Addresses</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="editor@journal.org"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                  />
                  <Button onClick={handleAddEmail}>Add</Button>
                </div>
                {domainForm.official_emails.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {domainForm.official_emails.map((email) => (
                      <Badge key={email} variant="secondary">
                        {email}
                        <button
                          onClick={() => handleRemoveEmail(email)}
                          className="ml-2 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveDomain}>Save Domain</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {domains.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Globe className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No publication domains yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add the sender domains and official publication emails you want the monitoring agent to detect in the researcher's mailbox.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Domain
            </Button>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
        >
          {domains.map((domain) => (
            <motion.div key={domain.id} variants={itemVariants}>
              <Card className="hover-lift">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDomain(domain.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="text-lg">{domain.name}</CardTitle>
                  <CardDescription>{domain.domain}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {domain.website_url && (
                    <div className="text-sm">
                      <a
                        href={domain.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Visit Website →
                      </a>
                    </div>
                  )}
                  
                  {domain.official_emails.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{domain.official_emails.length} email(s)</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {domain.official_emails.slice(0, 2).map((email) => (
                          <Badge key={email} variant="outline" className="text-xs">
                            {email}
                          </Badge>
                        ))}
                        {domain.official_emails.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{domain.official_emails.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <Badge variant={domain.is_active ? 'default' : 'secondary'}>
                    {domain.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
