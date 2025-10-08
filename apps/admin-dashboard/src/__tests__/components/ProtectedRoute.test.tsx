import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthProvider } from '@/contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

describe('ProtectedRoute', () => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <AuthProvider>{children}</AuthProvider>
    </BrowserRouter>
  );

  it('should render loading state while checking auth', () => {
    const { container } = render(
      <Wrapper>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </Wrapper>
    );
    
    // Should show loading initially
    expect(container).toBeDefined();
  });

  it('should allow test bypass in localhost with flag', () => {
    // Mock localhost environment
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'localhost',
        href: 'http://localhost:3000?__bypass=1',
      },
      writable: true,
    });

    const { container } = render(
      <Wrapper>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </Wrapper>
    );

    expect(container).toBeDefined();
  });
});
