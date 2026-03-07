import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalErrorBoundary from './components/ui/GlobalErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import PageTracker from './components/PageTracker';
import SkipLink from './components/ui/SkipLink';
import { initAgenticStack } from './agenticInit';
import { useEffect } from 'react';



/* ─── Lazy-loaded Pages (core consumer flow only) ─── */
const OnboardingGate = lazy(() => import('./components/OnboardingGate'));
const WelcomePage = lazy(() => import('./pages/WelcomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DiagnosisPage = lazy(() => import('./pages/DiagnosisPage'));
const MyCasesPage = lazy(() => import('./pages/MyCasesPage'));
const CaseLibraryPage = lazy(() => import('./pages/CaseLibraryPage'));
const ShowcasePage = lazy(() => import('./pages/ShowcasePage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const PaymentCancelPage = lazy(() => import('./pages/PaymentCancelPage'));
const OmnichannelSim = lazy(() => import('./pages/OmnichannelSim'));
const MetricsDashboard = lazy(() => import('./pages/MetricsDashboard'));
const WorkerDashboardPage = lazy(() => import('./pages/WorkerDashboardPage'));
const WorkerJobPage = lazy(() => import('./pages/WorkerJobPage'));
const WorkerMatchPage = lazy(() => import('./pages/WorkerMatchPage'));
const WorkerRegistrationPage = lazy(() => import('./pages/WorkerRegistrationPage'));
const RepairGuidePage = lazy(() => import('./pages/RepairGuidePage'));
const JobReviewPage = lazy(() => import('./pages/JobReviewPage'));

function App() {
  useEffect(() => {
    initAgenticStack();
  }, []);


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
                    {/* Public routes */}
                    <Route path="/" element={<OnboardingGate />} />
                    <Route path="/welcome" element={<WelcomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/payment/success" element={<PaymentSuccessPage />} />
                    <Route path="/payment/cancel" element={<PaymentCancelPage />} />

                    {/* Protected routes */}
                    <Route path="/diagnosis" element={<ProtectedRoute><DiagnosisPage /></ProtectedRoute>} />
                    <Route path="/cases" element={<ProtectedRoute><MyCasesPage /></ProtectedRoute>} />
                    <Route path="/library" element={<ProtectedRoute><CaseLibraryPage /></ProtectedRoute>} />
                    <Route path="/showcase" element={<ProtectedRoute><ShowcasePage /></ProtectedRoute>} />
                    <Route path="/omnichannel-sim" element={<ProtectedRoute><OmnichannelSim /></ProtectedRoute>} />
                    <Route path="/metrics" element={<ProtectedRoute><MetricsDashboard /></ProtectedRoute>} />

                    {/* Protected routes */}
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
                    <Route path="/notifications" element={
                      <ProtectedRoute>
                        <NotificationsPage />
                      </ProtectedRoute>
                    } />

                    {/* Worker routes */}
                    <Route path="/worker/dashboard" element={
                      <ProtectedRoute>
                        <WorkerDashboardPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/worker/job/:id" element={
                      <ProtectedRoute>
                        <WorkerJobPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/worker/match" element={
                      <ProtectedRoute>
                        <WorkerMatchPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/worker/register" element={
                      <ProtectedRoute>
                        <WorkerRegistrationPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/repair/:id" element={
                      <ProtectedRoute>
                        <RepairGuidePage />
                      </ProtectedRoute>
                    } />
                    <Route path="/review/:id" element={
                      <ProtectedRoute>
                        <JobReviewPage />
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
