import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query';
import './index.css'
import Analytics from './services/analytics';
import { initSentry } from './services/sentry';
import { LanguageProvider } from './i18n/LanguageContext';
import { queryClient } from './services/queryClient';

// Initialize Observability
initSentry();
Analytics.init();
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </QueryClientProvider>
  </StrictMode>,
)

