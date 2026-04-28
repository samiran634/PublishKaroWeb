import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserveer';
import { Toaster } from '@/components/ui/sonner';
import { MainLayout } from '@/components/layouts/MainLayout';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { RouteGuard } from '@/components/common/RouteGuard';

import { routes } from './routes';

const App: React.FC = () => {
    return (
        <Router>
            <AuthProvider>
                <NotificationProvider>
                    <RouteGuard>
                        <IntersectObserver />
                        <MainLayout>
                            <Routes>
                                {routes.map((route, index) => (
                                    <Route
                                        key={index}
                                        path={route.path}
                                        element={route.element}
                                    />
                                ))}
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </MainLayout>
                        <Toaster />
                    </RouteGuard>
                </NotificationProvider>
            </AuthProvider>
        </Router>
    );
};

export default App;