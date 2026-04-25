import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FloatingShapes } from '@/components/ui/floating-shapes';
import { FileText, BookOpen, Library, Send, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import type { Paper, Submission } from '@/types/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
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

export default function Dashboard() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [papersResult, submissionsResult, resourcesResult] = await Promise.all([
        supabase.from('papers').select('*'),
        supabase.from('submissions').select('*'),
        supabase.from('resources').select('*'),
      ]);

      setPapers(Array.isArray(papersResult.data) ? papersResult.data : []);
      setSubmissions(Array.isArray(submissionsResult.data) ? submissionsResult.data : []);
      setResources(Array.isArray(resourcesResult.data) ? resourcesResult.data : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Only count confirmed submissions (status = 'Submitted' or beyond)
  const confirmedSubmissions = submissions.filter(s => 
    s.status === 'Submitted' || 
    s.status === 'Under Review' || 
    s.status === 'Accepted' || 
    s.status === 'Rejected'
  );

  const acceptedPapers = submissions.filter(s => s.status === 'Accepted');
  const underReview = submissions.filter(s => s.status === 'Under Review');

  if (loading) {
    return (
      <>
        <FloatingShapes />
        <div className="space-y-16">
          <div>
            <Skeleton className="h-10 w-64 mb-3" />
            <Skeleton className="h-6 w-96" />
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-0 shadow-none">
                <CardHeader className="pb-4">
                  <Skeleton className="h-8 w-8" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-12 w-20" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-8">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-0 shadow-none">
                  <CardContent className="pt-8 pb-8 space-y-4">
                    <Skeleton className="h-10 w-10" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <FloatingShapes />
      <motion.div
        className="space-y-16"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
      <motion.div variants={itemVariants}>
        <h2 className="text-4xl font-light tracking-tight mb-3">Dashboard</h2>
        <p className="text-muted-foreground text-lg">Overview of your research workflow</p>
      </motion.div>

      <motion.div
        className="grid gap-8 md:grid-cols-2 lg:grid-cols-4"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-none hover-lift hover-glow group">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <FileText className="h-8 w-8 text-muted-foreground animate-float" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <CardTitle className="text-5xl font-light">
                <AnimatedCounter value={papers.length} />
              </CardTitle>
              <p className="text-sm text-muted-foreground">Research Papers</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-none hover-lift hover-glow group">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground animate-float" style={{ animationDelay: '0.5s' }} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <CardTitle className="text-5xl font-light">
                <AnimatedCounter value={confirmedSubmissions.length} />
              </CardTitle>
              <p className="text-sm text-muted-foreground">Confirmed Submissions</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-none hover-lift hover-glow group">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <Clock className="h-8 w-8 text-muted-foreground animate-float" style={{ animationDelay: '1s' }} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <CardTitle className="text-5xl font-light">
                <AnimatedCounter value={underReview.length} />
              </CardTitle>
              <p className="text-sm text-muted-foreground">Under Review</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-none hover-lift hover-glow group">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <AlertCircle className="h-8 w-8 text-muted-foreground animate-float" style={{ animationDelay: '1.5s' }} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <CardTitle className="text-5xl font-light">
                <AnimatedCounter value={acceptedPapers.length} />
              </CardTitle>
              <p className="text-sm text-muted-foreground">Accepted Papers</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div className="space-y-8" variants={itemVariants}>
        <h3 className="text-2xl font-light">Quick Actions</h3>
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/papers">
              <Card className="border-0 shadow-none hover:bg-muted/50 transition-colors cursor-pointer hover-glow">
                <CardContent className="pt-8 pb-8 space-y-4">
                  <FileText className="h-10 w-10 text-muted-foreground animate-glow" />
                  <div>
                    <p className="font-medium mb-1">Manage Papers</p>
                    <p className="text-sm text-muted-foreground">View and edit your research papers</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/paper-creation">
              <Card className="border-0 shadow-none hover:bg-muted/50 transition-colors cursor-pointer hover-glow">
                <CardContent className="pt-8 pb-8 space-y-4">
                  <Send className="h-10 w-10 text-muted-foreground animate-glow" style={{ animationDelay: '0.3s' }} />
                  <div>
                    <p className="font-medium mb-1">Create Paper</p>
                    <p className="text-sm text-muted-foreground">Generate paper from resources</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/submission-agent">
              <Card className="border-0 shadow-none hover:bg-muted/50 transition-colors cursor-pointer hover-glow">
                <CardContent className="pt-8 pb-8 space-y-4">
                  <BookOpen className="h-10 w-10 text-muted-foreground animate-glow" style={{ animationDelay: '0.6s' }} />
                  <div>
                    <p className="font-medium mb-1">Submit Paper</p>
                    <p className="text-sm text-muted-foreground">Automated submission workflow</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/resources">
              <Card className="border-0 shadow-none hover:bg-muted/50 transition-colors cursor-pointer hover-glow">
                <CardContent className="pt-8 pb-8 space-y-4">
                  <Library className="h-10 w-10 text-muted-foreground animate-glow" style={{ animationDelay: '0.9s' }} />
                  <div>
                    <p className="font-medium mb-1">Resources</p>
                    <p className="text-sm text-muted-foreground">Manage your research inventory</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>

      {papers.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="border-0 shadow-none bg-muted/30 hover-lift">
            <CardContent className="py-16 text-center space-y-6">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
              </motion.div>
              <div className="space-y-3">
                <h3 className="text-xl font-medium">Get Started</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Create your first research paper or use the AI agent to generate one from your resources
                </p>
              </div>
              <div className="flex gap-4 justify-center">
                <Link to="/papers">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="outline" size="lg">Create Paper</Button>
                  </motion.div>
                </Link>
                <Link to="/paper-creation">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg">Use AI Agent</Button>
                  </motion.div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
    </>
  );
}
