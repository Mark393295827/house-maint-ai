import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Analytics from './services/analytics';
import { initSentry } from './services/sentry';

// Initialize Observability
initSentry();
Analytics.init();
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
