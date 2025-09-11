import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: React.ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    x: 20,
    scale: 0.98,
  },
  in: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  out: {
    opacity: 0,
    x: -20,
    scale: 0.98,
  },
};

const pageTransition = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.5,
};

// Special transitions for mode switching
const modeTransitionVariants = {
  // Operations mode (Command Center) entry
  operationsEntry: {
    initial: {
      opacity: 0,
      scale: 0.96,
      y: 15,
    },
    in: {
      opacity: 1,
      scale: 1,
      y: 0,
    },
    out: {
      opacity: 0,
      scale: 1.04,
      y: -15,
    },
  },
  // Management mode (Dashboard) entry
  managementEntry: {
    initial: {
      opacity: 0,
      scale: 1.04,
      y: -15,
    },
    in: {
      opacity: 1,
      scale: 1,
      y: 0,
    },
    out: {
      opacity: 0,
      scale: 0.96,
      y: 15,
    },
  },
};

const modeTransition = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.6,
};

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState("in");
  const [previousLocation, setPreviousLocation] = useState(location);
  
  // Determine if this is a mode transition between Focus Mode and Advanced Mode
  const isCommandCenter = location.pathname === "/command-center";
  const isDashboard = location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard/");
  const wasCommandCenter = previousLocation.pathname === "/command-center";
  const wasDashboard = previousLocation.pathname === "/dashboard" || previousLocation.pathname.startsWith("/dashboard/");
  
  // Only animate transitions between Focus Mode (Dashboard) and Advanced Mode (Command Center)
  const isModeSwitch = (isCommandCenter && wasDashboard) || (isDashboard && wasCommandCenter);
  
  // Choose animation variant based on the page (only for mode switches)
  const getAnimationVariant = () => {
    if (!isModeSwitch) {
      // No animation for regular page changes
      return {
        initial: { opacity: 1 },
        in: { opacity: 1 },
        out: { opacity: 1 }
      };
    }
    
    if (isCommandCenter) {
      return modeTransitionVariants.operationsEntry;
    } else if (isDashboard) {
      return modeTransitionVariants.managementEntry;
    }
    return pageVariants;
  };
  
  const getTransitionConfig = () => {
    if (!isModeSwitch) {
      // Instant transition for regular page changes
      return { duration: 0 };
    }
    
    if (isCommandCenter || isDashboard) {
      return modeTransition;
    }
    return pageTransition;
  };

  useEffect(() => {
    if (location !== displayLocation) {
      setPreviousLocation(displayLocation);
      
      if (isModeSwitch) {
        // Only delay for mode switches
        setTransitionStage("out");
        const timer = setTimeout(() => {
          setDisplayLocation(location);
          setTransitionStage("in");
        }, 250);
        
        return () => clearTimeout(timer);
      } else {
        // Instant update for regular page changes
        setDisplayLocation(location);
        setTransitionStage("in");
      }
    }
  }, [location, displayLocation, isModeSwitch]);

  return (
    <motion.div
      key={displayLocation.pathname}
      initial="initial"
      animate={transitionStage === "in" ? "in" : "out"}
      variants={getAnimationVariant()}
      transition={getTransitionConfig()}
      className="w-full h-full min-h-screen bg-gray-50"
      style={{ 
        position: (!isModeSwitch || transitionStage === "in") ? "relative" : "absolute",
        width: "100%",
        minHeight: "100vh"
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
