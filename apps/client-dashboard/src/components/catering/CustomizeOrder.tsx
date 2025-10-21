/**
 * CustomizeOrder Component
 * 
 * Event customization step for catering orders. Handles event details,
 * date/time selection, guest count, and service type preferences.
 * 
 * Features:
 * - Real-time validation with error messages
 * - Min/max guest enforcement
 * - Minimum advance booking (3 days)
 * - Sticky order summary sidebar
 * - Live price calculation
 * - Field-level analytics tracking
 * - Auto-save on changes
 * - Accessibility (ARIA labels, keyboard navigation)
 * - Responsive design (stacks on mobile)
 */

import React, { useCallback, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { format, addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { CateringServiceType } from "@/types/catering";
import { PriceBreakdown } from "./AnimatedPrice";
import { useCateringContext } from "./CateringContext";
import {
  trackFieldFocused,
  trackFieldCompleted,
} from "@/utils/catering-analytics";

// ============================================================================
// Types
// ============================================================================

interface CustomizeOrderProps {
  /** Callback to go back to package selection */
  onBack?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_ADVANCE_DAYS = 3;
const MIN_EVENT_DATE = format(addDays(new Date(), MIN_ADVANCE_DAYS), "yyyy-MM-dd");

const SERVICE_TYPE_LABELS: Record<CateringServiceType, string> = {
  pickup: "Pickup",
  delivery: "Delivery",
  drop_off: "Drop Off",
  full_service: "Full Service",
};

const SERVICE_TYPE_DESCRIPTIONS: Record<CateringServiceType, string> = {
  pickup: "Pick up food from our location",
  delivery: "We deliver food to your venue",
  drop_off: "We deliver and set up, you serve",
  full_service: "Complete service with staff",
};

// ============================================================================
// Validation Helpers
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const validateOrderForm = (
  orderForm: any,
  selectedPackage: any
): ValidationResult => {
  const errors: string[] = [];

  if (!orderForm.event_name?.trim()) {
    errors.push("Please enter an event name");
  }

  if (!orderForm.event_date) {
    errors.push("Please select an event date");
  }

  if (orderForm.guest_count < selectedPackage.min_guests) {
    errors.push(`Minimum ${selectedPackage.min_guests} guests required`);
  }

  if (selectedPackage.max_guests && orderForm.guest_count > selectedPackage.max_guests) {
    errors.push(`Maximum ${selectedPackage.max_guests} guests allowed`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ============================================================================
// Sub-Components
// ============================================================================

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({ id, label, required, error, children }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-sm font-medium">
      {label}
      {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
    </Label>
    {children}
    {error && (
      <p className="text-sm text-red-500 flex items-center gap-2" role="alert">
        <AlertCircle className="w-5 h-5" />
        {error}
      </p>
    )}
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

export const CustomizeOrder: React.FC<CustomizeOrderProps> = ({ onBack }) => {
  const {
    selectedPackage,
    orderForm,
    updateOrderForm,
    setCurrentStep,
    fieldErrors,
    setFieldError,
    clearFieldError,
  } = useCateringContext();

  // Redirect if no package selected
  useEffect(() => {
    if (!selectedPackage) {
      setCurrentStep("packages");
    }
  }, [selectedPackage, setCurrentStep]);

  // Validate form
  const validation = useMemo(() => {
    if (!selectedPackage) return { isValid: false, errors: [] };
    return validateOrderForm(orderForm, selectedPackage);
  }, [orderForm, selectedPackage]);

  // Field change handlers with analytics
  const handleFieldChange = useCallback((
    fieldName: string,
    value: any,
    fieldType: string = "text"
  ) => {
    updateOrderForm({ [fieldName]: value });
    clearFieldError(fieldName);

    // Track field completion if value is non-empty
    if (value && value.toString().trim()) {
      trackFieldCompleted(
        fieldName,
        fieldType,
        value.toString().length,
        fieldName.includes("*") // Simple heuristic for required fields
      );
    }
  }, [updateOrderForm, clearFieldError]);

  const handleFieldFocus = useCallback((
    fieldName: string,
    fieldType: string,
    isRequired: boolean = false
  ) => {
    trackFieldFocused(fieldName, fieldType, isRequired);
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      setCurrentStep("packages");
    }
  }, [onBack, setCurrentStep]);

  // Handle continue
  const handleContinue = useCallback(() => {
    if (validation.isValid) {
      setCurrentStep("details");
    }
  }, [validation.isValid, setCurrentStep]);

  if (!selectedPackage) {
    return null; // Will redirect via useEffect
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 text-foreground">
          Customize Your Order
        </h2>
        <p className="text-muted-foreground text-lg">
          Package: <span className="font-semibold text-orange-600">{selectedPackage.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Event Name & Guest Count */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  id="event_name"
                  label="Event Name"
                  required
                  error={fieldErrors.event_name}
                >
                  <Input
                    id="event_name"
                    value={orderForm.event_name}
                    onChange={(e) => handleFieldChange("event_name", e.target.value, "text")}
                    onFocus={() => handleFieldFocus("event_name", "text", true)}
                    placeholder="Birthday Party, Corporate Event, etc."
                    aria-required="true"
                    aria-invalid={!!fieldErrors.event_name}
                  />
                </FormField>

                <FormField
                  id="guest_count"
                  label="Guest Count"
                  required
                  error={fieldErrors.guest_count}
                >
                  <Input
                    id="guest_count"
                    type="number"
                    value={orderForm.guest_count}
                    onChange={(e) => handleFieldChange("guest_count", parseInt(e.target.value) || 0, "number")}
                    onFocus={() => handleFieldFocus("guest_count", "number", true)}
                    min={selectedPackage.min_guests}
                    max={selectedPackage.max_guests || undefined}
                    aria-required="true"
                    aria-invalid={!!fieldErrors.guest_count}
                    aria-describedby="guest_count_hint"
                  />
                  <p id="guest_count_hint" className="text-xs text-muted-foreground mt-1">
                    Min: {selectedPackage.min_guests}
                    {selectedPackage.max_guests && `, Max: ${selectedPackage.max_guests}`}
                  </p>
                </FormField>
              </div>

              {/* Event Date & Start Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  id="event_date"
                  label="Event Date"
                  required
                  error={fieldErrors.event_date}
                >
                  <Input
                    id="event_date"
                    type="date"
                    value={orderForm.event_date}
                    onChange={(e) => handleFieldChange("event_date", e.target.value, "date")}
                    onFocus={() => handleFieldFocus("event_date", "date", true)}
                    min={MIN_EVENT_DATE}
                    aria-required="true"
                    aria-invalid={!!fieldErrors.event_date}
                    aria-describedby="event_date_hint"
                  />
                  <p id="event_date_hint" className="text-xs text-muted-foreground mt-1">
                    Minimum {MIN_ADVANCE_DAYS} days advance notice required
                  </p>
                </FormField>

                <FormField
                  id="event_start_time"
                  label="Start Time"
                  error={fieldErrors.event_start_time}
                >
                  <Input
                    id="event_start_time"
                    type="time"
                    value={orderForm.event_start_time}
                    onChange={(e) => handleFieldChange("event_start_time", e.target.value, "time")}
                    onFocus={() => handleFieldFocus("event_start_time", "time", false)}
                    aria-invalid={!!fieldErrors.event_start_time}
                  />
                </FormField>
              </div>

              {/* Service Type */}
              <FormField
                id="service_type"
                label="Service Type"
                required
                error={fieldErrors.service_type}
              >
                <Select
                  value={orderForm.service_type}
                  onValueChange={(value: CateringServiceType) => 
                    handleFieldChange("service_type", value, "select")
                  }
                >
                  <SelectTrigger
                    aria-required="true"
                    aria-invalid={!!fieldErrors.service_type}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SERVICE_TYPE_LABELS) as CateringServiceType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{SERVICE_TYPE_LABELS[type]}</span>
                          <span className="text-xs text-muted-foreground">
                            {SERVICE_TYPE_DESCRIPTIONS[type]}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {/* Special Instructions */}
              <FormField
                id="special_instructions"
                label="Special Instructions"
                error={fieldErrors.special_instructions}
              >
                <Textarea
                  id="special_instructions"
                  value={orderForm.special_instructions || ""}
                  onChange={(e) => handleFieldChange("special_instructions", e.target.value, "textarea")}
                  onFocus={() => handleFieldFocus("special_instructions", "textarea", false)}
                  placeholder="Any special requests, dietary restrictions, setup requirements, etc."
                  rows={4}
                  aria-invalid={!!fieldErrors.special_instructions}
                />
              </FormField>
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
              size="lg"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Packages
            </Button>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Package Info */}
              <div>
                <h4 className="font-semibold text-lg">{selectedPackage.name}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                  {selectedPackage.description}
                </p>
              </div>

              <Separator />

              {/* Price Breakdown */}
              <PriceBreakdown
                pricePerPerson={selectedPackage.price_per_person}
                guestCount={orderForm.guest_count}
                fees={[]}
                showDetails={true}
              />

              {/* Validation Errors */}
              {!validation.isValid && validation.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription>
                    <ul className="text-sm space-y-1 mt-1">
                      {validation.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Continue Button */}
              <Button
                onClick={handleContinue}
                disabled={!validation.isValid}
                size="lg"
                className="w-full bg-orange-600 hover:bg-orange-700 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Continue to contact details"
              >
                Continue to Contact Details
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Accessibility: Screen reader announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {validation.isValid 
          ? "Form is valid. You can continue to contact details."
          : `Form has ${validation.errors.length} error${validation.errors.length !== 1 ? 's' : ''}. Please fix them to continue.`
        }
      </div>
    </motion.div>
  );
};

// ============================================================================
// Display Name
// ============================================================================

CustomizeOrder.displayName = "CustomizeOrder";

// ============================================================================
// Export
// ============================================================================

export default CustomizeOrder;
