import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Layout } from './components/Layout';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { WBSPage } from './pages/WBSPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SCurvePage } from './pages/SCurvePage';
import {
  ProcurementPage,
  SafetyPage,
  AIAssistantPage,
  SettingsPage,
  ResourcesPage
} from './pages/EnterprisePages';
import { DocumentPoolingPage } from './pages/DocumentPoolingPage';

// Guard wrapper redirecting unauthenticated requests
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useStore((state) => state.user);

  // For testing convenience, if no user is set, we bypass or direct to login.
  // We allow bypass if local test environment or direct bypass is preferred.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Dashboard & Workspace control panel routes */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <DashboardPage />
            </AuthGuard>
          }
        />
        <Route
          path="/projects"
          element={
            <AuthGuard>
              <ProjectsPage />
            </AuthGuard>
          }
        />
        <Route
          path="/wbs"
          element={
            <AuthGuard>
              <WBSPage />
            </AuthGuard>
          }
        />
        <Route
          path="/s-curve"
          element={
            <AuthGuard>
              <SCurvePage />
            </AuthGuard>
          }
        />
        <Route
          path="/resources"
          element={
            <AuthGuard>
              <ResourcesPage />
            </AuthGuard>
          }
        />
        <Route
          path="/procurement"
          element={
            <AuthGuard>
              <ProcurementPage />
            </AuthGuard>
          }
        />
        <Route
          path="/pooling-document"
          element={
            <AuthGuard>
              <DocumentPoolingPage />
            </AuthGuard>
          }
        />
        <Route
          path="/safety"
          element={
            <AuthGuard>
              <SafetyPage />
            </AuthGuard>
          }
        />
        <Route
          path="/ai"
          element={
            <AuthGuard>
              <AIAssistantPage />
            </AuthGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <AuthGuard>
              <SettingsPage />
            </AuthGuard>
          }
        />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
export default App;
