import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Analytics from './services/analytics';
import { initSentry } from './services/sentry';
import { LanguageProvider } from './i18n/LanguageContext';

// Initialize Observability
initSentry();
Analytics.init();
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
)
