import {
  BarChart3,
  Building2,
  FileText,
  GitBranch,
  Globe,
  LayoutDashboard,
  Library,
  LogOut,
  Mail,
  Shield,
  Sparkles,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';

interface MainLayoutProps {
  children: ReactNode;
}

const navigationItems = [
  {
    group: 'Core',
    items: [
      { title: 'Command Centre', url: '/', icon: LayoutDashboard },
      { title: 'Research Papers', url: '/papers', icon: FileText },
      { title: 'Resource Inventory', url: '/resources', icon: Library },
      { title: 'AI Research Agent', url: '/paper-creation', icon: Sparkles },
      { title: 'Venues & Journals', url: '/publications', icon: Building2 },
    ],
  },
  {
    group: 'Smart Allocation',
    items: [
      { title: 'Best Slot to Apply', url: '/optimizer', icon: Zap },
      { title: 'Skill Marketplace', url: '/marketplace', icon: Users },
      { title: 'Research Flow Monitor', url: '/bottleneck', icon: BarChart3 },
      { title: 'Submission Tracker', url: '/submission-agent', icon: GitBranch },
    ],
  },
  {
    group: 'Management',
    items: [
      { title: 'Credential Vault', url: '/credentials', icon: Shield },
      { title: 'Publication Sender Domains', url: '/publication-domains', icon: Globe },
      { title: 'Paper Submitter Helper', url: '/email-monitor', icon: Mail },
    ],
  },
];

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  if (location.pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarContent>
            {navigationItems.map((group) => (
              <SidebarGroup key={group.group}>
                <SidebarGroupLabel
                  className={
                    group.group === 'Core'
                      ? 'text-base font-semibold px-6 py-4'
                      : 'px-6 pt-4 pb-1 text-xs uppercase tracking-widest text-muted-foreground'
                  }
                >
                  {group.group === 'Core' ? 'ResearchFlow' : group.group}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={location.pathname === item.url}
                          className="py-5"
                        >
                          <Link to={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span className="text-sm">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <h1 className="text-lg font-medium">ResearchFlow - AI Publication Workflow</h1>
            </div>
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">Account</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </header>
          <main className="flex-1 p-8">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
