import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary'; // Keeping existing as component-level boundary
import GlobalErrorBoundary from './components/ui/GlobalErrorBoundary'; // New app-level boundary
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import PageTracker from './components/PageTracker';
import SkipLink from './components/ui/SkipLink';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const WelcomePage = lazy(() => import('./pages/WelcomePage'));
const DiagnosisPage = lazy(() => import('./pages/DiagnosisPage'));
const RepairGuidePage = lazy(() => import('./pages/RepairGuidePage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const QuickReportPage = lazy(() => import('./pages/QuickReportPage'));
const WorkerMatchPage = lazy(() => import('./pages/WorkerMatchPage'));
const WorkerJobPage = lazy(() => import('./pages/WorkerJobPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DevicePreview = lazy(() => import('./pages/DevicePreview'));
const EnterpriseDashboard = lazy(() => import('./pages/EnterpriseDashboard'));
const MetricsDashboard = lazy(() => import('./pages/MetricsDashboard'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const PaymentCancelPage = lazy(() => import('./pages/PaymentCancelPage'));

function App() {
  return (
    <GlobalErrorBoundary>
      <ToastProvider>
        <ErrorBoundary>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <PageTracker />
            <SkipLink />
            <AuthProvider>
              <Suspense fallback={<LoadingSpinner />}>
                <div id="main-content" className="min-h-screen outline-none" tabIndex={-1}>
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
                    <Route path="/payment/success" element={<PaymentSuccessPage />} />
                    <Route path="/payment/cancel" element={<PaymentCancelPage />} />

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
                    <Route path="/worker/job/:id" element={
                      <ProtectedRoute>
                        <WorkerJobPage />
                      </ProtectedRoute>
                    } />

                    {/* Admin routes */}
                    <Route path="/metrics" element={
                      <ProtectedRoute>
                        <MetricsDashboard />
                      </ProtectedRoute>
                    } />

                    {/* Enterprise Routes */}
                    <Route path="/enterprise/*" element={
                      <ProtectedRoute>
                        <EnterpriseDashboard />
                      </ProtectedRoute>
                    } />
                  </Routes>
                </div>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </ToastProvider>
    </GlobalErrorBoundary>
  );
}

export default App;

