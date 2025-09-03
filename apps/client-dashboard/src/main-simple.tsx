import { createRoot } from "react-dom/client";
import "./index.css";

// Very basic React app to test if the issue is in our components
const SimpleApp = () => {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>✅ Basic React App Working!</h1>
      <p>If you can see this, React and Vite are working correctly.</p>
      <p>The issue is likely in one of our components or imports.</p>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<SimpleApp />);
