import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import WelcomePage from './pages/WelcomePage';
import DiagnosisPage from './pages/DiagnosisPage';
import RepairGuidePage from './pages/RepairGuidePage';
import CalendarPage from './pages/CalendarPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/diagnosis" element={<DiagnosisPage />} />
        <Route path="/repair/:id" element={<RepairGuidePage />} />
        <Route path="/calendar" element={<CalendarPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
