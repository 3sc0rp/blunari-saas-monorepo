/**
 * ContactDetails Component
 * 
 * Final step before order submission. Collects contact information,
 * venue details, and handles order submission with comprehensive validation.
 * 
 * Features:
 * - Real-time email/phone validation
 * - Accessible error messages (ARIA attributes)
 * - Visual error indicators
 * - Optional venue information
 * - Submission loading state
 * - Error recovery with detailed messages
 * - Field-level analytics tracking
 * - Auto-save on changes
 * - Keyboard navigation support
 */

import React, { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ArrowLeft, AlertCircle, Mail, Phone, MapPin, User } from "lucide-react";
import { useCateringContext } from "./CateringContext";
import { useCateringData } from "@/hooks/useCateringData";
import {
  emailSchema,
  phoneSchema,
  nameSchema,
} from "@/utils/catering-validation";
import {
  trackFieldFocused,
  trackFieldCompleted,
  trackFieldError,
  trackOrderSubmitted,
  trackOrderFailed,
} from "@/utils/catering-analytics";
import { calculateTotalPriceCents, calculateCateringPrice } from "@/utils/catering-pricing";

// ============================================================================
// Types
// ============================================================================

interface ContactDetailsProps {
  /** Callback to go back to customize step */
  onBack?: () => void;
  
  /** Tenant ID for creating the order */
  tenantId?: string;
}

// ============================================================================
// Validation Helpers
// ============================================================================

interface FieldValidation {
  isValid: boolean;
  error?: string;
}

const validateField = (
  fieldName: string,
  value: string
): FieldValidation => {
  try {
    switch (fieldName) {
      case "contact_email":
        emailSchema.validate(value);
        return { isValid: true };
      
      case "contact_phone":
        if (!value) return { isValid: true }; // Optional field
        phoneSchema.validate(value);
        return { isValid: true };
      
      case "contact_name":
        nameSchema.validate(value);
        return { isValid: true };
      
      default:
        return { isValid: true };
    }
  } catch (error: any) {
    return {
      isValid: false,
      error: error.message || "Invalid value",
    };
  }
};

const canSubmit = (orderForm: any, fieldErrors: Record<string, string>): boolean => {
  // Check required fields
  if (!orderForm.contact_name?.trim()) return false;
  if (!orderForm.contact_email?.trim()) return false;
  
  // Check for any field errors
  if (Object.keys(fieldErrors).some(key => fieldErrors[key])) return false;
  
  return true;
};

// ============================================================================
// Sub-Components
// ============================================================================

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({ 
  id, 
  label, 
  required, 
  error, 
  icon,
  children 
}) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-sm font-medium flex items-center gap-2">
      {icon}
      {label}
      {required && (
        <span className="text-red-500" aria-label="required">*</span>
      )}
    </Label>
    {children}
    {error && (
      <p 
        id={`${id}-error`}
        className="text-sm text-red-600 flex items-center gap-1" 
        role="alert"
      >
        <AlertCircle className="w-3 h-3 flex-shrink-0" />
        {error}
      </p>
    )}
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

export const ContactDetails: React.FC<ContactDetailsProps> = ({ 
  onBack,
  tenantId 
}) => {
  const {
    orderForm,
    updateOrderForm,
    setCurrentStep,
    fieldErrors,
    setFieldError,
    clearFieldError,
    selectedPackage,
    setOrderConfirmed,
    getTenantId,
    getSessionId,
  } = useCateringContext();

  const { createOrder } = useCateringData(tenantId || getTenantId());

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Field change handler with validation
  const handleFieldChange = useCallback((
    fieldName: string,
    value: string,
    fieldType: string = "text"
  ) => {
    updateOrderForm({ [fieldName]: value });
    clearFieldError(fieldName);

    // Track field completion
    if (value.trim()) {
      trackFieldCompleted(fieldName, fieldType, value.length, fieldName.includes("name") || fieldName.includes("email"));
    }
  }, [updateOrderForm, clearFieldError]);

  // Field blur handler with validation
  const handleFieldBlur = useCallback((
    fieldName: string,
    value: string,
    fieldType: string = "text"
  ) => {
    const validation = validateField(fieldName, value);
    
    if (!validation.isValid && validation.error) {
      setFieldError(fieldName, validation.error);
      trackFieldError(fieldName, fieldType, validation.error, "validation", fieldName.includes("name") || fieldName.includes("email"));
    }
  }, [setFieldError]);

  // Field focus handler
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
      setCurrentStep("customize");
    }
  }, [onBack, setCurrentStep]);

  // Handle order submission
  const handleSubmit = useCallback(async () => {
    if (!selectedPackage || !canSubmit(orderForm, fieldErrors)) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // Create order request
      const orderRequest = {
        package_id: selectedPackage.id,
        event_name: orderForm.event_name,
        event_date: orderForm.event_date,
        event_start_time: orderForm.event_start_time,
        event_end_time: orderForm.event_end_time,
        guest_count: orderForm.guest_count,
        service_type: orderForm.service_type,
        contact_name: orderForm.contact_name,
        contact_email: orderForm.contact_email,
        contact_phone: orderForm.contact_phone,
        venue_name: orderForm.venue_name,
        venue_address: orderForm.venue_address,
        special_instructions: orderForm.special_instructions,
        dietary_requirements: orderForm.dietary_requirements,
      };

      // Submit order
      await createOrder(orderRequest);

      // Calculate total price using new pricing utility
      const totalPriceCents = calculateTotalPriceCents(selectedPackage, orderForm.guest_count);

      // Track successful submission
      trackOrderSubmitted({
        package_id: selectedPackage.id,
        guest_count: orderForm.guest_count,
        service_type: orderForm.service_type,
        total_price_cents: totalPriceCents,
        has_special_instructions: Boolean(orderForm.special_instructions),
        has_dietary_requirements: orderForm.dietary_requirements && orderForm.dietary_requirements.length > 0,
        time_to_complete_seconds: 0, // Will be calculated by analytics utility
        draft_restored: false, // TODO: track this properly if draft was restored
        tenant_id: tenantId || getTenantId(),
        session_id: getSessionId(),
      });

      // Navigate to confirmation
      setOrderConfirmed(true);
      setCurrentStep("confirmation");

    } catch (error: any) {
      const errorMessage = error.message || "An unexpected error occurred. Please try again.";
      setSubmitError(errorMessage);

      // Track failed submission
      trackOrderFailed(
        errorMessage,
        error.code || "unknown"
      );

    } finally {
      setSubmitting(false);
    }
  }, [
    selectedPackage,
    orderForm,
    fieldErrors,
    createOrder,
    setOrderConfirmed,
    setCurrentStep,
  ]);

  // Check if form can be submitted
  const isSubmittable = useMemo(() => {
    return canSubmit(orderForm, fieldErrors);
  }, [orderForm, fieldErrors]);

  // Count validation errors
  const errorCount = useMemo(() => {
    return Object.keys(fieldErrors).filter(key => fieldErrors[key]).length;
  }, [fieldErrors]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-3xl mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 text-foreground">
          Contact Details
        </h2>
        <p className="text-muted-foreground text-lg">
          Almost there! Just need your contact information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Your Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              id="contact_name"
              label="Full Name"
              required
              error={fieldErrors.contact_name}
              icon={<User className="w-4 h-4 text-muted-foreground" />}
            >
              <Input
                id="contact_name"
                value={orderForm.contact_name}
                onChange={(e) => handleFieldChange("contact_name", e.target.value, "text")}
                onBlur={(e) => handleFieldBlur("contact_name", e.target.value, "text")}
                onFocus={() => handleFieldFocus("contact_name", "text", true)}
                placeholder="John Doe"
                aria-required="true"
                aria-invalid={!!fieldErrors.contact_name}
                aria-describedby={fieldErrors.contact_name ? "contact_name-error" : undefined}
                className={fieldErrors.contact_name ? "border-red-500 focus:border-red-500" : ""}
              />
            </FormField>

            <FormField
              id="contact_phone"
              label="Phone Number"
              error={fieldErrors.contact_phone}
              icon={<Phone className="w-4 h-4 text-muted-foreground" />}
            >
              <Input
                id="contact_phone"
                type="tel"
                value={orderForm.contact_phone || ""}
                onChange={(e) => handleFieldChange("contact_phone", e.target.value, "tel")}
                onBlur={(e) => handleFieldBlur("contact_phone", e.target.value, "tel")}
                onFocus={() => handleFieldFocus("contact_phone", "tel", false)}
                placeholder="(555) 123-4567"
                aria-invalid={!!fieldErrors.contact_phone}
                aria-describedby={fieldErrors.contact_phone ? "contact_phone-error" : undefined}
                className={fieldErrors.contact_phone ? "border-red-500 focus:border-red-500" : ""}
              />
            </FormField>

            <div className="md:col-span-2">
              <FormField
                id="contact_email"
                label="Email Address"
                required
                error={fieldErrors.contact_email}
                icon={<Mail className="w-4 h-4 text-muted-foreground" />}
              >
                <Input
                  id="contact_email"
                  type="email"
                  value={orderForm.contact_email}
                  onChange={(e) => handleFieldChange("contact_email", e.target.value, "email")}
                  onBlur={(e) => handleFieldBlur("contact_email", e.target.value, "email")}
                  onFocus={() => handleFieldFocus("contact_email", "email", true)}
                  placeholder="john@example.com"
                  aria-required="true"
                  aria-invalid={!!fieldErrors.contact_email}
                  aria-describedby={fieldErrors.contact_email ? "contact_email-error" : undefined}
                  className={fieldErrors.contact_email ? "border-red-500 focus:border-red-500" : ""}
                />
              </FormField>
            </div>
          </div>

          <Separator />

          {/* Venue Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Venue Information
              <span className="text-sm text-muted-foreground font-normal ml-2">(Optional)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                id="venue_name"
                label="Venue Name"
              >
                <Input
                  id="venue_name"
                  value={orderForm.venue_name || ""}
                  onChange={(e) => handleFieldChange("venue_name", e.target.value, "text")}
                  onFocus={() => handleFieldFocus("venue_name", "text", false)}
                  placeholder="Event hall, park, office, etc."
                />
              </FormField>
            </div>

            <FormField
              id="venue_address"
              label="Venue Address"
            >
              <Textarea
                id="venue_address"
                value={orderForm.venue_address || ""}
                onChange={(e) => handleFieldChange("venue_address", e.target.value, "textarea")}
                onFocus={() => handleFieldFocus("venue_address", "textarea", false)}
                placeholder="Full address including city, state, and ZIP code"
                rows={3}
              />
            </FormField>
          </div>

          {/* Error Messages */}
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">Unable to Submit Order</p>
                <p className="text-sm mt-1">{submitError}</p>
              </AlertDescription>
            </Alert>
          )}

          {errorCount > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">Please Fix Validation Errors</p>
                <p className="text-sm mt-1">
                  {errorCount} field{errorCount !== 1 ? 's' : ''} require{errorCount === 1 ? 's' : ''} your attention.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={submitting}
              className="flex items-center gap-2 sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Order Details
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={!isSubmittable || submitting}
              className="flex-1 min-h-[44px] bg-orange-600 hover:bg-orange-700 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={submitting ? "Submitting your catering request, please wait" : "Submit catering request"}
            >
              {submitting ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                  Submitting Your Request...
                </>
              ) : (
                "Submit Catering Request"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility: Screen reader announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {submitting && "Submitting your catering request, please wait."}
        {submitError && `Error: ${submitError}`}
        {isSubmittable ? "Form is complete. You can submit your request." : "Please complete all required fields to submit."}
      </div>
    </motion.div>
  );
};

// ============================================================================
// Display Name
// ============================================================================

ContactDetails.displayName = "ContactDetails";

// ============================================================================
// Export
// ============================================================================

export default ContactDetails;
