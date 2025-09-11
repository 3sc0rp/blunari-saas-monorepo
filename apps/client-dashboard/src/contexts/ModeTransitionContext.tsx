import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Settings2, Zap } from "lucide-react";

interface ModeTransitionContextType {
  isTransitioning: boolean;
  triggerModeTransition: (fromMode: string, toMode: string) => Promise<void>;
}

const ModeTransitionContext = createContext<ModeTransitionContextType | null>(null);

export const useModeTransition = () => {
  const context = useContext(ModeTransitionContext);
  if (!context) {
    throw new Error("useModeTransition must be used within ModeTransitionProvider");
  }
  return context;
};

interface ModeTransitionProviderProps {
  children: React.ReactNode;
}

export const ModeTransitionProvider: React.FC<ModeTransitionProviderProps> = ({ children }) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionData, setTransitionData] = useState<{
    fromMode: string;
    toMode: string;
  } | null>(null);

  const triggerModeTransition = useCallback(async (fromMode: string, toMode: string): Promise<void> => {
    return new Promise((resolve) => {
      setIsTransitioning(true);
      setTransitionData({ fromMode, toMode });
      
      // Complete transition faster for better responsiveness
      setTimeout(() => {
        setIsTransitioning(false);
        setTransitionData(null);
        resolve();
      }, 600);
    });
  }, []);

  return (
    <ModeTransitionContext.Provider value={{ isTransitioning, triggerModeTransition }}>
      {children}
      
      {/* Global Mode Transition Overlay */}
      <AnimatePresence>
        {isTransitioning && transitionData && (
          <motion.div
            className="fixed inset-0 z-[9999] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Animated background */}
            <motion.div
              className="absolute inset-0"
              initial={{ 
                background: transitionData.fromMode === "operations" 
                  ? "linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(37, 99, 235, 0.95))"
                  : "linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(217, 119, 6, 0.95))"
              }}
              animate={{ 
                background: transitionData.toMode === "operations" 
                  ? "linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(37, 99, 235, 0.95))"
                  : "linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(217, 119, 6, 0.95))"
              }}
              transition={{ duration: 0.3 }}
            />

            {/* Central transition animation */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="text-center text-white"
                initial={{ scale: 0.9, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 1.1, opacity: 0, y: -10 }}
                transition={{ duration: 0.3, delay: 0.05 }}
              >
                {/* From Mode Icon */}
                <motion.div
                  className="flex items-center justify-center mb-4"
                  initial={{ x: 0, opacity: 1 }}
                  animate={{ x: -50, opacity: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  {transitionData.fromMode === "operations" ? (
                    <Monitor className="w-16 h-16" />
                  ) : (
                    <Settings2 className="w-16 h-16" />
                  )}
                </motion.div>

                {/* Transition Effect */}
                <motion.div
                  className="flex items-center justify-center mb-4"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                >
                  <Zap className="w-8 h-8 text-yellow-300" />
                </motion.div>

                {/* To Mode Icon */}
                <motion.div
                  className="flex items-center justify-center mb-6"
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.2, delay: 0.25 }}
                >
                  {transitionData.toMode === "operations" ? (
                    <Monitor className="w-16 h-16" />
                  ) : (
                    <Settings2 className="w-16 h-16" />
                  )}
                </motion.div>

                {/* Text */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.3 }}
                >
                  <h2 className="text-2xl font-bold mb-2">
                    Switching to {transitionData.toMode === "operations" ? "Operations" : "Management"} Mode
                  </h2>
                  <p className="text-white/80">
                    {transitionData.toMode === "operations" 
                      ? "Preparing live operations interface..."
                      : "Loading management dashboard..."
                    }
                  </p>
                </motion.div>
              </motion.div>
            </div>

            {/* Optimized animated particles */}
            <div className="absolute inset-0 overflow-hidden">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 bg-white/40 rounded-full"
                  initial={{
                    x: Math.random() * window.innerWidth,
                    y: window.innerHeight + 10,
                    scale: 0,
                  }}
                  animate={{
                    y: -10,
                    scale: [0, 1, 0],
                    opacity: [0, 0.8, 0],
                  }}
                  transition={{
                    duration: 1.2,
                    delay: Math.random() * 0.3,
                    ease: "easeOut",
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModeTransitionContext.Provider>
  );
};

export default ModeTransitionProvider;
