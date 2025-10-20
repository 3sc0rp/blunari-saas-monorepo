/**
 * OrderConfirmation Component
 * 
 * Success screen displayed after successful order submission.
 * Shows order summary with animated success message and allows
 * users to place another order.
 * 
 * Features:
 * - Celebratory success animation
 * - Complete order summary
 * - Animated price display
 * - Formatted date/time display
 * - Clear call-to-action
 * - Accessible announcements
 * - Social proof indicators
 * - Responsive layout
 */

import React, { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Calendar,
  Users,
  ChefHat,
  Mail,
  Phone,
  MapPin,
  RefreshCcw,
} from "lucide-react";
import { AnimatedPrice } from "./AnimatedPrice";
import { useCateringContext } from "./CateringContext";
import { CateringServiceType } from "@/types/catering";
import { calculateCateringPrice } from "@/utils/catering-pricing";

// ============================================================================
// Types
// ============================================================================

interface OrderConfirmationProps {
  /** Callback when user wants to place another order */
  onPlaceAnother?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const SERVICE_TYPE_LABELS: Record<CateringServiceType, string> = {
  pickup: "Pickup",
  delivery: "Delivery",
  drop_off: "Drop Off",
  full_service: "Full Service",
};

// ============================================================================
// Animation Variants
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1] as any, // easeOut cubic-bezier
    },
  },
};

const successIconVariants = {
  hidden: { scale: 0, rotate: -180 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring" as any,
      stiffness: 260,
      damping: 20,
      delay: 0.1,
    },
  },
};

// ============================================================================
// Sub-Components
// ============================================================================

interface OrderDetailRowProps {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

const OrderDetailRow: React.FC<OrderDetailRowProps> = ({ icon, label, value }) => (
  <div className="flex items-start justify-between py-2">
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span>{label}:</span>
    </div>
    <div className="font-medium text-right">{value}</div>
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

export const OrderConfirmation: React.FC<OrderConfirmationProps> = ({
  onPlaceAnother,
}) => {
  const {
    selectedPackage,
    orderForm,
    resetForm,
  } = useCateringContext();

  // Calculate total price using new pricing utility
  const priceCalculation = useMemo(() => {
    if (!selectedPackage) return null;
    return calculateCateringPrice(selectedPackage, orderForm.guest_count);
  }, [selectedPackage, orderForm.guest_count]);

  const totalPrice = priceCalculation?.subtotal || 0;

  // Format event date
  const formattedDate = useMemo(() => {
    if (!orderForm.event_date) return "";
    try {
      return format(new Date(orderForm.event_date), "PPPP");
    } catch {
      return orderForm.event_date;
    }
  }, [orderForm.event_date]);

  // Handle placing another order
  const handlePlaceAnother = useCallback(() => {
    if (onPlaceAnother) {
      onPlaceAnother();
    } else {
      resetForm();
    }
  }, [onPlaceAnother, resetForm]);

  if (!selectedPackage) {
    return null;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-3xl mx-auto"
    >
      {/* Success Message */}
      <div className="text-center mb-8">
        <motion.div
          variants={successIconVariants}
          initial="hidden"
          animate="visible"
        >
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" strokeWidth={2} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <h2 className="text-4xl font-bold mb-3 text-foreground">
            Request Submitted Successfully!
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Thank you for your catering request. We'll review the details and 
            contact you shortly to confirm your order and discuss any final details.
          </p>
        </motion.div>
      </div>

      {/* Order Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
            <CardTitle className="text-2xl flex items-center gap-2">
              <ChefHat className="w-6 h-6 text-orange-600" />
              Order Summary
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Event Information */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-lg mb-3">Event Details</h3>
              
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-lg">{orderForm.event_name}</p>
                  <p className="text-muted-foreground">
                    {formattedDate}
                  </p>
                  {orderForm.event_start_time && (
                    <p className="text-sm text-muted-foreground">
                      Start time: {orderForm.event_start_time}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Order Details */}
            <div className="space-y-2">
              <OrderDetailRow
                icon={<ChefHat className="w-4 h-4" />}
                label="Package"
                value={
                  <div className="text-right">
                    <div className="font-semibold">{selectedPackage.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ${selectedPackage.price_per_person}/person
                    </div>
                  </div>
                }
              />

              <OrderDetailRow
                icon={<Users className="w-4 h-4" />}
                label="Guests"
                value={orderForm.guest_count}
              />

              <OrderDetailRow
                label="Service Type"
                value={
                  <Badge variant="secondary" className="font-normal">
                    {SERVICE_TYPE_LABELS[orderForm.service_type]}
                  </Badge>
                }
              />
            </div>

            <Separator />

            {/* Contact Information */}
            <div className="space-y-2">
              <h3 className="font-semibold mb-3">Contact Information</h3>
              
              <OrderDetailRow
                icon={<Mail className="w-4 h-4" />}
                label="Email"
                value={orderForm.contact_email}
              />

              {orderForm.contact_phone && (
                <OrderDetailRow
                  icon={<Phone className="w-4 h-4" />}
                  label="Phone"
                  value={orderForm.contact_phone}
                />
              )}

              {orderForm.venue_name && (
                <OrderDetailRow
                  icon={<MapPin className="w-4 h-4" />}
                  label="Venue"
                  value={
                    <div className="text-right">
                      <div>{orderForm.venue_name}</div>
                      {orderForm.venue_address && (
                        <div className="text-sm text-muted-foreground">
                          {orderForm.venue_address}
                        </div>
                      )}
                    </div>
                  }
                />
              )}
            </div>

            {orderForm.special_instructions && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Special Instructions</h3>
                  <p className="text-sm text-muted-foreground bg-muted/30 rounded p-3">
                    {orderForm.special_instructions}
                  </p>
                </div>
              </>
            )}

            <Separator />

            {/* Total Price with Breakdown */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4">
              {priceCalculation && priceCalculation.breakdown && (
                <div className="mb-3 pb-3 border-b border-orange-200">
                  <p className="text-sm text-muted-foreground">{priceCalculation.breakdown}</p>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Estimated Total:</span>
                <div className="text-3xl font-bold text-orange-600">
                  <AnimatedPrice 
                    value={totalPrice}
                    currency="$"
                    duration={0.8}
                    showCents={true}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Final price may vary based on additional services and requirements
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Next Steps */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.3 }}
        className="mt-8 space-y-6"
      >
        {/* Action Button */}
        <div className="text-center">
          <Button
            onClick={handlePlaceAnother}
            size="lg"
            variant="outline"
            className="gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Place Another Order
          </Button>
        </div>

        {/* Trust Indicators */}
        <div className="bg-muted/30 rounded-lg p-6">
          <h3 className="font-semibold text-center mb-4">What Happens Next?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6 text-orange-600" />
              </div>
              <h4 className="font-medium">Email Confirmation</h4>
              <p className="text-sm text-muted-foreground">
                You'll receive a confirmation email shortly
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
                <Phone className="w-6 h-6 text-orange-600" />
              </div>
              <h4 className="font-medium">We'll Contact You</h4>
              <p className="text-sm text-muted-foreground">
                Our team will reach out to finalize details
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6 text-orange-600" />
              </div>
              <h4 className="font-medium">Enjoy Your Event</h4>
              <p className="text-sm text-muted-foreground">
                We'll make your event memorable
              </p>
            </div>
          </div>
        </div>

        {/* Footer Trust Badges */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              🔒 Secure & Private
            </span>
            <span className="flex items-center gap-1">
              ⚡ Quick Response
            </span>
            <span className="flex items-center gap-1">
              ⭐ 5-Star Service
            </span>
          </div>
        </div>
      </motion.div>

      {/* Accessibility: Screen reader announcement */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        Your catering request for {orderForm.event_name} on {formattedDate} has been 
        successfully submitted. Estimated total: ${totalPrice.toFixed(2)}. 
        You will receive a confirmation email shortly.
      </div>
    </motion.div>
  );
};

// ============================================================================
// Display Name
// ============================================================================

OrderConfirmation.displayName = "OrderConfirmation";

// ============================================================================
// Export
// ============================================================================

export default OrderConfirmation;
