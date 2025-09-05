import { useEffect, useState } from 'react';

export const useHeartbeat = (isConnected: boolean, interval: number = 1000) => {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!isConnected) return;

    const timer = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 200);
    }, interval);

    return () => clearInterval(timer);
  }, [isConnected, interval]);

  return pulse;
};
