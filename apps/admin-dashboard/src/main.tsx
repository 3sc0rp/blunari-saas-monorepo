import { createRoot } from "react-dom/client";
// Initialize monitoring first
import "./monitoring/sentry";
import App from "./App.tsx";
import "./index.css";
import { initializeSecurity } from "./lib/security";

// Initialize security features
initializeSecurity();

createRoot(document.getElementById("root")!).render(<App />);
