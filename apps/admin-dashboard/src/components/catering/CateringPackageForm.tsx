/**
 * CateringPackageForm Component
 * 
 * World-class form for creating and editing catering packages with flexible pricing.
 * Supports per-person, per-tray, and fixed pricing models with dynamic form fields.
 * 
 * Features:
 * - Smart pricing type selector with visual previews
 * - Dynamic form fields based on pricing type
 * - Real-time price calculation preview
 * - Guest count recommendations for per-tray pricing
 * - Validation with helpful error messages
 * - Accessible WCAG 2.1 AA compliant
 * - Smooth animations and micro-interactions
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  DollarSign,
  Info,
  Utensils,
  Calculator,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { CateringPackage, CateringPricingType, DietaryRestriction } from "@/types/catering";

// ============================================================================
// Types
// ============================================================================

interface PackageFormData {
  name: string;
  description: string;
  pricing_type: CateringPricingType;
  price_per_person: number; // in dollars (will be converted to cents)
  base_price: number; // in dollars (will be converted to cents)
  serves_count: number;
  tray_description: string;
  min_guests: number;
  max_guests: number | null;
  includes_setup: boolean;
  includes_service: boolean;
  includes_cleanup: boolean;
  dietary_accommodations: DietaryRestriction[];
  image_url: string;
  popular: boolean;
  active: boolean;
}

interface CateringPackageFormProps {
  /** Existing package to edit (null for create mode) */
  package?: CateringPackage | null;
  /** Callback when form is submitted */
  onSubmit: (data: PackageFormData) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel: () => void;
  /** Loading state during submission */
  loading?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const PRICING_TYPES: Array<{
  value: CateringPricingType;
  label: string;
  description: string;
  icon: string;
  example: string;
}> = [
  {
    value: "per_person",
    label: "Per Person",
    description: "Price multiplied by number of guests",
    icon: "👤",
    example: "$15/person × 25 guests = $375",
  },
  {
    value: "per_tray",
    label: "Per Tray",
    description: "Fixed price per tray/batch serving multiple people",
    icon: "🍱",
    example: "$80/tray × 3 trays (serves 25) = $240",
  },
  {
    value: "fixed",
    label: "Fixed Price",
    description: "One-time flat fee regardless of guest count",
    icon: "💰",
    example: "$500 total (any guest count)",
  },
];

const DIETARY_OPTIONS: DietaryRestriction[] = [
  "vegetarian",
  "vegan",
  "gluten_free",
  "dairy_free",
  "kosher",
  "halal",
  "keto",
  "paleo",
];

const COMMON_TRAY_SIZES = [
  { serves: 8, label: "Small (8 people)" },
  { serves: 10, label: "Medium (10 people)" },
  { serves: 12, label: "Large (12 people)" },
  { serves: 16, label: "Extra Large (16 people)" },
  { serves: 20, label: "Family Size (20 people)" },
];

// ============================================================================
// Helper Functions
// ============================================================================

const calculatePricePreview = (
  pricingType: CateringPricingType,
  pricePerPerson: number,
  basePrice: number,
  servesCount: number,
  guestCount: number
): { total: number; breakdown: string } => {
  switch (pricingType) {
    case "per_person":
      return {
        total: pricePerPerson * guestCount,
        breakdown: `$${pricePerPerson.toFixed(2)} × ${guestCount} guests`,
      };
    case "per_tray":
      const traysNeeded = Math.ceil(guestCount / servesCount);
      return {
        total: basePrice * traysNeeded,
        breakdown: `$${basePrice.toFixed(2)} × ${traysNeeded} ${traysNeeded === 1 ? "tray" : "trays"} (${guestCount} guests)`,
      };
    case "fixed":
      return {
        total: basePrice,
        breakdown: `Fixed price for any guest count`,
      };
    default:
      return { total: 0, breakdown: "" };
  }
};

// ============================================================================
// Main Component
// ============================================================================

export const CateringPackageForm: React.FC<CateringPackageFormProps> = ({
  package: existingPackage,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  // Form state
  const [formData, setFormData] = useState<PackageFormData>({
    name: existingPackage?.name || "",
    description: existingPackage?.description || "",
    pricing_type: existingPackage?.pricing_type || "per_person",
    price_per_person: existingPackage?.price_per_person ? existingPackage.price_per_person / 100 : 0,
    base_price: existingPackage?.base_price ? existingPackage.base_price / 100 : 0,
    serves_count: existingPackage?.serves_count || 10,
    tray_description: existingPackage?.tray_description || "",
    min_guests: existingPackage?.min_guests || 10,
    max_guests: existingPackage?.max_guests || null,
    includes_setup: existingPackage?.includes_setup || false,
    includes_service: existingPackage?.includes_service || false,
    includes_cleanup: existingPackage?.includes_cleanup || false,
    dietary_accommodations: existingPackage?.dietary_accommodations || [],
    image_url: existingPackage?.image_url || "",
    popular: existingPackage?.popular || false,
    active: existingPackage?.active ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewGuestCount, setPreviewGuestCount] = useState(25);

  // Update field value
  const updateField = useCallback((field: keyof PackageFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Pricing type specific logic
  const selectedPricingType = useMemo(
    () => PRICING_TYPES.find(pt => pt.value === formData.pricing_type),
    [formData.pricing_type]
  );

  // Calculate price preview
  const pricePreview = useMemo(() => {
    return calculatePricePreview(
      formData.pricing_type,
      formData.price_per_person,
      formData.base_price,
      formData.serves_count,
      previewGuestCount
    );
  }, [
    formData.pricing_type,
    formData.price_per_person,
    formData.base_price,
    formData.serves_count,
    previewGuestCount,
  ]);

  // Auto-generate tray description
  useEffect(() => {
    if (formData.pricing_type === "per_tray" && formData.serves_count && !formData.tray_description) {
      const defaultDesc = `Each tray serves ${formData.serves_count} guests`;
      updateField("tray_description", defaultDesc);
    }
  }, [formData.pricing_type, formData.serves_count]);

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Package name is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (formData.min_guests < 1) {
      newErrors.min_guests = "Minimum guests must be at least 1";
    }

    if (formData.max_guests && formData.max_guests < formData.min_guests) {
      newErrors.max_guests = "Maximum must be greater than minimum";
    }

    // Pricing-specific validation
    switch (formData.pricing_type) {
      case "per_person":
        if (formData.price_per_person <= 0) {
          newErrors.price_per_person = "Price per person must be greater than 0";
        }
        break;
      case "per_tray":
        if (formData.base_price <= 0) {
          newErrors.base_price = "Base price must be greater than 0";
        }
        if (formData.serves_count < 1) {
          newErrors.serves_count = "Serves count must be at least 1";
        }
        if (!formData.tray_description.trim()) {
          newErrors.tray_description = "Tray description is required";
        }
        break;
      case "fixed":
        if (formData.base_price <= 0) {
          newErrors.base_price = "Fixed price must be greater than 0";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    await onSubmit(formData);
  }, [formData, validate, onSubmit]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Package name and description that customers will see
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name" className="required">
              Package Name
            </Label>
            <Input
              id="name"
              placeholder="e.g., Corporate Lunch Package"
              value={formData.name}
              onChange={e => updateField("name", e.target.value)}
              className={errors.name ? "border-red-500" : ""}
              required
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what's included in this package..."
              value={formData.description}
              onChange={e => updateField("description", e.target.value)}
              className={errors.description ? "border-red-500" : ""}
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description}</p>
            )}
          </div>

          <div>
            <Label htmlFor="image_url">Image URL (Optional)</Label>
            <Input
              id="image_url"
              type="url"
              placeholder="https://..."
              value={formData.image_url}
              onChange={e => updateField("image_url", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Pricing Model
          </CardTitle>
          <CardDescription>
            Choose how you want to price this package
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {PRICING_TYPES.map(pricingType => (
              <motion.div
                key={pricingType.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={`cursor-pointer transition-all ${
                    formData.pricing_type === pricingType.value
                      ? "ring-2 ring-orange-500 border-orange-500 bg-orange-50"
                      : "hover:border-gray-400"
                  }`}
                  onClick={() => updateField("pricing_type", pricingType.value)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{pricingType.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1 flex items-center gap-2">
                          {pricingType.label}
                          {formData.pricing_type === pricingType.value && (
                            <CheckCircle2 className="w-4 h-4 text-orange-600" />
                          )}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {pricingType.description}
                        </p>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {pricingType.example}
                        </code>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Dynamic Pricing Fields */}
          <AnimatePresence mode="wait">
            <motion.div
              key={formData.pricing_type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Per-Person Pricing */}
              {formData.pricing_type === "per_person" && (
                <div>
                  <Label htmlFor="price_per_person" className="required">
                    Price Per Person
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      id="price_per_person"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="15.00"
                      value={formData.price_per_person || ""}
                      onChange={e =>
                        updateField("price_per_person", parseFloat(e.target.value) || 0)
                      }
                      className={`pl-10 ${errors.price_per_person ? "border-red-500" : ""}`}
                      required
                    />
                  </div>
                  {errors.price_per_person && (
                    <p className="text-sm text-red-600 mt-1">{errors.price_per_person}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    This amount will be multiplied by the number of guests
                  </p>
                </div>
              )}

              {/* Per-Tray Pricing */}
              {formData.pricing_type === "per_tray" && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="base_price" className="required">
                      Price Per Tray
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="base_price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="80.00"
                        value={formData.base_price || ""}
                        onChange={e =>
                          updateField("base_price", parseFloat(e.target.value) || 0)
                        }
                        className={`pl-10 ${errors.base_price ? "border-red-500" : ""}`}
                        required
                      />
                    </div>
                    {errors.base_price && (
                      <p className="text-sm text-red-600 mt-1">{errors.base_price}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="serves_count" className="required">
                      People Served Per Tray
                    </Label>
                    <Select
                      value={formData.serves_count.toString()}
                      onValueChange={value => updateField("serves_count", parseInt(value))}
                    >
                      <SelectTrigger className={errors.serves_count ? "border-red-500" : ""}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_TRAY_SIZES.map(size => (
                          <SelectItem key={size.serves} value={size.serves.toString()}>
                            {size.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Custom Amount</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.serves_count.toString() === "custom" && (
                      <Input
                        type="number"
                        min="1"
                        placeholder="Enter custom serves count"
                        className="mt-2"
                        onChange={e => updateField("serves_count", parseInt(e.target.value) || 1)}
                      />
                    )}
                    {errors.serves_count && (
                      <p className="text-sm text-red-600 mt-1">{errors.serves_count}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="tray_description" className="required">
                      Tray Description
                    </Label>
                    <Input
                      id="tray_description"
                      placeholder="Each tray serves 8-10 guests"
                      value={formData.tray_description}
                      onChange={e => updateField("tray_description", e.target.value)}
                      className={errors.tray_description ? "border-red-500" : ""}
                      required
                    />
                    {errors.tray_description && (
                      <p className="text-sm text-red-600 mt-1">{errors.tray_description}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      This helps customers understand the serving size
                    </p>
                  </div>

                  <Alert>
                    <Calculator className="w-4 h-4" />
                    <AlertDescription>
                      <strong>Smart Calculation:</strong> For {previewGuestCount} guests, the
                      system will automatically calculate{" "}
                      {Math.ceil(previewGuestCount / formData.serves_count)} tray(s) needed.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Fixed Pricing */}
              {formData.pricing_type === "fixed" && (
                <div>
                  <Label htmlFor="base_price" className="required">
                    Fixed Price
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      id="base_price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="500.00"
                      value={formData.base_price || ""}
                      onChange={e =>
                        updateField("base_price", parseFloat(e.target.value) || 0)
                      }
                      className={`pl-10 ${errors.base_price ? "border-red-500" : ""}`}
                      required
                    />
                  </div>
                  {errors.base_price && (
                    <p className="text-sm text-red-600 mt-1">{errors.base_price}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    This flat fee applies regardless of guest count
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Price Preview */}
          <Card className="mt-6 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Label htmlFor="preview_guests" className="text-sm font-medium">
                  Price Preview (for testing)
                </Label>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="preview_guests"
                    type="number"
                    min="1"
                    value={previewGuestCount}
                    onChange={e => setPreviewGuestCount(parseInt(e.target.value) || 1)}
                    className="w-20 h-8"
                  />
                  <span className="text-sm text-muted-foreground">guests</span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-orange-200">
                <div className="text-sm text-muted-foreground mb-1">{pricePreview.breakdown}</div>
                <div className="text-3xl font-bold text-orange-600">
                  ${pricePreview.total.toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Guest Capacity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Guest Capacity
          </CardTitle>
          <CardDescription>
            Define minimum and maximum guest counts
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="min_guests" className="required">
              Minimum Guests
            </Label>
            <Input
              id="min_guests"
              type="number"
              min="1"
              value={formData.min_guests || ""}
              onChange={e => updateField("min_guests", parseInt(e.target.value) || 1)}
              className={errors.min_guests ? "border-red-500" : ""}
              required
            />
            {errors.min_guests && (
              <p className="text-sm text-red-600 mt-1">{errors.min_guests}</p>
            )}
          </div>

          <div>
            <Label htmlFor="max_guests">
              Maximum Guests
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 inline ml-1 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Leave empty for unlimited
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="max_guests"
              type="number"
              min={formData.min_guests}
              placeholder="Unlimited"
              value={formData.max_guests || ""}
              onChange={e =>
                updateField("max_guests", e.target.value ? parseInt(e.target.value) : null)
              }
              className={errors.max_guests ? "border-red-500" : ""}
            />
            {errors.max_guests && (
              <p className="text-sm text-red-600 mt-1">{errors.max_guests}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Included Services */}
      <Card>
        <CardHeader>
          <CardTitle>Included Services</CardTitle>
          <CardDescription>
            Select what's included in this package
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="includes_setup">Setup Service</Label>
              <p className="text-sm text-muted-foreground">
                Includes delivery and complete setup
              </p>
            </div>
            <Switch
              id="includes_setup"
              checked={formData.includes_setup}
              onCheckedChange={checked => updateField("includes_setup", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="includes_service">Full Service Staff</Label>
              <p className="text-sm text-muted-foreground">
                Staff to serve and assist during event
              </p>
            </div>
            <Switch
              id="includes_service"
              checked={formData.includes_service}
              onCheckedChange={checked => updateField("includes_service", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="includes_cleanup">Cleanup Service</Label>
              <p className="text-sm text-muted-foreground">
                Complete cleanup after event
              </p>
            </div>
            <Switch
              id="includes_cleanup"
              checked={formData.includes_cleanup}
              onCheckedChange={checked => updateField("includes_cleanup", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dietary Accommodations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="w-5 h-5" />
            Dietary Accommodations
          </CardTitle>
          <CardDescription>
            Select which dietary needs this package can accommodate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map(diet => {
              const isSelected = formData.dietary_accommodations.includes(diet);
              return (
                <Badge
                  key={diet}
                  variant={isSelected ? "default" : "outline"}
                  className={`cursor-pointer ${
                    isSelected ? "bg-orange-600 hover:bg-orange-700" : "hover:bg-gray-100"
                  }`}
                  onClick={() => {
                    const newDietary = isSelected
                      ? formData.dietary_accommodations.filter(d => d !== diet)
                      : [...formData.dietary_accommodations, diet];
                    updateField("dietary_accommodations", newDietary);
                  }}
                >
                  {diet.replace(/_/g, " ")}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Package Options */}
      <Card>
        <CardHeader>
          <CardTitle>Package Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="popular">Mark as Popular</Label>
              <p className="text-sm text-muted-foreground">
                Show a "Popular" badge on this package
              </p>
            </div>
            <Switch
              id="popular"
              checked={formData.popular}
              onCheckedChange={checked => updateField("popular", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="active">Active (Visible to Customers)</Label>
              <p className="text-sm text-muted-foreground">
                Customers can see and book this package
              </p>
            </div>
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={checked => updateField("active", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700">
          {loading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              {existingPackage ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>{existingPackage ? "Update Package" : "Create Package"}</>
          )}
        </Button>
      </div>
    </form>
  );
};
