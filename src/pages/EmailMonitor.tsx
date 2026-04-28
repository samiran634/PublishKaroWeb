import { motion } from 'framer-motion';
import {
  AlertCircle,
  BellRing,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Globe,
  Inbox,
  Mail,
  MessageSquare,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { classifyEmailAlert, type EmailAlertInsight, getEmailPriorityRank } from '@/lib/email-monitoring';
import type { EmailStatusWithDomain, PublicationDomain } from '@/types/types';

interface EmailStatusWithInsight extends EmailStatusWithDomain {
  insight: EmailAlertInsight;
}

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

function getPriorityClasses(priority: EmailAlertInsight['priority']) {
  if (priority === 'urgent') return 'border-red-200 bg-red-50 text-red-700';
  if (priority === 'high') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function getInsightIcon(insight: EmailAlertInsight) {
  switch (insight.kind) {
    case 'acceptance':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'rejection':
      return <XCircle className="h-5 w-5 text-destructive" />;
    case 'reviewer_comments':
      return <MessageSquare className="h-5 w-5 text-blue-500" />;
    case 'revision_request':
      return <AlertCircle className="h-5 w-5 text-amber-500" />;
    case 'camera_ready_deadline':
      return <Calendar className="h-5 w-5 text-red-500" />;
    case 'submission_confirmation':
      return <Send className="h-5 w-5 text-sky-500" />;
    default:
      return <Mail className="h-5 w-5 text-muted-foreground" />;
  }
}

export default function EmailMonitor() {
  const [emailStatuses, setEmailStatuses] = useState<EmailStatusWithDomain[]>([]);
  const [domains, setDomains] = useState<PublicationDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningDomainId, setScanningDomainId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: domainsData, error: domainsError } = await supabase
        .from('publication_domains')
        .select('*')
        .eq('is_active', true);

      if (domainsError) throw domainsError;
      setDomains(Array.isArray(domainsData) ? domainsData : []);

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
      console.error('Email monitor load error:', error);
      toast.error('Failed to load email monitoring data.');
    } finally {
      setLoading(false);
    }
  };

  const handleScanEmails = async (domainId: string) => {
    setScanningDomainId(domainId);
    try {
      const { data, error } = await supabase.functions.invoke('scan-emails', {
        body: { publicationDomainId: domainId },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Scanned ${data.emailsProcessed} emails.`);
        await loadData();
      } else {
        toast.error(data.error || 'Failed to scan emails.');
      }
    } catch (error) {
      console.error('Scan emails error:', error);
      toast.error('Failed to scan emails.');
    } finally {
      setScanningDomainId(null);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const { error } = await supabase.from('email_statuses').update({ is_new: false }).eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Mark as read error:', error);
      toast.error('Failed to update the email status.');
    }
  };

  const enrichedStatuses = useMemo(
    () =>
      emailStatuses
        .map((status) => ({
          ...status,
          insight: classifyEmailAlert(status),
        }))
        .sort((left, right) => {
          const priorityDelta =
            getEmailPriorityRank(right.insight.priority) - getEmailPriorityRank(left.insight.priority);
          if (priorityDelta !== 0) return priorityDelta;
          if (left.is_new !== right.is_new) return left.is_new ? -1 : 1;
          return new Date(right.received_date).getTime() - new Date(left.received_date).getTime();
        }),
    [emailStatuses]
  );

  const urgentAlerts = enrichedStatuses.filter(
    (status) => status.is_new && status.insight.priority === 'urgent'
  );
  const actionRequiredAlerts = enrichedStatuses.filter(
    (status) => status.is_new && status.insight.actionRequired
  );
  const decisionAlerts = enrichedStatuses.filter(
    (status) => status.insight.kind === 'acceptance' || status.insight.kind === 'rejection'
  );
  const priorityAlerts = enrichedStatuses.filter(
    (status) => status.is_new && getEmailPriorityRank(status.insight.priority) >= 2
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-5 w-[32rem]" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div className="space-y-8" initial="hidden" animate="visible" variants={containerVariants}>
      <motion.div variants={itemVariants} className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-medium tracking-tight">Paper Submitter Helper</h2>
          <p className="text-muted-foreground">
            Email Monitoring Agent for submission confirmations, reviewer comments, revision requests,
            decisions, and camera-ready deadlines.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/publication-domains">
              <Globe className="mr-2 h-4 w-4" />
              Configure sender domains
            </Link>
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-none hover-lift hover-glow">
          <CardContent className="pt-6 space-y-1">
            <p className={`text-4xl font-light ${urgentAlerts.length > 0 ? 'fit-low' : 'fit-high'}`}>
              {urgentAlerts.length}
            </p>
            <p className="text-sm text-muted-foreground">Urgent publication alerts</p>
            <p className="text-xs text-muted-foreground">Camera-ready or revision requests needing action</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none hover-lift hover-glow">
          <CardContent className="pt-6 space-y-1">
            <p className={`text-4xl font-light ${actionRequiredAlerts.length > 0 ? 'fit-mid' : 'fit-high'}`}>
              {actionRequiredAlerts.length}
            </p>
            <p className="text-sm text-muted-foreground">Action-required emails</p>
            <p className="text-xs text-muted-foreground">Reviewer comments, revisions, and deadlines</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none hover-lift hover-glow">
          <CardContent className="pt-6 space-y-1">
            <p className="text-4xl font-light">{decisionAlerts.length}</p>
            <p className="text-sm text-muted-foreground">Acceptance or rejection updates</p>
            <p className="text-xs text-muted-foreground">Decisions already captured in the dashboard</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none hover-lift hover-glow">
          <CardContent className="pt-6 space-y-1">
            <p className="text-4xl font-light">{domains.length}</p>
            <p className="text-sm text-muted-foreground">Monitored publication domains</p>
            <p className="text-xs text-muted-foreground">Active journal and conference sources</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-sky-500" />
              Monitoring setup
            </CardTitle>
            <CardDescription>
              The monitoring agent is meant to watch the researcher's mailbox for messages sent from configured publication sender domains and official publication email addresses.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1.5fr,1fr]">
            <div className="space-y-3 rounded-lg border p-4">
              <p className="font-medium">How this works</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. Add the publication sender domain, like <span className="font-medium text-foreground">ieee.org</span>.</p>
                <p>2. Add known sender emails, like editorial or manuscript-tracking addresses.</p>
                <p>3. The email agent uses those senders to identify publication updates inside the researcher's mailbox.</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/publication-domains">
                  Open sender-domain setup
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <p className="font-medium">Configured publication senders</p>
              {domains.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sender domains have been configured yet.</p>
              ) : (
                <div className="space-y-2">
                  {domains.slice(0, 4).map((domain) => (
                    <div key={domain.id} className="rounded-md bg-muted/40 p-3">
                      <p className="text-sm font-medium">{domain.name}</p>
                      <p className="text-xs text-muted-foreground">{domain.domain}</p>
                      <p className="text-xs text-muted-foreground">
                        {domain.official_emails.length} official sender email{domain.official_emails.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  ))}
                  {domains.length > 4 && (
                    <p className="text-xs text-muted-foreground">+{domains.length - 4} more configured sender domains</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {domains.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Inbox className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No publication domains configured</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add publication domains to start monitoring journal and conference emails.
            </p>
            <Button asChild>
              <Link to="/publication-domains">
                <Globe className="mr-2 h-4 w-4" />
                Configure sender domains
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {domains.map((domain) => {
              const domainStatuses = enrichedStatuses.filter(
                (status) => status.publication_domain_id === domain.id
              );
              const latestStatus = domainStatuses[0];
              const newCount = domainStatuses.filter((status) => status.is_new).length;

              return (
                <motion.div key={domain.id} variants={itemVariants}>
                  <Card className="hover-lift">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
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
                            {getInsightIcon(latestStatus.insight)}
                            <Badge className={getPriorityClasses(latestStatus.insight.priority)} variant="outline">
                              {latestStatus.insight.label}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Last update: {new Date(latestStatus.received_date).toLocaleDateString()}</p>
                            <p>{latestStatus.subject}</p>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground">No tracked emails found yet.</div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleScanEmails(domain.id)}
                        disabled={scanningDomainId === domain.id}
                      >
                        <RefreshCw
                          className={`mr-2 h-4 w-4 ${scanningDomainId === domain.id ? 'animate-spin' : ''}`}
                        />
                        Scan now
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <BellRing className="h-5 w-5 text-amber-500" />
                  Priority alerts
                </CardTitle>
                <CardDescription>
                  Important publication messages surfaced before they disappear into email clutter.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {priorityAlerts.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    No urgent or high-priority unread alerts right now.
                  </div>
                ) : (
                  priorityAlerts.map((status) => (
                    <div key={status.id} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {getInsightIcon(status.insight)}
                            <p className="font-medium">{status.publication_domain?.name ?? 'Publication update'}</p>
                            <Badge className={getPriorityClasses(status.insight.priority)} variant="outline">
                              {status.insight.label}
                            </Badge>
                            {status.is_new && <Badge variant="destructive">New</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{status.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            Received {new Date(status.received_date).toLocaleString()}
                          </p>
                          {status.email_snippet && (
                            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                              {status.email_snippet}
                            </div>
                          )}
                        </div>
                        {status.is_new && (
                          <Button variant="outline" size="sm" onClick={() => handleMarkAsRead(status.id)}>
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          {enrichedStatuses.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-4">
              <h3 className="text-xl font-medium">Recent email updates</h3>
              <motion.div className="space-y-4" variants={containerVariants}>
                {enrichedStatuses.map((status) => (
                  <motion.div key={status.id} variants={itemVariants}>
                    <Card className={status.is_new ? 'border-primary' : ''}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              {getInsightIcon(status.insight)}
                              <CardTitle className="text-base">
                                {status.publication_domain?.name ?? 'Publication update'}
                              </CardTitle>
                              {status.is_new && (
                                <Badge variant="destructive" className="text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                            <CardDescription>{status.subject}</CardDescription>
                          </div>
                          <Badge className={getPriorityClasses(status.insight.priority)} variant="outline">
                            {status.insight.label}
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
                          <div className="text-sm bg-muted p-3 rounded-md">{status.email_snippet}</div>
                        )}
                        {status.is_new && (
                          <Button variant="outline" size="sm" onClick={() => handleMarkAsRead(status.id)}>
                            Mark as read
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
