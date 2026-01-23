import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const WelcomePage = lazy(() => import('./pages/WelcomePage'));
const DiagnosisPage = lazy(() => import('./pages/DiagnosisPage'));
const RepairGuidePage = lazy(() => import('./pages/RepairGuidePage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

function App() {
  return (
    <BrowserRouter basename="/house-maint-ai">
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/diagnosis" element={<DiagnosisPage />} />
          <Route path="/repair/:id" element={<RepairGuidePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
