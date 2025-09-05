/**
 * Development-only wrapper for debug components
 * Prevents debug components from being included in production builds
 */

import { ReactNode } from 'react';

interface DevOnlyProps {
  children: ReactNode;
}

export const DevOnly: React.FC<DevOnlyProps> = ({ children }) => {
  // Only render children in development mode
  if (import.meta.env.PROD) {
    return null;
  }

  return <>{children}</>;
};

export default DevOnly;
