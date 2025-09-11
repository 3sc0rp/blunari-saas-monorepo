import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import '@/monitoring/sentry';
import './index.css';

// Get root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
