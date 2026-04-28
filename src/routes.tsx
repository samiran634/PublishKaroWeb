import type { ReactNode } from 'react';
import BottleneckMonitor from './pages/BottleneckMonitor';
import CredentialVault from './pages/CredentialVault';
import Dashboard from './pages/Dashboard';
import EmailMonitor from './pages/EmailMonitor';
import Login from './pages/Login';
import PaperCreationAgent from './pages/PaperCreationAgent';
import PaperEditor from './pages/PaperEditor';
import PaperPage from './pages/PaperPage';
import PublicationDashboard from './pages/PublicationDashboard';
import PublicationDomains from './pages/PublicationDomains';
import ResourceInventory from './pages/Resourceinventory';
import SkillMarketplace from './pages/SkillMarketplace';
import SubmissionAgent from './pages/SubmissionAgent';
import SubmissionOptimizer from './pages/SubmissionOptimizer';

export interface RouteConfig {
    name: string;
    path: string;
    element: ReactNode;
    visible?: boolean;
    /** Accessible without login. Routes without this flag require authentication. Has no effect when RouteGuard is not in use. */
    public?: boolean;
}

export const routes: RouteConfig[] = [
    {
        name: 'Login',
        path: '/login',
        element: <Login />,
        public: true,
    },
    {
        name: 'Command Centre',
        path: '/',
        element: <Dashboard />,
    },
    {
        name: 'Research Papers',
        path: '/papers',
        element: <PaperPage />,
    },
    {
        name: 'Resource Inventory',
        path: '/resources',
        element: <ResourceInventory />,
    },
    {
        name: 'Paper Editor',
        path: '/papers/:id',
        element: <PaperEditor />,
    },
    {
        name: 'AI Research Agent',
        path: '/paper-creation',
        element: <PaperCreationAgent />,
    },
    {
        name: 'Venues & Journals',
        path: '/publications',
        element: <PublicationDashboard />,
    },
    {
        name: 'Submission Tracker',
        path: '/submission-agent',
        element: <SubmissionAgent />,
    },
    {
        name: 'Credential Vault',
        path: '/credentials',
        element: <CredentialVault />,
    },
    {
        name: 'Publication Sender Domains',
        path: '/publication-domains',
        element: <PublicationDomains />,
    },
    {
        name: 'Paper Submitter Helper',
        path: '/email-monitor',
        element: <EmailMonitor />,
    },
    // ── Smart Allocation Routes ──────────────────────────
    {
        name: 'Best Slot to Apply',
        path: '/optimizer',
        element: <SubmissionOptimizer />,
    },
    {
        name: 'Skill Marketplace',
        path: '/marketplace',
        element: <SkillMarketplace />,
    },
    {
        name: 'Research Flow Monitor',
        path: '/bottleneck',
        element: <BottleneckMonitor />,
    },
];
