import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import type { EmailStatusWithDomain, PublicationDomain } from '@/types/types';

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
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export default function EmailMonitor() {
  const [emailStatuses, setEmailStatuses] = useState<EmailStatusWithDomain[]>([]);
  const [domains, setDomains] = useState<PublicationDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load domains
      const { data: domainsData, error: domainsError } = await supabase
        .from('publication_domains')
        .select('*')
        .eq('is_active', true);

      if (domainsError) throw domainsError;
      setDomains(Array.isArray(domainsData) ? domainsData : []);

      // Load email statuses
      const { data: statusesData, error: statusesError } = await supabase
        .from('email_statuses')
        .select(`
          *,
          publication_domain:publication_domains(*)
        `)
        .order('received_date', { ascending: false });

      if (statusesError) throw statusesError;
      setEmailStatuses(Array.isArray(statusesData) ? statusesData : []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load email monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const handleScanEmails = async (domainId: string) => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('scan-emails', {
        body: { publicationDomainId: domainId },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Scanned ${data.emailsProcessed} emails`);
        loadData();
      } else {
        toast.error(data.error || 'Failed to scan emails');
      }
    } catch (error) {
      console.error('Error scanning emails:', error);
      toast.error('Failed to scan emails');
    } finally {
      setScanning(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_statuses')
        .update({ is_new: false })
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const getStatusIcon = (status: string | null) => {
    if (!status) return <Mail className="h-5 w-5 text-muted-foreground" />;
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('accept')) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    } else if (statusLower.includes('reject')) {
      return <XCircle className="h-5 w-5 text-destructive" />;
    } else if (statusLower.includes('review')) {
      return <Clock className="h-5 w-5 text-blue-500" />;
    } else if (statusLower.includes('revision')) {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
    return <Mail className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusBadgeVariant = (status: string | null): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (!status) return 'outline';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('accept')) return 'default';
    if (statusLower.includes('reject')) return 'destructive';
    if (statusLower.includes('review')) return 'secondary';
    return 'outline';
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
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
      <div className="space-y-2">
        <h2 className="text-3xl font-medium tracking-tight">Email Monitor</h2>
        <p className="text-muted-foreground">
          Track submission status updates from publication domains
        </p>
      </div>

      {domains.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Inbox className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No publication domains configured</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add publication domains to start monitoring email statuses
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {domains.map((domain) => {
              const domainStatuses = emailStatuses.filter(
                (s) => s.publication_domain_id === domain.id
              );
              const latestStatus = domainStatuses[0];
              const newCount = domainStatuses.filter((s) => s.is_new).length;

              return (
                <motion.div key={domain.id} variants={itemVariants}>
                  <Card className="hover-lift">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{domain.name}</CardTitle>
                          <CardDescription>{domain.domain}</CardDescription>
                        </div>
                        {newCount > 0 && (
                          <Badge variant="destructive" className="animate-pulse">
                            {newCount} new
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {latestStatus ? (
                        <>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(latestStatus.inferred_status)}
                            <Badge variant={getStatusBadgeVariant(latestStatus.inferred_status)}>
                              {latestStatus.inferred_status || 'Unknown'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Last update: {new Date(latestStatus.received_date).toLocaleDateString()}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No emails found yet
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleScanEmails(domain.id)}
                        disabled={scanning}
                      >
                        <RefreshCw className={`mr-2 h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
                        Scan Now
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {emailStatuses.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-medium">Recent Email Updates</h3>
              <motion.div className="space-y-4" variants={containerVariants}>
                {emailStatuses.map((status) => (
                  <motion.div key={status.id} variants={itemVariants}>
                    <Card className={status.is_new ? 'border-primary' : ''}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(status.inferred_status)}
                              <CardTitle className="text-base">
                                {status.publication_domain?.name}
                              </CardTitle>
                              {status.is_new && (
                                <Badge variant="destructive" className="text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                            <CardDescription>{status.subject}</CardDescription>
                          </div>
                          <Badge variant={getStatusBadgeVariant(status.inferred_status)}>
                            {status.inferred_status || 'Unknown'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-sm">
                          <p className="text-muted-foreground mb-1">From: {status.sender}</p>
                          <p className="text-muted-foreground">
                            Received: {new Date(status.received_date).toLocaleString()}
                          </p>
                        </div>
                        {status.email_snippet && (
                          <div className="text-sm bg-muted p-3 rounded-md">
                            {status.email_snippet}...
                          </div>
                        )}
                        {status.is_new && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsRead(status.id)}
                          >
                            Mark as Read
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
