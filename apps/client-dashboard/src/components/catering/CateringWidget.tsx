import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  ChefHat,
  Users,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { useCateringData } from "@/hooks/useCateringData";
import { useTenantBySlug } from "@/hooks/useTenantBySlug";
import ErrorBoundary from "@/components/booking/ErrorBoundary";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CateringProvider, useCateringContext } from "./CateringContext";
import { PackageSelection } from "./PackageSelection";
import { CustomizeOrder } from "./CustomizeOrder";
import { ContactDetails } from "./ContactDetails";
import { OrderConfirmation } from "./OrderConfirmation";

interface CateringWidgetProps {
  slug: string;
}

/**
 * Main Catering Widget Component
 * 
 * Wraps the entire catering flow in CateringProvider and renders the appropriate
 * step component based on the current state.
 */
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

  // Enhanced error handling with user feedback
  const displayError = tenantError || cateringError;
  const isInDemoMode =
    !tablesExist && diagnosticInfo?.cateringTablesAvailable === false;

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

  return (
    <ErrorBoundary>
      <CateringProvider slug={slug} tenantId={tenant.id}>
        <CateringWidgetContent
          tenant={tenant}
          packages={packages || []}
          createOrder={createOrder}
          loading={packagesLoading}
        />
      </CateringProvider>
    </ErrorBoundary>
  );
};

/**
 * Inner Widget Content Component
 * 
 * Renders the appropriate step component based on current state from CateringContext.
 */
interface CateringWidgetContentProps {
  tenant: { id: string; name: string; contact_email?: string; contact_phone?: string };
  packages: any[];
  createOrder: (data: any) => Promise<void>;
  loading: boolean;
}

const CateringWidgetContent: React.FC<CateringWidgetContentProps> = ({
  tenant,
  packages,
  createOrder,
  loading,
}) => {
  const { currentStep, setCurrentStep } = useCateringContext();

  return (
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
            {/* Step 1: Package Selection - NEW COMPONENT */}
            {currentStep === "packages" && (
              <PackageSelection
                packages={packages}
                loading={loading}
                restaurantName={tenant.name}
                contactEmail={tenant.contact_email}
                contactPhone={tenant.contact_phone}
              />
            )}

            {/* Step 2: Customize Package - NEW COMPONENT */}
            {currentStep === "customize" && (
              <CustomizeOrder />
            )}

            {/* Step 3: Contact Details - NEW COMPONENT */}
            {currentStep === "details" && (
              <ContactDetails tenantId={tenant.id} />
            )}

            {/* Step 4: Confirmation - NEW COMPONENT */}
            {currentStep === "confirmation" && (
              <OrderConfirmation />
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
  );
};

export default CateringWidget;
