import React, { useEffect } from 'react';
import CommandCenter from '@/pages/CommandCenter';
import { useFullscreen } from '@/contexts/FullscreenContext';

const FullscreenCommandCenter: React.FC = () => {
  const { setIsFullscreen } = useFullscreen();

  useEffect(() => {
    // Force fullscreen mode
    setIsFullscreen(true);
    
    // Cleanup on unmount
    return () => {
      setIsFullscreen(false);
    };
  }, [setIsFullscreen]);

  return (
    <div className="fixed inset-0 z-50 bg-gray-50">
      <CommandCenter />
    </div>
  );
};

export default FullscreenCommandCenter;
