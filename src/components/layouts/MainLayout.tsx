import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, LayoutDashboard, Library, Send, BookOpen, Shield, Activity, ListTodo, Sparkles, Globe, Mail, Users, LogOut, User } from 'lucide-react';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarInset,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MainLayoutProps {
    children: ReactNode;
}

const navigationItems = [
    {
        title: 'Dashboard',
        url: '/',
        icon: LayoutDashboard,
    },
    {
        title: 'Research Papers',
        url: '/papers',
        icon: FileText,
    },
    {
        title: 'Paper Creation Agent',
        url: '/paper-creation',
        icon: Sparkles,
    },
    {
        title: 'Publication Dashboard',
        url: '/publications',
        icon: BookOpen,
    },
    {
        title: 'Resource Inventory',
        url: '/resources',
        icon: Library,
    },
    {
        title: 'Submission Agent',
        url: '/submission-agent',
        icon: Send,
    },
    {
        title: 'Automation Queue',
        url: '/automation-queue',
        icon: ListTodo,
    },
    {
        title: 'Credential Vault',
        url: '/credentials',
        icon: Shield,
    },
    {
        title: 'Activity Log',
        url: '/activity-log',
        icon: Activity,
    },
    {
        title: 'Publication Domains',
        url: '/publication-domains',
        icon: Globe,
    },
    {
        title: 'Email Monitor',
        url: '/email-monitor',
        icon: Mail,
    },
    {
        title: 'AI Assistant',
        url: '/ai-assistant',
        icon: Sparkles,
    },
    {
        title: 'Collaboration Hub',
        url: '/collaboration',
        icon: Users,
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

    // Don't show layout on login page
    if (location.pathname === '/login') {
        return <>{children}</>;
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
                <Sidebar>
                    <SidebarContent>
                        <SidebarGroup>
                            <SidebarGroupLabel className="text-base font-medium px-6 py-6">
                                Research Platform
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {navigationItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={location.pathname === item.url}
                                                className="py-6"
                                            >
                                                <Link to={item.url}>
                                                    <item.icon className="h-5 w-5" />
                                                    <span className="text-sm">{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>
                </Sidebar>
                <SidebarInset className="flex-1">
                    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-6">
                        <div className="flex items-center gap-2">
                            <SidebarTrigger className="-ml-1" />
                            <Separator orientation="vertical" className="mr-2 h-4" />
                            <h1 className="text-lg font-medium">Academic Submission Agent Platform</h1>
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
                                            <p className="text-xs text-muted-foreground truncate">
                                                {user.email}
                                            </p>
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
                    <main className="flex-1 p-8">
                        {children}
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}
