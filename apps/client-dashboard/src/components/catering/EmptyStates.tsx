/**
 * Empty State Components for Catering Widget
 * 
 * Provides actionable empty states with recovery options and contact information.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChefHat,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  AlertCircle,
  Package,
  Clock,
} from 'lucide-react';

interface EmptyStateProps {
  /** Restaurant/tenant name */
  restaurantName?: string;
  /** Contact email */
  contactEmail?: string;
  /** Contact phone */
  contactPhone?: string;
  /** Callback when contact is requested */
  onContactClick?: () => void;
  /** CSS classes */
  className?: string;
}

/**
 * NoPackagesEmptyState Component
 * 
 * Shown when restaurant has no catering packages configured.
 * Provides options to contact the restaurant directly.
 */
export const NoPackagesEmptyState: React.FC<EmptyStateProps> = ({
  restaurantName = 'this restaurant',
  contactEmail,
  contactPhone,
  onContactClick,
  className = '',
}) => {
  const handleEmailClick = () => {
    if (contactEmail) {
      window.location.href = `mailto:${contactEmail}?subject=Catering Inquiry`;
    }
    onContactClick?.();
  };

  const handlePhoneClick = () => {
    if (contactPhone) {
      window.location.href = `tel:${contactPhone}`;
    }
    onContactClick?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      <Card className="border-2 border-dashed border-muted">
        <CardContent className="p-8 text-center">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="mx-auto mb-6"
          >
            <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
              <Package className="w-10 h-10 text-orange-600" />
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h3
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="text-2xl font-bold mb-3"
          >
            No Catering Packages Available Yet
          </motion.h3>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="text-muted-foreground mb-6 max-w-md mx-auto"
          >
            {restaurantName} is still setting up their catering packages. 
            But don't worry! You can still get a custom quote for your event.
          </motion.p>

          {/* Contact Options */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {contactEmail && (
                <Button
                  onClick={handleEmailClick}
                  className="min-h-[44px] bg-orange-600 hover:bg-orange-700"
                  aria-label={`Email ${restaurantName} for catering inquiry`}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email for Custom Quote
                </Button>
              )}

              {contactPhone && (
                <Button
                  onClick={handlePhoneClick}
                  variant="outline"
                  className="min-h-[44px]"
                  aria-label={`Call ${restaurantName} for catering inquiry`}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Us
                </Button>
              )}
            </div>

            {/* Contact Information Display */}
            {(contactEmail || contactPhone) && (
              <div className="pt-4 border-t border-muted text-sm text-muted-foreground space-y-2">
                {contactEmail && (
                  <div className="flex items-center justify-center gap-2">
                    <Mail className="w-4 h-4" aria-hidden="true" />
                    <a 
                      href={`mailto:${contactEmail}`}
                      className="hover:text-orange-600 transition-colors"
                    >
                      {contactEmail}
                    </a>
                  </div>
                )}
                {contactPhone && (
                  <div className="flex items-center justify-center gap-2">
                    <Phone className="w-4 h-4" aria-hidden="true" />
                    <a 
                      href={`tel:${contactPhone}`}
                      className="hover:text-orange-600 transition-colors"
                    >
                      {contactPhone}
                    </a>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* What to Expect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="mt-8 pt-6 border-t border-muted"
          >
            <h4 className="font-semibold mb-3 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" aria-hidden="true" />
              What Happens Next?
            </h4>
            <ol className="text-sm text-muted-foreground space-y-2 max-w-sm mx-auto text-left">
              <li className="flex gap-2">
                <span className="font-semibold text-orange-600">1.</span>
                <span>Contact the restaurant using the options above</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-orange-600">2.</span>
                <span>Discuss your event details and requirements</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-orange-600">3.</span>
                <span>Receive a personalized quote within 24 hours</span>
              </li>
            </ol>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface LoadingErrorEmptyStateProps {
  /** Error message */
  error?: string;
  /** Callback for retry action */
  onRetry?: () => void;
  /** CSS classes */
  className?: string;
}

/**
 * LoadingErrorEmptyState Component
 * 
 * Shown when there's an error loading catering packages.
 */
export const LoadingErrorEmptyState: React.FC<LoadingErrorEmptyStateProps> = ({
  error = 'Failed to load catering packages',
  onRetry,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      <Card className="border-2 border-red-200 bg-red-50/50">
        <CardContent className="p-8 text-center">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="mx-auto mb-6"
          >
            <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h3
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="text-2xl font-bold mb-3 text-red-900"
          >
            Oops! Something Went Wrong
          </motion.h3>

          {/* Error Description */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="space-y-3"
          >
            <p className="text-red-700 mb-4">
              {error}
            </p>

            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              We're having trouble loading the catering packages. 
              This might be a temporary issue.
            </p>
          </motion.div>

          {/* Action Buttons */}
          {onRetry && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="mt-6"
            >
              <Button
                onClick={onRetry}
                className="min-h-[44px] bg-orange-600 hover:bg-orange-700"
                aria-label="Retry loading catering packages"
              >
                <Package className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </motion.div>
          )}

          {/* Help Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="mt-6 pt-4 border-t border-red-200 text-sm text-muted-foreground"
          >
            If the problem persists, please{' '}
            <button
              onClick={() => window.location.reload()}
              className="text-orange-600 hover:underline font-medium"
            >
              refresh the page
            </button>
            {' '}or contact support.
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface ComingSoonEmptyStateProps {
  /** Expected launch date */
  launchDate?: string;
  /** Notification signup callback */
  onNotifyMe?: (email: string) => void;
  /** CSS classes */
  className?: string;
}

/**
 * ComingSoonEmptyState Component
 * 
 * Shown when catering service is coming soon.
 */
export const ComingSoonEmptyState: React.FC<ComingSoonEmptyStateProps> = ({
  launchDate,
  onNotifyMe,
  className = '',
}) => {
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && onNotifyMe) {
      onNotifyMe(email);
      setSubmitted(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      <Card className="border-2 border-blue-200 bg-blue-50/50">
        <CardContent className="p-8 text-center">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="mx-auto mb-6"
          >
            <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="w-10 h-10 text-blue-600" />
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h3
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="text-2xl font-bold mb-3 text-blue-900"
          >
            Catering Service Coming Soon!
          </motion.h3>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="text-blue-700 mb-6 max-w-md mx-auto"
          >
            We're preparing something special for you. 
            Our catering service will be launching soon{launchDate ? ` on ${launchDate}` : ''}.
          </motion.p>

          {/* Notification Form */}
          {onNotifyMe && !submitted && (
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="max-w-md mx-auto"
            >
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="flex-1 min-h-[44px] px-4 rounded-md border border-input bg-background"
                  aria-label="Email address for notifications"
                />
                <Button
                  type="submit"
                  className="min-h-[44px] bg-blue-600 hover:bg-blue-700"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Notify Me
                </Button>
              </div>
            </motion.form>
          )}

          {/* Success Message */}
          {submitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800"
            >
              ✅ Thanks! We'll notify you when catering is available.
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
