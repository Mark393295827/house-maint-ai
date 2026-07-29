import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalErrorBoundary from './components/ui/GlobalErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import PageTracker from './components/PageTracker';
import SkipLink from './components/ui/SkipLink';
import { initAgenticStack } from './agenticInit';
import './enterprise.css';



/* ─── Lazy-loaded Pages (core consumer flow only) ─── */
const OnboardingGate = lazy(() => import('./components/OnboardingGate'));
const WelcomePage = lazy(() => import('./pages/WelcomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RepairmanLoginPage = lazy(() => import('./pages/RepairmanLoginPage'));
const DiagnosisPage = lazy(() => import('./pages/DiagnosisPage'));
const MyCasesPage = lazy(() => import('./pages/MyCasesPage'));
const CaseLibraryPage = lazy(() => import('./pages/CaseLibraryPage'));
const ShowcasePage = lazy(() => import('./pages/ShowcasePage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const QuickReportPage = lazy(() => import('./pages/QuickReportPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const ConversationsPage = lazy(() => import('./pages/ConversationsPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const PaymentCancelPage = lazy(() => import('./pages/PaymentCancelPage'));
const OmnichannelSim = lazy(() => import('./pages/OmnichannelSim'));
const MetricsDashboard = lazy(() => import('./pages/MetricsDashboard'));
const WorkerDashboardPage = lazy(() => import('./pages/WorkerDashboardPage'));
const WorkerJobPage = lazy(() => import('./pages/WorkerJobPage'));
const WorkerMatchPage = lazy(() => import('./pages/WorkerMatchPage'));
const WorkerRegistrationPage = lazy(() => import('./pages/WorkerRegistrationPage'));
const WorkerDirectoryPage = lazy(() => import('./pages/WorkerDirectoryPage'));
const RepairGuidePage = lazy(() => import('./pages/RepairGuidePage'));
const DevicePreview = lazy(() => import('./pages/DevicePreview'));
const ReportDetailPage = lazy(() => import('./pages/ReportDetailPage'));
const JobReviewPage = lazy(() => import('./pages/JobReviewPage'));
const EnterpriseDashboard = lazy(() => import('./pages/EnterpriseDashboard'));
const AssetsPage = lazy(() => import('./pages/AssetsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export const APP_ROUTE_PATHS = [
  '/',
  '/welcome',
  '/landing',
  '/showcase',
  '/preview',
  '/login',
  '/repairman/login',
  '/payment/success',
  '/payment/cancel',
  '/diagnosis',
  '/quick-report',
  '/cases',
  '/reports/:id',
  '/library',
  '/community',
  '/omnichannel-sim',
  '/metrics',
  '/calendar',
  '/profile',
  '/notifications',
  '/orders',
  '/messages',
  '/conversations',
  '/chat',
  '/chat/:userId',
  '/assets',
  '/worker/dashboard',
  '/worker/job/:id',
  '/worker/match',
  '/match',
  '/worker/register',
  '/workers',
  '/repair',
  '/repair/:id',
  '/review/:id',
  '/enterprise/*',
  '/enterpriseUI/*',
  '*',
] as const;

function AgenticStackInitializer() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    return initAgenticStack();
  }, [isAuthenticated, isLoading]);

  return null;
}

function App() {
  return (

    <GlobalErrorBoundary>
      <ToastProvider>
        <ErrorBoundary>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <PageTracker />
            <SkipLink />
            <AuthProvider>
              <AgenticStackInitializer />
              <Suspense fallback={<LoadingSpinner />}>
                <div id="main-content" className="min-h-screen outline-none" tabIndex={-1}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<OnboardingGate />} />
                    <Route path="/welcome" element={<WelcomePage />} />
                    <Route path="/landing" element={<ShowcasePage />} />
                    <Route path="/showcase" element={<ShowcasePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/repairman/login" element={<RepairmanLoginPage />} />
                    <Route path="/payment/success" element={<PaymentSuccessPage />} />
                    <Route path="/payment/cancel" element={<PaymentCancelPage />} />
                    <Route path="/preview" element={<DevicePreview />} />

                    {/* Consumer-only routes */}
                    <Route path="/diagnosis" element={<ProtectedRoute allowedRoles={['user', 'admin', 'manager', 'tenant']}><DiagnosisPage /></ProtectedRoute>} />
                    <Route path="/quick-report" element={<ProtectedRoute allowedRoles={['user', 'admin', 'manager', 'tenant']}><QuickReportPage /></ProtectedRoute>} />
                    <Route path="/cases" element={<ProtectedRoute allowedRoles={['user', 'admin', 'manager', 'tenant']}><MyCasesPage /></ProtectedRoute>} />
                    <Route path="/library" element={<ProtectedRoute><CaseLibraryPage /></ProtectedRoute>} />
                    <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
                    <Route path="/omnichannel-sim" element={<ProtectedRoute><OmnichannelSim /></ProtectedRoute>} />
                    <Route path="/metrics" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><MetricsDashboard /></ProtectedRoute>} />

                    {/* Shared authenticated routes */}
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
                    <Route path="/orders" element={
                      <ProtectedRoute>
                        <OrdersPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/messages" element={
                      <ProtectedRoute>
                        <ConversationsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/chat" element={
                      <ProtectedRoute>
                        <ConversationsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/conversations" element={
                      <ProtectedRoute>
                        <ConversationsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/chat/:userId" element={
                      <ProtectedRoute>
                        <ChatPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/assets" element={
                      <ProtectedRoute allowedRoles={['user', 'admin', 'manager', 'tenant']}>
                        <AssetsPage />
                      </ProtectedRoute>
                    } />

                    {/* Worker-only routes */}
                    <Route path="/worker/dashboard" element={
                      <ProtectedRoute allowedRoles={['worker', 'admin']}>
                        <WorkerDashboardPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/worker/job/:id" element={
                      <ProtectedRoute allowedRoles={['worker', 'admin']}>
                        <WorkerJobPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/worker/match" element={
                      <ProtectedRoute allowedRoles={['user', 'admin', 'manager', 'tenant']}>
                        <WorkerMatchPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/match" element={
                      <ProtectedRoute allowedRoles={['user', 'admin', 'manager', 'tenant']}>
                        <WorkerMatchPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/worker/register" element={
                      <ProtectedRoute>
                        <WorkerRegistrationPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/workers" element={
                      <ProtectedRoute>
                        <WorkerDirectoryPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/repair/:id" element={
                      <ProtectedRoute>
                        <RepairGuidePage />
                      </ProtectedRoute>
                    } />
                    <Route path="/reports/:id" element={
                      <ProtectedRoute>
                        <ReportDetailPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/repair" element={
                      <ProtectedRoute>
                        <RepairGuidePage />
                      </ProtectedRoute>
                    } />
                    <Route path="/review/:id" element={
                      <ProtectedRoute>
                        <JobReviewPage />
                      </ProtectedRoute>
                    } />

                    {/* Enterprise Management Dashboard */}
                    <Route path="/enterprise/*" element={
                      <ProtectedRoute allowedRoles={['admin', 'manager']}>
                        <EnterpriseDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/enterpriseUI/*" element={
                      <ProtectedRoute allowedRoles={['admin', 'manager']}>
                        <EnterpriseDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="*" element={<NotFoundPage />} />
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
