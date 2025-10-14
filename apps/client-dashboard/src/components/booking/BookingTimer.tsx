import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BookingTimerProps {
  startTime: number;
  challengeThreshold?: number; // 20 seconds by default
  showChallenge?: boolean;
}

const BookingTimer: React.FC<BookingTimerProps> = ({
  startTime,
  challengeThreshold = 20000, // 20 seconds
  showChallenge = true,
}) => {
  const [elapsed, setElapsed] = useState(0);
  const [isInChallenge, setIsInChallenge] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentElapsed = Date.now() - startTime;
      setElapsed(currentElapsed);
      setIsInChallenge(currentElapsed <= challengeThreshold);
    }, 100); // Update every 100ms for smooth counting
      return () => clearInterval(interval);
  }, [startTime, challengeThreshold]);

  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const milliseconds = Math.floor((elapsed % 1000) / 100);

  const formatTime = () => {
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}.${milliseconds}`;
    } else {
      return `${remainingSeconds}.${milliseconds}`;
    }
  };

  const getChallengeText = () => {
    if (!showChallenge) return null;

    if (isInChallenge) {
      const remainingChallenge = Math.max(0, challengeThreshold - elapsed);
      const challengeSeconds = Math.ceil(remainingChallenge / 1000);

      return (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-2"
        >
          <Badge
            variant="secondary"
            className="bg-gradient-to-r from-warning to-danger text-warning-foreground border-0 animate-pulse"
          >
            <Zap className="h-3 w-3 mr-1" />
            🏆 {challengeSeconds}s Challenge!
          </Badge>
        </motion.div>
      );
    }

    return null;
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span
          className="font-mono text-sm font-medium tabular-nums tracking-wider"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatTime()}s
        </span>
      </div>
      {getChallengeText()}
    </div>
  );
};

export default BookingTimer;

