import React from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const queryClient = new QueryClient();

// Minimal test page  
const TestPage = () => (
  <div style={{ padding: '20px' }}>
    <h1>🧪 Minimal App Test</h1>
    <p>Testing basic routing and React Query...</p>
  </div>
);

const AppMinimal = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TestPage />} />
        <Route path="*" element={<TestPage />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default AppMinimal;
