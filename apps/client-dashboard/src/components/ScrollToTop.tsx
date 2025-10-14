import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Restores scroll to top on route changes for better UX
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Avoid interfering with hash navigation
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [pathname]);

  return null;
}
