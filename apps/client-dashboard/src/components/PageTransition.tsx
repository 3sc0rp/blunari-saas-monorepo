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
  
  // Determine if this is a mode transition
  const isCommandCenter = location.pathname === "/command-center";
  const isDashboard = location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard/");
  
  // Choose animation variant based on the page
  const getAnimationVariant = () => {
    if (isCommandCenter) {
      return modeTransitionVariants.operationsEntry;
    } else if (isDashboard) {
      return modeTransitionVariants.managementEntry;
    }
    return pageVariants;
  };
  
  const getTransitionConfig = () => {
    if (isCommandCenter || isDashboard) {
      return modeTransition;
    }
    return pageTransition;
  };

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage("out");
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage("in");
      }, 250); // Slightly longer delay for smoother transition
      
      return () => clearTimeout(timer);
    }
  }, [location, displayLocation]);

  return (
    <motion.div
      key={displayLocation.pathname}
      initial="initial"
      animate={transitionStage === "in" ? "in" : "out"}
      variants={getAnimationVariant()}
      transition={getTransitionConfig()}
      className="w-full h-full min-h-screen bg-gray-50"
      style={{ 
        position: transitionStage === "out" ? "absolute" : "relative",
        width: "100%",
        minHeight: "100vh"
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
