/**
 * PackageSelection Component
 * 
 * Displays a grid of catering packages with rich animations, accessibility,
 * and analytics tracking. Implements best practices for performance and UX.
 * 
 * Features:
 * - Responsive grid layout (1/2/3 columns)
 * - Animated price displays
 * - Hover effects and micro-interactions
 * - Popular package badges
 * - Dietary accommodation tags
 * - WCAG 2.1 AA compliant
 * - Analytics integration
 * - Empty state handling
 */

import React, { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Users,
  Star,
  ChefHat,
} from "lucide-react";
import { CateringPackage } from "@/types/catering";
import { AnimatedPrice } from "./AnimatedPrice";
import { NoPackagesEmptyState } from "./EmptyStates";
import {
  trackPackageViewed,
  trackPackageSelected,
} from "@/utils/catering-analytics";
import { useCateringContext } from "./CateringContext";
import { getPackageDisplayPrice } from "@/utils/catering-pricing";
import { OptimizedImage, DEFAULT_BLUR_DATA_URL } from "@/components/ui/optimized-image";
import { PackageGridSkeleton } from "./Skeletons";

// ============================================================================
// Types
// ============================================================================

interface PackageSelectionProps {
  /** Array of available catering packages */
  packages: CateringPackage[];
  
  /** Restaurant/tenant name for empty state */
  restaurantName?: string;
  
  /** Contact email for empty state */
  contactEmail?: string;
  
  /** Contact phone for empty state */
  contactPhone?: string;
  
  /** Callback when user clicks contact in empty state */
  onContactClick?: () => void;
  
  /** Loading state */
  loading?: boolean;
}

// ============================================================================
// Animation Variants
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1] as any, // easeOut cubic-bezier
    },
  },
};

// ============================================================================
// Sub-Components
// ============================================================================

interface PackageCardProps {
  package: CateringPackage;
  onSelect: (pkg: CateringPackage) => void;
  onView: (pkg: CateringPackage) => void;
}

const PackageCard: React.FC<PackageCardProps> = ({ package: pkg, onSelect, onView }) => {
  const handleCardHover = useCallback(() => {
    onView(pkg);
  }, [pkg, onView]);

  const handleSelect = useCallback(() => {
    onSelect(pkg);
  }, [pkg, onSelect]);

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onMouseEnter={handleCardHover}
      onFocus={handleCardHover}
    >
      <Card className="h-full cursor-pointer hover:shadow-xl transition-all border-2 hover:border-orange-200 focus-within:border-orange-300 overflow-hidden">
        {/* Package Image */}
        {pkg.image_url ? (
          <div className="relative h-48 w-full">
            <OptimizedImage
              src={pkg.image_url}
              alt={`${pkg.name} catering package`}
              aspectRatio="16/9"
              objectFit="cover"
              blurDataURL={DEFAULT_BLUR_DATA_URL}
              className="transition-transform duration-300 hover:scale-110"
            />
            {pkg.popular && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-orange-600 text-white shadow-lg px-3 py-1.5 min-h-[32px]">
                  <Star className="w-4 h-4 mr-1" fill="currentColor" />
                  Popular
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="relative h-48 w-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
            <ChefHat className="w-16 h-16 text-orange-300" aria-hidden="true" />
            {pkg.popular && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-orange-600 text-white shadow-lg px-3 py-1.5 min-h-[32px]">
                  <Star className="w-4 h-4 mr-1" fill="currentColor" />
                  Popular
                </Badge>
              </div>
            )}
          </div>
        )}
        
        <CardHeader>
          <CardTitle className="text-lg font-bold leading-tight">
            {pkg.name}
          </CardTitle>
          
          {/* Dynamic Price Display */}
          {(() => {
            const priceDisplay = getPackageDisplayPrice(pkg);
            return (
              <div className="space-y-1">
                <div className="text-2xl font-bold text-orange-600 flex items-baseline gap-1">
                  <AnimatedPrice 
                    value={priceDisplay.value}
                    currency="$"
                    duration={0.5}
                    showCents={true}
                  />
                  <span className="text-sm text-muted-foreground font-normal">
                    {priceDisplay.unit}
                  </span>
                </div>
                {priceDisplay.description && (
                  <p className="text-xs text-muted-foreground italic">
                    {priceDisplay.description}
                  </p>
                )}
              </div>
            );
          })()}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          <p className="text-muted-foreground text-sm leading-relaxed">
            {pkg.description}
          </p>

          {/* Guest Range */}
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Users className="w-5 h-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            <span>
              {pkg.min_guests}
              {pkg.max_guests ? ` - ${pkg.max_guests}` : "+"} guests
            </span>
          </div>

          {/* Included Services */}
          {(pkg.includes_setup || pkg.includes_service || pkg.includes_cleanup) && (
            <div className="space-y-2">
              {pkg.includes_setup && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  <span>Setup included</span>
                </div>
              )}
              {pkg.includes_service && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  <span>Service staff included</span>
                </div>
              )}
              {pkg.includes_cleanup && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  <span>Cleanup included</span>
                </div>
              )}
            </div>
          )}

          {/* Dietary Accommodations */}
          {pkg.dietary_accommodations && pkg.dietary_accommodations.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">
                Dietary accommodations:
              </p>
              <div className="flex flex-wrap gap-2">
                {pkg.dietary_accommodations.map((diet) => (
                  <Badge
                    key={diet}
                    variant="outline"
                    className="text-xs font-normal px-3 py-1.5 min-h-[28px]"
                  >
                    {diet.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Select Button */}
          <Button
            onClick={handleSelect}
            className="w-full min-h-[44px] bg-orange-600 hover:bg-orange-700 text-base font-semibold transition-colors"
            aria-label={(() => {
              const priceDisplay = getPackageDisplayPrice(pkg);
              return `Select ${pkg.name} package for $${priceDisplay.value.toFixed(2)} ${priceDisplay.unit}`;
            })()}
          >
            Select Package
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const PackageSelection: React.FC<PackageSelectionProps> = ({
  packages,
  restaurantName = "this restaurant",
  contactEmail,
  contactPhone,
  onContactClick,
  loading = false,
}) => {
  const {
    setSelectedPackage,
    setCurrentStep,
    updateOrderForm,
    getSessionId,
    getTenantId,
  } = useCateringContext();

  // Track package view (debounced to avoid spam)
  const handlePackageView = useCallback((pkg: CateringPackage) => {
    const tenantId = getTenantId();
    if (tenantId) {
      const priceDisplay = getPackageDisplayPrice(pkg);
      trackPackageViewed({
        package_id: pkg.id,
        package_name: pkg.name,
        price_per_person: pkg.price_per_person,
        pricing_type: pkg.pricing_type || 'per_person',
        display_price: priceDisplay.value,
        min_guests: pkg.min_guests,
        max_guests: pkg.max_guests,
        tenant_id: tenantId,
      });
    }
  }, [getTenantId]);

  // Handle package selection
  const handlePackageSelect = useCallback((pkg: CateringPackage) => {
    const tenantId = getTenantId();
    const sessionId = getSessionId();
    
    // Update context state
    setSelectedPackage(pkg);
    updateOrderForm({ package_id: pkg.id });
    
    // Track selection
    if (tenantId) {
      const priceDisplay = getPackageDisplayPrice(pkg);
      trackPackageSelected({
        package_id: pkg.id,
        package_name: pkg.name,
        price_per_person: pkg.price_per_person,
        pricing_type: pkg.pricing_type || 'per_person',
        display_price: priceDisplay.value,
        tenant_id: tenantId,
        session_id: sessionId,
      });
    }
    
    // Navigate to next step
    setCurrentStep("customize");
  }, [setSelectedPackage, updateOrderForm, setCurrentStep, getTenantId, getSessionId]);

  // Memoize sorted packages (popular first)
  const sortedPackages = useMemo(() => {
    return [...packages].sort((a, b) => {
      if (a.popular && !b.popular) return -1;
      if (!a.popular && b.popular) return 1;
      return 0;
    });
  }, [packages]);

  // Show loading skeleton while fetching packages
  if (loading) {
    return <PackageGridSkeleton />;
  }

  // Show empty state if no packages
  if (packages.length === 0) {
    return (
      <NoPackagesEmptyState
        restaurantName={restaurantName}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        onContactClick={onContactClick}
      />
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 text-foreground">
          Choose Your Catering Package
        </h2>
        <p className="text-muted-foreground text-lg">
          Select from our professional catering packages
        </p>
      </div>

      {/* Package Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {sortedPackages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            package={pkg}
            onSelect={handlePackageSelect}
            onView={handlePackageView}
          />
        ))}
      </motion.div>

      {/* Accessibility: Screen reader announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {packages.length} catering package{packages.length !== 1 ? 's' : ''} available
      </div>
    </div>
  );
};

// ============================================================================
// Display Name (for React DevTools)
// ============================================================================

PackageSelection.displayName = "PackageSelection";
PackageCard.displayName = "PackageCard";

// ============================================================================
// Export
// ============================================================================

export default PackageSelection;
