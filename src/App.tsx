import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import PageTracker from './components/PageTracker';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const WelcomePage = lazy(() => import('./pages/WelcomePage'));
const DiagnosisPage = lazy(() => import('./pages/DiagnosisPage'));
const RepairGuidePage = lazy(() => import('./pages/RepairGuidePage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const QuickReportPage = lazy(() => import('./pages/QuickReportPage'));
const WorkerMatchPage = lazy(() => import('./pages/WorkerMatchPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DevicePreview = lazy(() => import('./pages/DevicePreview'));
const EnterpriseDashboard = lazy(() => import('./pages/EnterpriseDashboard'));

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <PageTracker />
        <AuthProvider>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Device Preview — standalone, no auth required */}
              <Route path="/preview" element={<DevicePreview />} />

              {/* Public routes */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/welcome" element={<WelcomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/diagnosis" element={<DiagnosisPage />} />
              <Route path="/repair/:id" element={<RepairGuidePage />} />
              <Route path="/community" element={<CommunityPage />} />

              {/* Protected routes - require authentication */}
              <Route path="/calendar" element={
                <ProtectedRoute>
                  <CalendarPage />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              <Route path="/quick-report" element={
                <ProtectedRoute>
                  <QuickReportPage />
                </ProtectedRoute>
              } />
              <Route path="/match" element={
                <ProtectedRoute>
                  <WorkerMatchPage />
                </ProtectedRoute>
              } />

              {/* Enterprise Routes */}
              <Route path="/enterprise/*" element={
                <ProtectedRoute>
                  <EnterpriseDashboard />
                </ProtectedRoute>
              } />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
