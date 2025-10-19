import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Clock,
  Users,
  ChefHat,
  Calendar,
  Mail,
  Phone,
  MapPin,
  FileText,
  Star,
  ArrowLeft,
  AlertCircle,
  Save,
  RefreshCcw,
} from "lucide-react";
import { useCateringData } from "@/hooks/useCateringData";
import { useTenantBySlug } from "@/hooks/useTenantBySlug";
import {
  CreateCateringOrderRequest,
  CateringPackage,
  CateringServiceType,
  DietaryRestriction,
} from "@/types/catering";
import ErrorBoundary from "@/components/booking/ErrorBoundary";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  sanitizeOrderForm,
  cateringOrderSchema,
  emailSchema,
  phoneSchema,
  nameSchema,
  validateField,
} from "@/utils/catering-validation";
import {
  saveDraft,
  loadDraft,
  clearDraft,
  hasDraft,
  getDraftAge,
  createAutoSave,
  cleanupExpiredDrafts,
} from "@/utils/catering-autosave";
import {
  trackWidgetViewed,
  trackPackageViewed,
  trackPackageSelected,
  trackStepCompleted,
  trackFieldFocused,
  trackFieldCompleted,
  trackFieldError,
  trackDraftSaved,
  trackDraftRestored,
  trackOrderSubmitted,
  trackOrderFailed,
  startStepTimer,
  setupAbandonmentTracking,
  getCompletedFields,
  getSessionDuration,
} from "@/utils/catering-analytics";
import { AnimatedPrice, PriceBreakdown } from "./AnimatedPrice";
import { NoPackagesEmptyState, LoadingErrorEmptyState } from "./EmptyStates";

interface CateringWidgetProps {
  slug: string;
}

type Step = "packages" | "customize" | "details" | "confirmation";

interface OrderForm {
  package_id?: string;
  event_name: string;
  event_date: string;
  event_start_time: string;
  event_end_time?: string;
  guest_count: number;
  service_type: CateringServiceType;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  venue_name?: string;
  venue_address?: string;
  delivery_address?: string;
  special_instructions?: string;
  dietary_requirements: DietaryRestriction[];
}

const CateringWidget: React.FC<CateringWidgetProps> = ({ slug }) => {
  const {
    tenant,
    loading: tenantLoading,
    error: tenantError,
  } = useTenantBySlug(slug);
  const {
    packages,
    loading: packagesLoading,
    createOrder,
    error: cateringError,
    tablesExist,
    diagnosticInfo,
  } = useCateringData(tenant?.id);

  const [currentStep, setCurrentStep] = useState<Step>("packages");
  const [selectedPackage, setSelectedPackage] =
    useState<CateringPackage | null>(null);
  const [orderForm, setOrderForm] = useState<OrderForm>({
    event_name: "",
    event_date: "",
    event_start_time: "12:00",
    guest_count: 50,
    service_type: "drop_off",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    venue_name: "",
    venue_address: "",
    special_instructions: "",
    dietary_requirements: [],
  });
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // Auto-save state
  const [showDraftNotification, setShowDraftNotification] = useState(false);
  const [draftAge, setDraftAge] = useState<string | null>(null);
  
  // Create auto-save function with debouncing
  const autoSave = useCallback(
    createAutoSave(slug, 2000),
    [slug]
  );

  // Enhanced error handling with user feedback
  const displayError = tenantError || cateringError || submitError;
  const isInDemoMode =
    !tablesExist && diagnosticInfo?.cateringTablesAvailable === false;

  // Cleanup expired drafts on mount
  useEffect(() => {
    cleanupExpiredDrafts();
  }, []);

  // Load draft on mount
  useEffect(() => {
    if (!slug) return;

    const draft = loadDraft(slug);
    if (draft) {
      setShowDraftNotification(true);
      setDraftAge(getDraftAge(slug));
    }
  }, [slug]);

  // Auto-save form data whenever it changes
  useEffect(() => {
    if (!slug || orderConfirmed) return;
    
    // Don't save empty forms
    if (!orderForm.event_name && !orderForm.contact_name) return;

    autoSave(orderForm, selectedPackage?.id);
  }, [orderForm, selectedPackage, slug, orderConfirmed, autoSave]);

  // Clear draft on successful submission
  useEffect(() => {
    if (orderConfirmed && slug) {
      clearDraft(slug);
    }
  }, [orderConfirmed, slug]);

  // Track widget view on mount
  useEffect(() => {
    if (tenant?.id && slug) {
      trackWidgetViewed(tenant.id, slug);
    }
  }, [tenant?.id, slug]);

  // Track step changes
  useEffect(() => {
    if (currentStep) {
      startStepTimer(currentStep);
      
      const stepNumber = 
        currentStep === 'packages' ? 1 :
        currentStep === 'customize' ? 2 :
        currentStep === 'details' ? 3 : 4;
      
      if (stepNumber > 1) {
        const previousStep = 
          stepNumber === 2 ? 'packages' :
          stepNumber === 3 ? 'customize' : 'details';
        trackStepCompleted(previousStep as any, stepNumber - 1);
      }
    }
  }, [currentStep]);

  // Track draft saves
  useEffect(() => {
    if (!slug || orderConfirmed) return;
    if (orderForm.event_name || orderForm.contact_name) {
      trackDraftSaved();
    }
  }, [orderForm.event_name, orderForm.contact_name, slug, orderConfirmed]);

  // Setup abandonment tracking
  useEffect(() => {
    const getCurrentStep = () => currentStep;
    const getCompletedFieldsList = () => getCompletedFields(orderForm);
    const getTotalFields = () => {
      const requiredFields = ['event_name', 'event_date', 'guest_count', 'contact_name', 'contact_email'];
      return requiredFields.length;
    };

    const cleanup = setupAbandonmentTracking(
      getCurrentStep,
      getCompletedFieldsList,
      getTotalFields
    );

    return cleanup;
  }, [currentStep, orderForm]);

  // Field validation with real-time feedback
  const validateFieldValue = useCallback(async (fieldName: string, value: any) => {
    let schema;
    
    switch (fieldName) {
      case 'contact_email':
        schema = emailSchema;
        break;
      case 'contact_phone':
        if (!value) return; // Optional field
        schema = phoneSchema;
        break;
      case 'contact_name':
      case 'event_name':
      case 'venue_name':
        schema = nameSchema;
        break;
      default:
        return;
    }

    const error = await validateField(fieldName, value, schema);
    
    if (error) {
      // Track field error
      trackFieldError(
        fieldName,
        fieldName.includes('email') ? 'email' :
        fieldName.includes('phone') ? 'tel' : 'text',
        error,
        'validation',
        ['contact_name', 'contact_email', 'event_name'].includes(fieldName)
      );
    } else if (value) {
      // Track field completion
      trackFieldCompleted(
        fieldName,
        fieldName.includes('email') ? 'email' :
        fieldName.includes('phone') ? 'tel' : 'text',
        typeof value === 'string' ? value.length : 0,
        ['contact_name', 'contact_email', 'event_name'].includes(fieldName)
      );
    }
    
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: error || '',
    }));
  }, []);

  // Restore draft handler
  const handleRestoreDraft = useCallback(() => {
    const draft = loadDraft(slug);
    if (draft?.data) {
      setOrderForm(prev => ({
        ...prev,
        ...draft.data,
      }));
      
      // If draft has a package ID, try to restore it
      if (draft.packageId && packages) {
        const pkg = packages.find(p => p.id === draft.packageId);
        if (pkg) {
          setSelectedPackage(pkg);
        }
      }
      
      // Track draft restoration
      if (draftAge) {
        trackDraftRestored(draftAge);
      }
    }
    setShowDraftNotification(false);
  }, [slug, packages, draftAge]);

  // Dismiss draft handler
  const handleDismissDraft = useCallback(() => {
    setShowDraftNotification(false);
    clearDraft(slug);
  }, [slug]);

  // Loading states with better UX
  if (tenantLoading || packagesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">
              {tenantLoading
                ? "Finding Restaurant..."
                : "Loading Catering Services"}
            </h2>
            <p className="text-muted-foreground">
              {tenantLoading
                ? "Please wait while we verify the restaurant details..."
                : "Please wait while we load your catering options..."}
            </p>
            {isInDemoMode && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  🎭 Demo mode with sample packages
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Enhanced error states with better messaging
  if (displayError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <ChefHat className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">
              {tenantError ? "Restaurant Not Found" : "Service Issue"}
            </h2>
            <p className="text-muted-foreground mb-4">
              {tenantError
                ? `The restaurant "${slug}" could not be found or is not available for catering.`
                : displayError}
            </p>
            {isInDemoMode && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-700">
                  ℹ️ This is a demo environment. Contact support for full
                  functionality.
                </p>
              </div>
            )}
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="mt-4"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <ChefHat className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Invalid Restaurant</h2>
            <p className="text-muted-foreground">
              Please check the catering link and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePackageSelect = (pkg: CateringPackage) => {
    // Track package selection
    trackPackageSelected({
      package_id: pkg.id,
      package_name: pkg.name,
      price_per_person: pkg.price_per_person,
      tenant_id: tenant?.id,
      tenant_slug: slug,
    });
    
    setSelectedPackage(pkg);
    setOrderForm((prev) => ({
      ...prev,
      package_id: pkg.id,
      guest_count: Math.max(prev.guest_count, pkg.min_guests),
      event_name: `${pkg.name} Event`,
    }));
    setCurrentStep("customize");
  };

  const handleOrderSubmit = async () => {
    if (!selectedPackage || !tenant) return;

    setSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});

    try {
      // Validate using Yup schema
      const validationSchema = cateringOrderSchema(
        selectedPackage.min_guests,
        selectedPackage.max_guests || undefined
      );

      // Validate form data
      await validationSchema.validate(orderForm, { abortEarly: false });

      // Sanitize all inputs before submission
      const sanitizedData = sanitizeOrderForm(orderForm);

      // Create order request
      const orderData: CreateCateringOrderRequest = {
        package_id: selectedPackage.id,
        ...sanitizedData,
      };

      // Submit order
      await createOrder(orderData);
      
      // Track successful order submission
      trackOrderSubmitted({
        package_id: selectedPackage.id,
        package_name: selectedPackage.name,
        guest_count: orderForm.guest_count,
        service_type: orderForm.service_type,
        total_price_cents: getTotalPrice(),
        has_special_instructions: !!orderForm.special_instructions,
        has_dietary_requirements: orderForm.dietary_requirements.length > 0,
        time_to_complete_seconds: getSessionDuration(),
        draft_restored: !!draftAge,
        tenant_id: tenant?.id,
        tenant_slug: slug,
      });
      
      // Success - clear draft and show confirmation
      clearDraft(slug);
      setOrderConfirmed(true);
      setCurrentStep("confirmation");
    } catch (error) {
      console.error("Error creating catering order:", error);
      
      if (error && typeof error === 'object' && 'inner' in error) {
        // Yup validation errors
        const validationError = error as { inner: Array<{ path?: string; message: string }> };
        const errors: Record<string, string> = {};
        validationError.inner.forEach((err) => {
          if (err.path) {
            errors[err.path] = err.message;
          }
        });
        setFieldErrors(errors);
        setSubmitError("Please fix the errors above and try again.");
        
        // Track validation failure
        trackOrderFailed(
          'Yup validation errors',
          'validation_error'
        );
      } else {
        // Generic error
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to submit catering order. Please try again.";
        setSubmitError(errorMessage);
        
        // Track submission failure
        trackOrderFailed(
          errorMessage,
          error instanceof Error ? error.name : 'unknown_error'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (priceInCents: number) => {
    if (typeof priceInCents !== "number" || isNaN(priceInCents)) {
      return "$0.00";
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(priceInCents / 100);
  };

  const getTotalPrice = () => {
    if (!selectedPackage || !orderForm.guest_count) return 0;
    return selectedPackage.price_per_person * orderForm.guest_count;
  };

  const validateGuestCount = (count: number) => {
    if (!selectedPackage) return true;
    return (
      count >= selectedPackage.min_guests &&
      (!selectedPackage.max_guests || count <= selectedPackage.max_guests)
    );
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
        {/* Header */}
        <div className="bg-white border-b shadow-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ChefHat className="w-8 h-8 text-orange-500" />
                <div>
                  <h1 className="text-xl font-bold">{tenant.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    Catering Services
                  </p>
                </div>
              </div>
              {currentStep !== "packages" && (
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep("packages")}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Packages
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Draft Recovery Notification */}
            {showDraftNotification && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <Save className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900 mb-1">
                      Saved Draft Found
                    </h3>
                    <p className="text-sm text-blue-700 mb-3">
                      We found a draft from {draftAge}. Would you like to continue where you left off?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleRestoreDraft}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <RefreshCcw className="w-4 h-4 mr-1" />
                        Restore Draft
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDismissDraft}
                      >
                        Start Fresh
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Progress Steps - Enhanced with ARIA labels */}
            <div className="mb-8">
              <nav aria-label="Catering order progress" className="flex items-center justify-between max-w-2xl mx-auto">
                {[
                  { key: "packages", label: "Choose Package", icon: ChefHat },
                  { key: "customize", label: "Customize", icon: Users },
                  { key: "details", label: "Details", icon: FileText },
                  {
                    key: "confirmation",
                    label: "Confirmation",
                    icon: CheckCircle,
                  },
                ].map((step, index) => {
                  const isActive = currentStep === step.key;
                  const isCompleted =
                    ["packages", "customize", "details"].indexOf(currentStep) >
                    ["packages", "customize", "details"].indexOf(step.key);
                  const IconComponent = step.icon;

                  return (
                    <div key={step.key} className="flex items-center">
                      <div
                        role="status"
                        aria-current={isActive ? "step" : undefined}
                        aria-label={`Step ${index + 1}: ${step.label}${isActive ? " (current)" : isCompleted ? " (completed)" : ""}`}
                        className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all min-h-[44px] ${
                          isActive
                            ? "bg-orange-100 text-orange-700"
                            : isCompleted
                              ? "bg-green-100 text-green-700"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <IconComponent className="w-5 h-5" aria-hidden="true" />
                        <span className="text-sm font-medium hidden sm:inline">
                          {step.label}
                        </span>
                      </div>
                      {index < 3 && (
                        <div
                          className={`w-8 h-0.5 mx-2 transition-colors ${
                            isCompleted ? "bg-green-300" : "bg-muted"
                          }`}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>

            <AnimatePresence mode="wait">
              {/* Step 1: Package Selection */}
              {currentStep === "packages" && (
                <motion.div
                  key="packages"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold mb-2">
                      Choose Your Catering Package
                    </h2>
                    <p className="text-muted-foreground">
                      Select from our professional catering packages
                    </p>
                  </div>

                  {packages && packages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {packages.map((pkg) => (
                        <motion.div
                          key={pkg.id}
                          whileHover={{ y: -2 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Card className="h-full cursor-pointer hover:shadow-lg transition-all border-2 hover:border-orange-200">
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <CardTitle className="text-lg">
                                  {pkg.name}
                                </CardTitle>
                                {pkg.popular && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-orange-100 text-orange-700"
                                  >
                                    <Star className="w-3 h-3 mr-1" />
                                    Popular
                                  </Badge>
                                )}
                              </div>
                              <div className="text-2xl font-bold text-orange-600">
                                <AnimatedPrice 
                                  value={pkg.price_per_person}
                                  currency="$"
                                  duration={0.5}
                                  showCents={true}
                                />
                                <span className="text-sm text-muted-foreground">
                                  /person
                                </span>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-muted-foreground mb-4">
                                {pkg.description}
                              </p>

                              <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                  <span>
                                    {pkg.min_guests}
                                    {pkg.max_guests
                                      ? ` - ${pkg.max_guests}`
                                      : "+"}{" "}
                                    guests
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1 mb-4">
                                {pkg.includes_setup && (
                                  <div className="flex items-center gap-2 text-sm text-green-600">
                                    <CheckCircle className="w-3 h-3" />
                                    Setup included
                                  </div>
                                )}
                                {pkg.includes_service && (
                                  <div className="flex items-center gap-2 text-sm text-green-600">
                                    <CheckCircle className="w-3 h-3" />
                                    Service staff included
                                  </div>
                                )}
                                {pkg.includes_cleanup && (
                                  <div className="flex items-center gap-2 text-sm text-green-600">
                                    <CheckCircle className="w-3 h-3" />
                                    Cleanup included
                                  </div>
                                )}
                              </div>

                              {pkg.dietary_accommodations &&
                                pkg.dietary_accommodations.length > 0 && (
                                  <div className="mb-4">
                                    <p className="text-xs text-muted-foreground mb-1">
                                      Dietary accommodations:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {pkg.dietary_accommodations.map(
                                        (diet) => (
                                          <Badge
                                            key={diet}
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            {diet.replace("_", " ")}
                                          </Badge>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}

                              <Button
                                onClick={() => handlePackageSelect(pkg)}
                                className="w-full min-h-[44px] bg-orange-600 hover:bg-orange-700 text-base font-medium"
                                aria-label={`Select ${pkg.name} package`}
                              >
                                Select Package
                              </Button>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <NoPackagesEmptyState
                      restaurantName={tenant?.name || "this restaurant"}
                      contactEmail={tenant?.contact_email}
                      contactPhone={tenant?.contact_phone}
                      onContactClick={() => {
                        console.log('Contact restaurant clicked');
                        // Track contact attempt
                        if (window.gtag) {
                          window.gtag('event', 'catering_no_packages_contact', {
                            tenant_id: tenant?.id,
                            tenant_slug: slug,
                          });
                        }
                      }}
                    />
                  )}
                </motion.div>
              )}

              {/* Step 2: Customize Package */}
              {currentStep === "customize" && selectedPackage && (
                <motion.div
                  key="customize"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">
                      Customize Your Order
                    </h2>
                    <p className="text-muted-foreground">
                      Package: {selectedPackage.name}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Order Form */}
                    <div className="lg:col-span-2">
                      <Card>
                        <CardHeader>
                          <CardTitle>Event Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="event_name">Event Name</Label>
                              <Input
                                id="event_name"
                                value={orderForm.event_name}
                                onChange={(e) =>
                                  setOrderForm((prev) => ({
                                    ...prev,
                                    event_name: e.target.value,
                                  }))
                                }
                                placeholder="Birthday Party, Corporate Event, etc."
                              />
                            </div>
                            <div>
                              <Label htmlFor="guest_count">Guest Count *</Label>
                              <Input
                                id="guest_count"
                                type="number"
                                value={orderForm.guest_count}
                                onChange={(e) =>
                                  setOrderForm((prev) => ({
                                    ...prev,
                                    guest_count: parseInt(e.target.value) || 0,
                                  }))
                                }
                                min={selectedPackage.min_guests}
                                max={selectedPackage.max_guests}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="event_date">Event Date *</Label>
                              <Input
                                id="event_date"
                                type="date"
                                value={orderForm.event_date}
                                onChange={(e) =>
                                  setOrderForm((prev) => ({
                                    ...prev,
                                    event_date: e.target.value,
                                  }))
                                }
                                min={format(
                                  addDays(new Date(), 3),
                                  "yyyy-MM-dd",
                                )}
                              />
                            </div>
                            <div>
                              <Label htmlFor="event_start_time">
                                Start Time
                              </Label>
                              <Input
                                id="event_start_time"
                                type="time"
                                value={orderForm.event_start_time}
                                onChange={(e) =>
                                  setOrderForm((prev) => ({
                                    ...prev,
                                    event_start_time: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="service_type">Service Type *</Label>
                            <Select
                              value={orderForm.service_type}
                              onValueChange={(value: CateringServiceType) =>
                                setOrderForm((prev) => ({
                                  ...prev,
                                  service_type: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pickup">Pickup</SelectItem>
                                <SelectItem value="delivery">
                                  Delivery
                                </SelectItem>
                                <SelectItem value="drop_off">
                                  Drop Off
                                </SelectItem>
                                <SelectItem value="full_service">
                                  Full Service
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="special_instructions">
                              Special Instructions
                            </Label>
                            <Textarea
                              id="special_instructions"
                              value={orderForm.special_instructions || ""}
                              onChange={(e) =>
                                setOrderForm((prev) => ({
                                  ...prev,
                                  special_instructions: e.target.value,
                                }))
                              }
                              placeholder="Any special requests, dietary restrictions, setup requirements, etc."
                              rows={3}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Order Summary */}
                    <div>
                      <Card className="sticky top-24">
                        <CardHeader>
                          <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium">
                                {selectedPackage.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {selectedPackage.description}
                              </p>
                            </div>

                            <Separator />

                            <PriceBreakdown
                              pricePerPerson={selectedPackage.price_per_person}
                              guestCount={orderForm.guest_count}
                              fees={[]}
                              showDetails={true}
                            />

                            {(!orderForm.event_date || 
                              !orderForm.event_name.trim() ||
                              orderForm.guest_count < selectedPackage.min_guests ||
                              (selectedPackage.max_guests && orderForm.guest_count > selectedPackage.max_guests)) && (
                              <div className="text-sm text-muted-foreground">
                                {!orderForm.event_name.trim() && (
                                  <p>• Please enter an event name</p>
                                )}
                                {!orderForm.event_date && (
                                  <p>• Please select an event date</p>
                                )}
                                {orderForm.guest_count < selectedPackage.min_guests && (
                                  <p>• Minimum {selectedPackage.min_guests} guests required</p>
                                )}
                                {selectedPackage.max_guests && orderForm.guest_count > selectedPackage.max_guests && (
                                  <p>• Maximum {selectedPackage.max_guests} guests allowed</p>
                                )}
                              </div>
                            )}

                            <Button
                              onClick={() => setCurrentStep("details")}
                              className="w-full min-h-[44px] bg-orange-600 hover:bg-orange-700 text-base font-medium"
                              disabled={
                                !orderForm.event_date || 
                                !orderForm.event_name.trim() ||
                                orderForm.guest_count < selectedPackage.min_guests ||
                                (selectedPackage.max_guests && orderForm.guest_count > selectedPackage.max_guests)
                              }
                              aria-label="Continue to contact details"
                            >
                              Continue to Contact Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Contact Details */}
              {currentStep === "details" && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">
                      Contact Information
                    </h2>
                    <p className="text-muted-foreground">
                      We'll use this information to confirm your catering order
                    </p>
                  </div>

                  <div className="max-w-2xl mx-auto">
                    <Card>
                      <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="contact_name">
                              Name * <span className="sr-only">Required field</span>
                            </Label>
                            <Input
                              id="contact_name"
                              value={orderForm.contact_name}
                              onChange={(e) => {
                                setOrderForm((prev) => ({
                                  ...prev,
                                  contact_name: e.target.value,
                                }));
                                validateFieldValue('contact_name', e.target.value);
                              }}
                              onBlur={(e) => validateFieldValue('contact_name', e.target.value)}
                              aria-invalid={!!fieldErrors.contact_name}
                              aria-describedby={fieldErrors.contact_name ? "contact_name-error" : undefined}
                              className={fieldErrors.contact_name ? "border-red-500" : ""}
                            />
                            {fieldErrors.contact_name && (
                              <p id="contact_name-error" className="text-sm text-red-600 mt-1" role="alert">
                                <AlertCircle className="w-3 h-3 inline mr-1" />
                                {fieldErrors.contact_name}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="contact_phone">Phone</Label>
                            <Input
                              id="contact_phone"
                              type="tel"
                              value={orderForm.contact_phone || ""}
                              onChange={(e) => {
                                setOrderForm((prev) => ({
                                  ...prev,
                                  contact_phone: e.target.value,
                                }));
                                validateFieldValue('contact_phone', e.target.value);
                              }}
                              onBlur={(e) => validateFieldValue('contact_phone', e.target.value)}
                              aria-invalid={!!fieldErrors.contact_phone}
                              aria-describedby={fieldErrors.contact_phone ? "contact_phone-error" : undefined}
                              className={fieldErrors.contact_phone ? "border-red-500" : ""}
                            />
                            {fieldErrors.contact_phone && (
                              <p id="contact_phone-error" className="text-sm text-red-600 mt-1" role="alert">
                                <AlertCircle className="w-3 h-3 inline mr-1" />
                                {fieldErrors.contact_phone}
                              </p>
                            )}
                          </div>
                          <div className="md:col-span-2">
                            <Label htmlFor="contact_email">
                              Email * <span className="sr-only">Required field</span>
                            </Label>
                            <Input
                              id="contact_email"
                              type="email"
                              value={orderForm.contact_email}
                              onChange={(e) => {
                                setOrderForm((prev) => ({
                                  ...prev,
                                  contact_email: e.target.value,
                                }));
                                validateFieldValue('contact_email', e.target.value);
                              }}
                              onBlur={(e) => validateFieldValue('contact_email', e.target.value)}
                              aria-invalid={!!fieldErrors.contact_email}
                              aria-describedby={fieldErrors.contact_email ? "contact_email-error" : undefined}
                              className={fieldErrors.contact_email ? "border-red-500" : ""}
                            />
                            {fieldErrors.contact_email && (
                              <p id="contact_email-error" className="text-sm text-red-600 mt-1" role="alert">
                                <AlertCircle className="w-3 h-3 inline mr-1" />
                                {fieldErrors.contact_email}
                              </p>
                            )}
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">
                            Venue Information
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="venue_name">Venue Name</Label>
                              <Input
                                id="venue_name"
                                value={orderForm.venue_name || ""}
                                onChange={(e) =>
                                  setOrderForm((prev) => ({
                                    ...prev,
                                    venue_name: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="venue_address">Venue Address</Label>
                            <Textarea
                              id="venue_address"
                              value={orderForm.venue_address || ""}
                              onChange={(e) =>
                                setOrderForm((prev) => ({
                                  ...prev,
                                  venue_address: e.target.value,
                                }))
                              }
                              rows={2}
                            />
                          </div>
                        </div>

                        {submitError && (
                          <div 
                            className="p-4 bg-red-50 border border-red-200 rounded-md" 
                            role="alert"
                            aria-live="polite"
                          >
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-red-900 mb-1">
                                  Unable to Submit Order
                                </p>
                                <p className="text-sm text-red-700">
                                  {submitError}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {Object.keys(fieldErrors).length > 0 && (
                          <div 
                            className="p-4 bg-yellow-50 border border-yellow-200 rounded-md"
                            role="alert"
                            aria-live="polite"
                          >
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-yellow-900 mb-1">
                                  Please Fix Validation Errors
                                </p>
                                <p className="text-sm text-yellow-700">
                                  Review the highlighted fields above and correct any errors.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <Button
                          onClick={handleOrderSubmit}
                          className="w-full min-h-[44px] bg-orange-600 hover:bg-orange-700 text-base font-medium"
                          disabled={
                            !orderForm.contact_name ||
                            !orderForm.contact_email ||
                            submitting ||
                            Object.keys(fieldErrors).some(key => fieldErrors[key])
                          }
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
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Confirmation */}
              {currentStep === "confirmation" && orderConfirmed && (
                <motion.div
                  key="confirmation"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center">
                    <div className="mb-8">
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h2 className="text-3xl font-bold mb-2">
                        Request Submitted!
                      </h2>
                      <p className="text-muted-foreground">
                        Your catering request has been submitted successfully.
                        We'll contact you soon to confirm the details.
                      </p>
                    </div>

                    <Card className="max-w-2xl mx-auto text-left">
                      <CardHeader>
                        <CardTitle>Order Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium">
                              Event: {orderForm.event_name}
                            </h4>
                            <p className="text-muted-foreground">
                              {format(new Date(orderForm.event_date), "PPP")} at{" "}
                              {orderForm.event_start_time}
                            </p>
                          </div>

                          <div className="flex justify-between">
                            <span>Package:</span>
                            <span>{selectedPackage?.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Guests:</span>
                            <span>{orderForm.guest_count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Service Type:</span>
                            <span>
                              {orderForm.service_type.replace("_", " ")}
                            </span>
                          </div>

                          <Separator />

                          <div className="flex justify-between font-semibold">
                            <span>Estimated Total:</span>
                            <AnimatedPrice 
                              value={getTotalPrice()}
                              currency="$"
                              duration={0.5}
                              showCents={true}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="mt-8">
                      <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                      >
                        Place Another Order
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div className="mt-12 text-center text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-4">
                <span>🔒 Secure & Private</span>
                <span>⚡ Quick Response</span>
                <span>📱 Mobile Optimized</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default CateringWidget;
