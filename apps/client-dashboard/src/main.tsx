import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import LoadingFallback from '@/components/LoadingFallback';
import '@/monitoring/sentry';
import './index.css';

// Lazy load the main App component for better initial bundle size
const App = React.lazy(() => import('./App'));

// Get root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Suspense fallback={<LoadingFallback />}>
      <App />
    </Suspense>
  </React.StrictMode>
);
