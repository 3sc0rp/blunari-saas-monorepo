import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initializePerformance } from "./utils/performance.ts";
import "./index.css";
import "./App.css";

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  // Prevent the error from breaking the entire app
  event.preventDefault();
});

// Global handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the error from breaking the entire app
  event.preventDefault();
});

// Initialize performance optimizations
try {
  initializePerformance();
} catch (error) {
  console.warn('Performance initialization failed:', error);
}

const root = createRoot(document.getElementById("root")!);

try {
  root.render(<App />);
} catch (error) {
  console.error('Failed to render app:', error);
  // Fallback rendering
  root.render(
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Loading...</h1>
      <p>The application is starting up. Please wait a moment.</p>
    </div>
  );
}
