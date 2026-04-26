import Dashboard from './pages/Dashboard';
import PaperPage from './pages/PaperPage';
import PaperEditor from './pages/PaperEditor';
import PublicationDashboard from './pages/PublicationDashboard';
// Cleaned up for desktop edition
import SubmissionAgent from './pages/SubmissionAgent';
import CredentialVault from './pages/CredentialVault';
import PaperCreationAgent from './pages/PaperCreationAgent';
import EmailMonitor from './pages/EmailMonitor';
import Login from './pages/Login';
import type { ReactNode } from 'react';

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
        name: 'Dashboard',
        path: '/',
        element: <Dashboard />,
    },
    {
        name: 'Research Papers',
        path: '/papers',
        element: <PaperPage />,
    },
    {
        name: 'Paper Editor',
        path: '/papers/:id',
        element: <PaperEditor />,
    },
    {
        name: 'Paper Creation Agent',
        path: '/paper-creation',
        element: <PaperCreationAgent />,
    },
    {
        name: 'Publication Dashboard',
        path: '/publications',
        element: <PublicationDashboard />,
    },
    {
        name: 'Submission Agent',
        path: '/submission-agent',
        element: <SubmissionAgent />,
    },
    {
        name: 'Credential Vault',
        path: '/credentials',
        element: <CredentialVault />,
    },
    {
        name: 'Email Monitor',
        path: '/email-monitor',
        element: <EmailMonitor />,
    },
];
