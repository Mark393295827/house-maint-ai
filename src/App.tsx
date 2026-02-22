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
                    {/* Public routes */}
                    <Route path="/" element={<OnboardingGate />} />
                    <Route path="/welcome" element={<WelcomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/diagnosis" element={<DiagnosisPage />} />
                    <Route path="/cases" element={<MyCasesPage />} />
                    <Route path="/library" element={<CaseLibraryPage />} />
                    <Route path="/showcase" element={<ShowcasePage />} />
                    <Route path="/payment/success" element={<PaymentSuccessPage />} />
                    <Route path="/payment/cancel" element={<PaymentCancelPage />} />

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
