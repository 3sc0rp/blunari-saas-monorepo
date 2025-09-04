import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Loader2, Utensils } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate("/dashboard");
      } else {
        navigate("/auth");
      }
    }
  }, [user, loading, navigate]);

  // Add timeout fallback in case auth is stuck
  useEffect(() => {
    const timeout = setTimeout(() => {
      setTimeoutReached(true);
      console.warn("Auth timeout reached, redirecting to auth page");
      navigate("/auth");
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, [navigate]);

  // If timeout reached, redirect immediately
  if (timeoutReached) {
    navigate("/auth");
    return null;
  }

  // Show elegant loading screen while redirecting
  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center space-y-6 text-primary-foreground"
      >
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="relative"
        >
          <div className="w-20 h-20 bg-primary-foreground/10 rounded-full flex items-center justify-center">
            <Utensils className="w-10 h-10" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-h2 font-bold mb-2">Blunari Restaurant</h1>
          <p className="text-primary-foreground/80 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading your experience...
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Index;
