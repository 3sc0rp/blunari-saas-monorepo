import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Minimal App component for testing
function App() {
  console.log('🎯 App component rendering...');
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div style={{ padding: '20px', textAlign: 'center', color: '#333' }}>
        <h1>🚀 Blunari SaaS App - Testing Mode</h1>
        <p>If you can see this, React is working!</p>
        
        <div style={{ 
          marginTop: '40px',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          maxWidth: '600px',
          margin: '40px auto'
        }}>
          <h2>Application Status</h2>
          <p>✅ React is rendering</p>
          <p>✅ CSS is loading</p>
          <p>✅ JavaScript is executing</p>
          
          <div style={{ marginTop: '20px' }}>
            <button 
              onClick={() => alert('Button clicked! React events are working.')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Test React Events
            </button>
            
            <button 
              onClick={() => window.location.href = '/test'}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Test Navigation
            </button>
          </div>
        </div>
      </div>
      
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <h3>🏠 Home Route Working</h3>
              <p>React Router is functioning correctly</p>
            </div>
          } />
          <Route path="/test" element={
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <h3>🧪 Test Route Working</h3>
              <p>Navigation successful!</p>
              <a href="/" style={{ color: '#007bff' }}>← Back Home</a>
            </div>
          } />
          <Route path="*" element={
            <div style={{ 
              padding: '40px', 
              textAlign: 'center',
              fontSize: '18px',
              color: '#666'
            }}>
              <h2>Page Not Found</h2>
              <p>This is a test version with minimal routing.</p>
              <a href="/" style={{ color: '#007bff' }}>Go Home</a>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
