import React from "react";
import { createRoot } from "react-dom/client";

// Minimal test component
const TestApp = () => {
  console.log('🎯 TestApp rendering...');
  
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h1>🎉 Blunari Client Dashboard - Test Mode</h1>
      <p>✅ React is working!</p>
      <p>✅ JavaScript is executing!</p>
      <p>✅ Styling is applied!</p>
      
      <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
        <h3>Environment Check:</h3>
        <p>Mode: {import.meta.env.MODE}</p>
        <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
        <p>Supabase Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
      </div>
      
      <button 
        onClick={() => {
          console.log('Button clicked!');
          alert('React events working!');
        }}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        Test Click Event
      </button>
      
      <div style={{ marginTop: '20px', fontSize: '14px' }}>
        <p><a href="/auth" style={{ color: '#FFD700' }}>Go to Auth Page</a></p>
        <p><a href="/dashboard" style={{ color: '#FFD700' }}>Go to Dashboard</a></p>
      </div>
    </div>
  );
};

console.log('🔍 Starting minimal test app...');

try {
  const root = createRoot(document.getElementById("root")!);
  root.render(<TestApp />);
  console.log('✅ Test app rendered successfully');
} catch (error) {
  console.error('❌ Failed to render test app:', error);
  
  // Fallback vanilla JS rendering
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: Arial, sans-serif; background: red; color: white; min-height: 100vh;">
      <h1>❌ React Failed to Load</h1>
      <p>Error: ${error.message}</p>
      <p>Check console for details</p>
    </div>
  `;
}
