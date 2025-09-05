// Load React polyfill first to ensure global availability
import './polyfills/react-global';

import React from 'react';
// Initialize monitoring early
import '@/monitoring/sentry';
import ReactDOM from 'react-dom/client';
import './index.css';

// Get root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

// Dynamically import App AFTER polyfill executes to guarantee ordering
async function bootstrap() {
  const { default: App } = await import('./App.tsx');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
