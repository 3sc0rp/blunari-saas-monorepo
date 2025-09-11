import React from "react";
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
  duration: 0.25,
};

// Special transitions for mode switching
const modeTransitionVariants = {
  // Operations mode (Command Center) entry
  operationsEntry: {
    initial: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      filter: "blur(4px)",
    },
    in: {
      opacity: 1,
      scale: 1,
      y: 0,
      filter: "blur(0px)",
    },
    out: {
      opacity: 0,
      scale: 1.05,
      y: -20,
      filter: "blur(4px)",
    },
  },
  // Management mode (Dashboard) entry
  managementEntry: {
    initial: {
      opacity: 0,
      scale: 1.05,
      y: -20,
      filter: "blur(4px)",
    },
    in: {
      opacity: 1,
      scale: 1,
      y: 0,
      filter: "blur(0px)",
    },
    out: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      filter: "blur(4px)",
    },
  },
};

const modeTransition = {
  type: "spring" as const,
  damping: 25,
  stiffness: 400,
  duration: 0.4,
};

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  
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

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={getAnimationVariant()}
        transition={getTransitionConfig()}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
