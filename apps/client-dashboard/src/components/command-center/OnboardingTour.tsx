import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useUIMode } from "@/lib/ui-mode";
import { 
  ArrowRight, 
  X, 
  Monitor, 
  Settings2, 
  Calendar, 
  MapPin, 
  Users,
  Info,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  PlayCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  icon: React.ComponentType<{ className?: string }>;
  spotlight?: boolean;
  action?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Command Center!',
    description: 'This is your operations hub for managing the restaurant in real-time. Let\'s take a quick tour of the key features.',
    target: 'body',
    position: 'bottom',
    icon: Sparkles,
    spotlight: false
  },
  {
    id: 'mode-switch',
    title: 'Operations vs Management',
    description: 'Switch between Operations mode (live service) and Management mode (analytics & settings) at any time.',
    target: '[data-tour="mode-switch"]',
    position: 'bottom',
    icon: Monitor,
    action: 'Try clicking to switch modes'
  },
  {
    id: 'timeline',
    title: 'Timeline View',
    description: 'See all today\'s reservations in a scrollable timeline. Use arrow keys to navigate or click bookings for details.',
    target: '[data-tour="timeline"]',
    position: 'right',
    icon: Calendar,
    spotlight: true
  },
  {
    id: 'floor-map',
    title: 'Interactive Floor Plan',
    description: 'Visual table status with real-time updates. Click tables to see occupancy details and manage seating.',
    target: '[data-tour="floor-map"]',
    position: 'left',
    icon: MapPin,
    spotlight: true
  },
  {
    id: 'waitlist',
    title: 'Live Waitlist',
    description: 'Manage waiting guests with priority levels. Tap guests to see quick actions like call or seat.',
    target: '[data-tour="waitlist"]',
    position: 'left',
    icon: Users,
    spotlight: true
  },
  {
    id: 'complete',
    title: 'You\'re all set!',
    description: 'Press ⌘K anytime for the command palette with quick actions. Happy service!',
    target: 'body',
    position: 'bottom',
    icon: PlayCircle,
    spotlight: false
  }
];

const OnboardingTour: React.FC = () => {
  const { seenTour, markTourSeen } = useUIMode();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSkipping, setIsSkipping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const autoAdvanceRef = useRef<NodeJS.Timeout>();

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = undefined;
    }
  }, []);

  const handleComplete = useCallback(async () => {
    clearAutoAdvance();
    setIsActive(false);
    await markTourSeen();
  }, [clearAutoAdvance, markTourSeen]);

  const startAutoAdvance = useCallback(() => {
    // Auto-advance after 20 seconds
    autoAdvanceRef.current = setTimeout(() => {
      handleComplete();
    }, 20000);
  }, [handleComplete]);

  // Show tour if not seen and user is in operations mode
  useEffect(() => {
    const shouldShowTour = !seenTour && !isActive;
    if (shouldShowTour) {
      // Delay to let the page load
      timeoutRef.current = setTimeout(() => {
        setIsActive(true);
        startAutoAdvance();
      }, 1500);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
      }
    };
  }, [seenTour, isActive, startAutoAdvance]);

  const handleNext = useCallback(() => {
    clearAutoAdvance();
    
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      startAutoAdvance(); // Restart auto-advance for next step
    } else {
      handleComplete();
    }
  }, [currentStep, clearAutoAdvance, startAutoAdvance, handleComplete]);

  const handlePrev = useCallback(() => {
    clearAutoAdvance();
    
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      startAutoAdvance();
    }
  }, [currentStep, clearAutoAdvance, startAutoAdvance]);

  const handleSkip = useCallback(() => {
    setIsSkipping(true);
    clearAutoAdvance();
    
    setTimeout(() => {
      handleComplete();
    }, 300);
  }, [clearAutoAdvance, handleComplete]);

  const getTargetElement = (target: string) => {
    if (target === 'body') return document.body;
    return document.querySelector(target);
  };

  const getTooltipPosition = (targetElement: Element | null, position: string) => {
    if (!targetElement) return { top: '50%', left: '50%' };

    const rect = targetElement.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const offset = 20;

    switch (position) {
      case 'top':
        return {
          top: rect.top - tooltipHeight - offset,
          left: rect.left + rect.width / 2 - tooltipWidth / 2,
          transform: 'none'
        };
      case 'bottom':
        return {
          top: rect.bottom + offset,
          left: rect.left + rect.width / 2 - tooltipWidth / 2,
          transform: 'none'
        };
      case 'left':
        return {
          top: rect.top + rect.height / 2 - tooltipHeight / 2,
          left: rect.left - tooltipWidth - offset,
          transform: 'none'
        };
      case 'right':
        return {
          top: rect.top + rect.height / 2 - tooltipHeight / 2,
          left: rect.right + offset,
          transform: 'none'
        };
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        };
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrev();
          break;
        case 'Escape':
          e.preventDefault();
          handleSkip();
          break;
      }
    };

    if (isActive) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, currentStep, handleNext, handlePrev, handleSkip]);

  // Reduce motion for accessibility
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  if (!isActive || seenTour) return null;

  const currentStepData = TOUR_STEPS[currentStep];
  const targetElement = getTargetElement(currentStepData.target);
  const tooltipStyle = getTooltipPosition(targetElement, currentStepData.position);
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] pointer-events-none">
        {/* Backdrop with spotlight */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 pointer-events-auto"
          onClick={handleSkip}
        />

        {/* Spotlight effect for specific targets */}
        {currentStepData.spotlight && targetElement && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bg-white/5 rounded-lg pointer-events-none border-2 border-white/20 shadow-2xl"
            style={{
              top: targetElement.getBoundingClientRect().top - 8,
              left: targetElement.getBoundingClientRect().left - 8,
              width: targetElement.getBoundingClientRect().width + 16,
              height: targetElement.getBoundingClientRect().height + 16,
            }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ 
            opacity: isSkipping ? 0 : 1, 
            scale: isSkipping ? 0.9 : 1, 
            y: isSkipping ? 20 : 0 
          }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="absolute pointer-events-auto"
          style={{
            top: tooltipStyle.top,
            left: tooltipStyle.left,
            transform: tooltipStyle.transform,
            maxWidth: '320px',
            zIndex: 101
          }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
        >
          <Card className="shadow-2xl border-2 border-white/20 bg-background/95 backdrop-blur-sm">
            <CardContent className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-brand/10 rounded-lg">
                    <currentStepData.icon className="w-5 h-5 text-brand" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">
                      {currentStepData.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {currentStepData.description}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-muted-foreground hover:text-text flex-shrink-0"
                  aria-label="Skip tour"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Action hint */}
              {currentStepData.action && (
                <div className="bg-brand/5 rounded-lg p-3 border border-brand/20">
                  <div className="flex items-center gap-2 text-sm text-brand">
                    <Info className="w-4 h-4" />
                    <span>{currentStepData.action}</span>
                  </div>
                </div>
              )}

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Step {currentStep + 1} of {TOUR_STEPS.length}</span>
                  <Badge variant="secondary" className="text-xs">
                    Auto-advance in 20s
                  </Badge>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSkip}
                    className="text-muted-foreground"
                  >
                    Skip tour
                  </Button>
                  
                  {currentStep === TOUR_STEPS.length - 1 ? (
                    <Button
                      onClick={handleComplete}
                      size="sm"
                      className="gap-2"
                    >
                      Got it!
                      <Sparkles className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      size="sm"
                      className="gap-2"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Keyboard hints */}
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2 border-t border-surface-2/50">
                <span>Use ← → to navigate</span>
                <span>•</span>
                <span>ESC to skip</span>
              </div>
            </CardContent>
          </Card>

          {/* Pointer/Arrow */}
          {currentStepData.target !== 'body' && (
            <motion.div
              className={cn(
                "absolute w-4 h-4 bg-background border-2 border-white/20 transform rotate-45",
                currentStepData.position === 'top' && "bottom-[-10px] left-1/2 -translate-x-1/2",
                currentStepData.position === 'bottom' && "top-[-10px] left-1/2 -translate-x-1/2",
                currentStepData.position === 'left' && "right-[-10px] top-1/2 -translate-y-1/2",
                currentStepData.position === 'right' && "left-[-10px] top-1/2 -translate-y-1/2"
              )}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: prefersReducedMotion ? 0 : 0.2 }}
            />
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OnboardingTour;
