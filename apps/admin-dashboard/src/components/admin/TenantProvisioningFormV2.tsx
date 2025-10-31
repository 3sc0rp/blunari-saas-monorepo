/**
 * Professional Tenant Provisioning Form V2
 * 
 * Modern, user-friendly interface for creating new tenants.
 * 
 * Features:
 * - Real-time validation with instant feedback
 * - Automatic slug generation with suggestions
 * - Clear error messages with recovery guidance
 * - Progress tracking
 * - Professional UX/UI
 * - Comprehensive error handling
 */

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Mail,
  Globe,
  Phone,
  MapPin,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Copy,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

interface FormData {
  tenantName: string;
  tenantSlug: string;
  ownerEmail: string;
  ownerName: string;
  timezone: string;
  currency: string;
  description: string;
  email: string;
  phone: string;
  website: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZipCode: string;
  addressCountry: string;
}

interface ValidationResult {
  available: boolean;
  reason: string;
  suggestion?: string;
  conflicts?: Array<{ table: string; reason: string }>;
}

interface ProvisioningResult {
  tenantId: string;
  ownerId: string;
  slug: string;
  primaryUrl: string;
  message: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona Time (MT - No DST)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT/AEST)" },
];

const CURRENCIES = [
  { value: "USD", label: "US Dollar ($)", symbol: "$" },
  { value: "EUR", label: "Euro (€)", symbol: "€" },
  { value: "GBP", label: "British Pound (£)", symbol: "£" },
  { value: "CAD", label: "Canadian Dollar ($)", symbol: "$" },
  { value: "AUD", label: "Australian Dollar ($)", symbol: "$" },
  { value: "JPY", label: "Japanese Yen (¥)", symbol: "¥" },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const sanitizeSlug = (input: string): string => {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
};

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TenantProvisioningFormV2() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // ========================================
  // STATE
  // ========================================
  
  const [formData, setFormData] = useState<FormData>({
    tenantName: "",
    tenantSlug: "",
    ownerEmail: "",
    ownerName: "",
    timezone: "America/New_York",
    currency: "USD",
    description: "",
    email: "",
    phone: "",
    website: "",
    addressStreet: "",
    addressCity: "",
    addressState: "",
    addressZipCode: "",
    addressCountry: "USA",
  });
  
  const [loading, setLoading] = useState(false);
  const [validatingSlug, setValidatingSlug] = useState(false);
  const [validatingEmail, setValidatingEmail] = useState(false);
  const [slugValidation, setSlugValidation] = useState<ValidationResult | null>(null);
  const [emailValidation, setEmailValidation] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProvisioningResult | null>(null);
  const [progress, setProgress] = useState(0);
  
  // ========================================
  // AUTO-GENERATE SLUG FROM NAME
  // ========================================
  
  useEffect(() => {
    if (formData.tenantName && !formData.tenantSlug) {
      const slug = sanitizeSlug(formData.tenantName);
      setFormData((prev) => ({ ...prev, tenantSlug: slug }));
    }
  }, [formData.tenantName, formData.tenantSlug]);
  
  // ========================================
  // REAL-TIME SLUG VALIDATION
  // ========================================
  
  useEffect(() => {
    const validateSlug = async () => {
      if (!formData.tenantSlug || formData.tenantSlug.length < 3) {
        setSlugValidation(null);
        return;
      }
      
      setValidatingSlug(true);
      
      try {
        const { data, error } = await supabase.rpc("validate_tenant_slug_realtime", {
          p_slug: formData.tenantSlug,
        });
        
        if (error) throw error;
        
        const result = Array.isArray(data) ? data[0] : data;
        setSlugValidation(result as ValidationResult);
      } catch (err) {
        logger.error("Slug validation error", { error: err });
      } finally {
        setValidatingSlug(false);
      }
    };
    
    const timer = setTimeout(validateSlug, 500);
    return () => clearTimeout(timer);
  }, [formData.tenantSlug]);
  
  // ========================================
  // REAL-TIME EMAIL VALIDATION
  // ========================================
  
  useEffect(() => {
    const validateEmail = async () => {
      if (!formData.ownerEmail || !formData.ownerEmail.includes("@")) {
        setEmailValidation(null);
        return;
      }
      
      setValidatingEmail(true);
      
      try {
        const { data, error } = await supabase.rpc("validate_owner_email_realtime", {
          p_email: formData.ownerEmail,
        });
        
        if (error) throw error;
        
        const result = Array.isArray(data) ? data[0] : data;
        setEmailValidation(result as ValidationResult);
      } catch (err) {
        logger.error("Email validation error", { error: err });
      } finally {
        setValidatingEmail(false);
      }
    };
    
    const timer = setTimeout(validateEmail, 500);
    return () => clearTimeout(timer);
  }, [formData.ownerEmail]);
  
  // ========================================
  // FORM VALIDATION
  // ========================================
  
  const isFormValid = useMemo(() => {
    return (
      formData.tenantName.trim().length > 0 &&
      formData.tenantSlug.trim().length >= 3 &&
      formData.ownerEmail.trim().length > 0 &&
      slugValidation?.available === true &&
      emailValidation?.available === true
    );
  }, [formData, slugValidation, emailValidation]);
  
  // ========================================
  // HANDLE INPUT CHANGE
  // ========================================
  
  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Clear error when user makes changes
    if (error) setError(null);
  };
  
  // ========================================
  // HANDLE SUBMIT
  // ========================================
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      toast({
        title: "Validation Failed",
        description: "Please fix all validation errors before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    setError(null);
    setProgress(0);
    
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("You must be logged in to provision tenants");
      }
      
      // Progress: 10%
      setProgress(10);
      
      // Build request payload
      const payload = {
        basics: {
          name: formData.tenantName,
          slug: formData.tenantSlug,
          timezone: formData.timezone,
          currency: formData.currency,
          description: formData.description || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          website: formData.website || undefined,
          address: formData.addressStreet ? {
            street: formData.addressStreet,
            city: formData.addressCity,
            state: formData.addressState,
            zipCode: formData.addressZipCode,
            country: formData.addressCountry,
          } : undefined,
        },
        owner: {
          email: formData.ownerEmail,
          name: formData.ownerName || undefined,
        },
        idempotencyKey: crypto.randomUUID(),
      };
      
      logger.info("Provisioning tenant", {
        component: "TenantProvisioningFormV2",
        payload,
      });
      
      // Progress: 30%
      setProgress(30);
      
      // Call Edge Function
      const { data, error: functionError } = await supabase.functions.invoke(
        "tenant-provisioning-v2",
        {
          body: payload,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      
      // Progress: 70%
      setProgress(70);
      
      if (functionError) {
        throw new Error(functionError.message);
      }
      
      if (!data.success) {
        throw new Error(data.error?.message || "Provisioning failed");
      }
      
      // Progress: 100%
      setProgress(100);
      
      // Success!
      setResult(data.data);
      
      logger.info("Tenant provisioned successfully", {
        component: "TenantProvisioningFormV2",
        tenantId: data.data.tenantId,
      });
      
      toast({
        title: "Tenant Provisioned Successfully! 🎉",
        description: `${formData.tenantName} is ready to use.`,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      
      logger.error("Provisioning error", {
        component: "TenantProvisioningFormV2",
        error: err,
      });
      
      setError(errorMessage);
      setProgress(0);
      
      toast({
        title: "Provisioning Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // ========================================
  // HANDLE COPY
  // ========================================
  
  const handleCopy = async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    }
  };
  
  // ========================================
  // RENDER SUCCESS SCREEN
  // ========================================
  
  if (result) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">
            Tenant Provisioned Successfully!
          </CardTitle>
          <CardDescription className="text-center">
            {formData.tenantName} is now ready to use
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Tenant Details */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Tenant ID</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono">
                  {result.tenantId}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(result.tenantId, "Tenant ID")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <Label className="text-sm text-muted-foreground">Owner ID</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono">
                  {result.ownerId}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(result.ownerId, "Owner ID")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <Label className="text-sm text-muted-foreground">Tenant URL</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                  {result.primaryUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(result.primaryUrl, "Tenant URL")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Next Steps */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Next Steps
            </h4>
            <p className="text-sm text-muted-foreground">
              A password reset email will be automatically sent to{" "}
              <strong>{formData.ownerEmail}</strong>. The owner must verify their
              email and set a password before logging in.
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/tenants")}
            className="flex-1"
          >
            Back to Tenants
          </Button>
          <Button
            onClick={() => navigate(`/admin/tenants/${result.tenantId}`)}
            className="flex-1"
          >
            View Tenant Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // ========================================
  // RENDER FORM
  // ========================================
  
  return (
    <form onSubmit={handleSubmit}>
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Provision New Tenant
          </CardTitle>
          <CardDescription>
            Create a new restaurant tenant with owner account
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Progress Bar */}
          {loading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                Provisioning tenant... {progress}%
              </p>
            </div>
          )}
          
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="tenantName">
                  Restaurant Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tenantName"
                  value={formData.tenantName}
                  onChange={(e) => handleChange("tenantName", e.target.value)}
                  placeholder="e.g., The Golden Spoon"
                  disabled={loading}
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="tenantSlug">
                  Slug (URL Identifier) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="tenantSlug"
                    value={formData.tenantSlug}
                    onChange={(e) => handleChange("tenantSlug", sanitizeSlug(e.target.value))}
                    placeholder="e.g., golden-spoon"
                    disabled={loading}
                    required
                    className={
                      slugValidation
                        ? slugValidation.available
                          ? "border-green-500"
                          : "border-destructive"
                        : ""
                    }
                  />
                  {validatingSlug && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {slugValidation && (
                  <div className="mt-2">
                    {slugValidation.available ? (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Slug is available
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <XCircle className="h-4 w-4" />
                          {slugValidation.reason}
                        </div>
                        {slugValidation.suggestion && (
                          <Badge variant="outline" className="cursor-pointer" onClick={() => handleChange("tenantSlug", slugValidation.suggestion!)}>
                            Try: {slugValidation.suggestion}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => handleChange("timezone", value)}
                  disabled={loading}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleChange("currency", value)}
                  disabled={loading}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.value} value={curr.value}>
                        {curr.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Brief description of the restaurant..."
                  disabled={loading}
                  rows={3}
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Owner Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Owner Account
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="ownerEmail">
                  Owner Email <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="ownerEmail"
                    type="email"
                    value={formData.ownerEmail}
                    onChange={(e) => handleChange("ownerEmail", e.target.value)}
                    placeholder="owner@example.com"
                    disabled={loading}
                    required
                    className={
                      emailValidation
                        ? emailValidation.available
                          ? "border-green-500"
                          : "border-destructive"
                        : ""
                    }
                  />
                  {validatingEmail && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {emailValidation && (
                  <div className="mt-2">
                    {emailValidation.available ? (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Email is available
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <XCircle className="h-4 w-4" />
                          {emailValidation.reason}
                        </div>
                        {emailValidation.conflicts && emailValidation.conflicts.length > 0 && (
                          <div className="text-xs text-muted-foreground space-y-1">
                            {emailValidation.conflicts.map((conflict, idx) => (
                              <div key={idx}>• {conflict.reason}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="ownerName">Owner Name</Label>
                <Input
                  id="ownerName"
                  value={formData.ownerName}
                  onChange={(e) => handleChange("ownerName", e.target.value)}
                  placeholder="John Smith"
                  disabled={loading}
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information (Optional)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="email">Restaurant Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="info@restaurant.com"
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                  placeholder="https://restaurant.com"
                  disabled={loading}
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address (Optional)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="addressStreet">Street Address</Label>
                <Input
                  id="addressStreet"
                  value={formData.addressStreet}
                  onChange={(e) => handleChange("addressStreet", e.target.value)}
                  placeholder="123 Main Street"
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="addressCity">City</Label>
                <Input
                  id="addressCity"
                  value={formData.addressCity}
                  onChange={(e) => handleChange("addressCity", e.target.value)}
                  placeholder="New York"
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="addressState">State/Province</Label>
                <Input
                  id="addressState"
                  value={formData.addressState}
                  onChange={(e) => handleChange("addressState", e.target.value)}
                  placeholder="NY"
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="addressZipCode">ZIP/Postal Code</Label>
                <Input
                  id="addressZipCode"
                  value={formData.addressZipCode}
                  onChange={(e) => handleChange("addressZipCode", e.target.value)}
                  placeholder="10001"
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="addressCountry">Country</Label>
                <Input
                  id="addressCountry"
                  value={formData.addressCountry}
                  onChange={(e) => handleChange("addressCountry", e.target.value)}
                  placeholder="USA"
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/tenants")}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !isFormValid}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Provisioning...
              </>
            ) : (
              <>
                Create Tenant
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
