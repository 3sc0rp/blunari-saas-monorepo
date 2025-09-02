import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initializePerformance } from "./utils/performance.ts";
import "./index.css";
import "./App.css";

// Initialize performance optimizations
initializePerformance();

createRoot(document.getElementById("root")!).render(<App />);
