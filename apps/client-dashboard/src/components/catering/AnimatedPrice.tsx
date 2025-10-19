/**
 * Animated Price Display Component
 * 
 * Provides smooth animations for price changes in the catering widget.
 * Uses Framer Motion for transitions and spring physics.
 */

import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';

interface AnimatedPriceProps {
  /** Price in cents */
  value: number;
  /** Currency symbol (default: '$') */
  currency?: string;
  /** Animation duration in seconds (default: 0.5) */
  duration?: number;
  /** CSS classes for styling */
  className?: string;
  /** Show cents (default: true) */
  showCents?: boolean;
  /** Prefix text (e.g., "Total: ") */
  prefix?: string;
  /** Suffix text (e.g., " USD") */
  suffix?: string;
}

/**
 * Formats cents to dollar string
 */
const formatPrice = (cents: number, showCents: boolean = true): string => {
  const dollars = cents / 100;
  return showCents ? dollars.toFixed(2) : Math.floor(dollars).toString();
};

/**
 * AnimatedPrice Component
 * 
 * Animates price changes with smooth transitions and visual feedback.
 */
export const AnimatedPrice: React.FC<AnimatedPriceProps> = ({
  value,
  currency = '$',
  duration = 0.5,
  className = '',
  showCents = true,
  prefix = '',
  suffix = '',
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isIncreasing, setIsIncreasing] = useState<boolean | null>(null);

  // Spring animation for smooth price transitions
  const spring = useSpring(value, {
    stiffness: 100,
    damping: 30,
    mass: 1,
  });

  // Transform spring value to formatted price
  const formattedPrice = useTransform(spring, (latest) => {
    const price = formatPrice(Math.round(latest), showCents);
    return price;
  });

  useEffect(() => {
    // Determine if price is increasing or decreasing
    if (value > displayValue) {
      setIsIncreasing(true);
    } else if (value < displayValue) {
      setIsIncreasing(false);
    }

    // Update spring target
    spring.set(value);
    
    // Reset increase/decrease indicator after animation
    const timer = setTimeout(() => {
      setIsIncreasing(null);
      setDisplayValue(value);
    }, duration * 1000);

    return () => clearTimeout(timer);
  }, [value, spring, duration, displayValue]);

  return (
    <div className={`relative inline-flex items-baseline gap-1 ${className}`}>
      {prefix && (
        <span className="text-inherit">{prefix}</span>
      )}
      
      <div className="relative inline-flex items-baseline">
        {/* Currency symbol */}
        <motion.span
          className="text-inherit"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {currency}
        </motion.span>

        {/* Animated price value */}
        <motion.span
          className="text-inherit tabular-nums"
          animate={{
            scale: isIncreasing !== null ? [1, 1.05, 1] : 1,
            color: isIncreasing === true 
              ? ['currentColor', '#16a34a', 'currentColor']
              : isIncreasing === false
              ? ['currentColor', '#dc2626', 'currentColor']
              : 'currentColor',
          }}
          transition={{
            duration: duration,
            ease: 'easeInOut',
          }}
        >
          {formattedPrice}
        </motion.span>

        {/* Visual indicator for price changes */}
        <AnimatePresence>
          {isIncreasing !== null && (
            <motion.span
              className={`absolute -right-6 top-0 text-xs font-semibold ${
                isIncreasing ? 'text-green-600' : 'text-red-600'
              }`}
              initial={{ opacity: 0, x: -10, y: 0 }}
              animate={{ opacity: 1, x: 0, y: -2 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {isIncreasing ? '↗' : '↘'}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {suffix && (
        <span className="text-inherit">{suffix}</span>
      )}
    </div>
  );
};

interface AnimatedPriceBadgeProps {
  /** Price in cents */
  value: number;
  /** Label (e.g., "Per Person", "Total") */
  label?: string;
  /** Show change indicator */
  showChange?: boolean;
  /** Previous value for comparison */
  previousValue?: number;
  /** CSS classes */
  className?: string;
}

/**
 * AnimatedPriceBadge Component
 * 
 * Displays price in a badge with optional change indicator.
 */
export const AnimatedPriceBadge: React.FC<AnimatedPriceBadgeProps> = ({
  value,
  label,
  showChange = false,
  previousValue,
  className = '',
}) => {
  const change = previousValue !== undefined ? value - previousValue : 0;
  const changePercentage = previousValue && previousValue > 0
    ? ((change / previousValue) * 100).toFixed(1)
    : '0.0';

  return (
    <motion.div
      className={`inline-flex flex-col items-center gap-1 ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatedPrice
        value={value}
        className="text-2xl font-bold"
        showCents={true}
      />
      
      {label && (
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      )}

      {showChange && change !== 0 && (
        <motion.div
          className={`text-xs font-medium ${
            change > 0 ? 'text-green-600' : 'text-red-600'
          }`}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          {change > 0 ? '+' : ''}{formatPrice(Math.abs(change))}
          {' '}({change > 0 ? '+' : ''}{changePercentage}%)
        </motion.div>
      )}
    </motion.div>
  );
};

interface PriceBreakdownProps {
  /** Base price per person in cents */
  pricePerPerson: number;
  /** Number of guests */
  guestCount: number;
  /** Additional fees */
  fees?: Array<{
    label: string;
    amount: number;
  }>;
  /** Show breakdown details */
  showDetails?: boolean;
  /** CSS classes */
  className?: string;
}

/**
 * PriceBreakdown Component
 * 
 * Displays detailed price calculation with animations.
 */
export const PriceBreakdown: React.FC<PriceBreakdownProps> = ({
  pricePerPerson,
  guestCount,
  fees = [],
  showDetails = true,
  className = '',
}) => {
  const subtotal = pricePerPerson * guestCount;
  const feesTotal = fees.reduce((sum, fee) => sum + fee.amount, 0);
  const total = subtotal + feesTotal;

  return (
    <motion.div
      className={`space-y-3 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {showDetails && (
        <>
          {/* Per person price */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">
              <AnimatedPrice
                value={pricePerPerson}
                className="font-medium"
                showCents={true}
              />
              {' × '}
              <motion.span
                key={guestCount}
                initial={{ scale: 1.2, color: '#f97316' }}
                animate={{ scale: 1, color: 'currentColor' }}
                transition={{ duration: 0.3 }}
                className="font-semibold"
              >
                {guestCount}
              </motion.span>
              {' guests'}
            </span>
            <AnimatedPrice
              value={subtotal}
              className="font-medium"
              showCents={true}
            />
          </div>

          {/* Additional fees */}
          {fees.map((fee, index) => (
            <motion.div
              key={fee.label}
              className="flex justify-between items-center text-sm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <span className="text-muted-foreground">{fee.label}</span>
              <AnimatedPrice
                value={fee.amount}
                className="font-medium"
                showCents={true}
              />
            </motion.div>
          ))}

          {/* Divider */}
          <motion.div
            className="border-t border-muted"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          />
        </>
      )}

      {/* Total */}
      <div className="flex justify-between items-center">
        <span className="text-lg font-semibold">Total</span>
        <AnimatedPrice
          value={total}
          className="text-2xl font-bold text-orange-600"
          showCents={true}
        />
      </div>
    </motion.div>
  );
};
