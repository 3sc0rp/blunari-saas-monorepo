import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  User,
  CreditCard,
  Settings,
  MessageSquare,
  Mail,
  Phone,
  Globe,
  Eye,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useAdminAPI } from "@/hooks/useAdminAPI";
import { useToast } from "@/hooks/use-toast";
import type {
  ProvisioningRequestData,
  ProvisioningResponse,
} from "@/types/admin";
import { ProvisioningRequestSchema } from "@/types/admin";
import { z } from "zod";

interface ExtendedBasics {
  name: string;
  timezone: string;
  currency: string;
  slug: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  cuisineTypeId?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
}

interface ExtendedProvisioningRequestData
  extends Omit<ProvisioningRequestData, "basics"> {
  basics: ExtendedBasics;
}

interface ProvisioningWizardProps {
  onComplete?: (result: ProvisioningResponse) => void;
  onCancel?: () => void;
}

export function TenantProvisioningWizard({
  onComplete,
  onCancel,
}: ProvisioningWizardProps) {
  const [loading, setLoading] = useState(false);
  const [idempotencyKey] = useState(crypto.randomUUID());
  const navigate = useNavigate();
  const { provisionTenant } = useAdminAPI();
  const { toast } = useToast();
  const steps = useMemo(
    () => [
      { key: "basics", title: "Basic Information", icon: Building2 },
      { key: "contact", title: "Contact & Address", icon: Mail },
      { key: "owner", title: "Owner Account", icon: User },
      { key: "config", title: "Configuration", icon: Settings },
      { key: "billing", title: "Billing & SMS", icon: CreditCard },
      { key: "review", title: "Review & Submit", icon: Eye },
    ],
    [],
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  const DRAFT_KEY = "admin:tenant-provisioning-draft-v1";

  const [formData, setFormData] = useState<ExtendedProvisioningRequestData>({
    basics: {
      name: "",
      timezone: "America/New_York",
      currency: "USD",
      slug: "",
    },
    owner: {
      email: "",
      sendInvite: true,
    },
    access: {
      mode: "standard",
    },
    seed: {
      seatingPreset: "standard",
      enablePacing: false,
      enableDepositPolicy: false,
    },
    billing: {
      createSubscription: false,
      plan: "basic",
    },
    sms: {
      startRegistration: false,
    },
    idempotencyKey,
  });

  const [result, setResult] = useState<ProvisioningResponse | null>(null);

  const handleInputChange = (
    section: keyof ExtendedProvisioningRequestData,
    field: string,
    value: unknown,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, unknown>),
        [field]: value,
      },
    }));
  };

  // Auto-generate slug from name
  React.useEffect(() => {
    if (formData.basics.name && !formData.basics.slug) {
      const slug = formData.basics.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");

      handleInputChange("basics", "slug", slug);
    }
  }, [formData.basics.name]);

  // Draft: load
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.formData && parsed?.idempotencyKey) {
        setFormData(parsed.formData);
        // Only restore idempotency if present; else keep current
        setCurrentStep(parsed.currentStep ?? 0);
        setHasDraft(true);
        toast({ title: "Draft restored", description: "Continuing from your last progress." });
      }
    } catch (_) {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draft: autosave (light debounce)
  React.useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ formData, currentStep, idempotencyKey, savedAt: new Date().toISOString() }),
        );
        setHasDraft(true);
      } catch (_) {
        // ignore
      }
    }, 400);
    return () => clearTimeout(t);
  }, [formData, currentStep, idempotencyKey]);

  const saveDraftNow = () => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ formData, currentStep, idempotencyKey, savedAt: new Date().toISOString() }),
      );
      setHasDraft(true);
      toast({ title: "Draft saved" });
    } catch (_) {
      toast({ title: "Failed to save draft", variant: "destructive" });
    }
  };

  const discardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      toast({ title: "Draft discarded" });
    } catch (_) {
      // ignore
    }
  };

  const stepIsValid = (index: number): boolean => {
    const sKey = steps[index]?.key;
    if (sKey === "basics") {
      return !!formData.basics.name?.trim() && !!formData.basics.slug?.trim();
    }
    if (sKey === "owner") {
      const email = formData.owner.email?.trim();
      return !!email && /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);
    }
    return true;
  };

  const validateStep = (index: number): boolean => {
    const valid = stepIsValid(index);
    if (!valid) {
      const sKey = steps[index]?.key;
      if (sKey === "basics") {
        toast({
          title: "Missing required fields",
          description: "Please provide Restaurant Name and Slug.",
          variant: "destructive",
        });
      } else if (sKey === "owner") {
        toast({
          title: "Invalid owner email",
          description: "Please provide a valid owner email address.",
          variant: "destructive",
        });
      }
    }
    return valid;
  };

  const goNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Validate form data
      const validatedData = ProvisioningRequestSchema.parse(formData);

      // Submit provisioning request
      const apiResponse = await provisionTenant(validatedData);

      if (apiResponse.success) {
        const provisioningResult = apiResponse.data!;
        setResult(provisioningResult);
        toast({
          title: "Tenant Provisioned Successfully! 🎉",
          description:
            provisioningResult.message ||
            "Tenant has been created and configured.",
        });

        if (onComplete) {
          onComplete(provisioningResult);
        }
      } else {
        throw new Error(apiResponse.error?.message || "Provisioning failed");
      }
    } catch (error: unknown) {
      console.error("Provisioning error:", error);

      const errorObj = error as Error & { errors?: Array<{ message: string }> };
      const msg =
        errorObj?.errors?.[0]?.message ||
        errorObj?.message ||
        "Provisioning failed";

      toast({
        title: "Provisioning Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate("/admin/tenants");
    }
  };

  // Show results if provisioning completed
  if (result?.success) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-success/20 bg-success/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <Building2 className="h-5 w-5" />
              Tenant Provisioned Successfully
            </CardTitle>
            <CardDescription>
              {formData.basics.name} has been successfully created and
              configured.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {result.runId && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Run ID
                  </Label>
                  <p className="font-mono text-sm">{result.runId}</p>
                </div>
              )}
              {result.tenantId && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Tenant ID
                  </Label>
                  <p className="font-mono text-sm">{result.tenantId}</p>
                </div>
              )}
              {result.slug && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Slug
                  </Label>
                  <p className="font-mono text-sm">/{result.slug}</p>
                </div>
              )}
              {result.primaryUrl && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Primary URL
                  </Label>
                  <p className="font-mono text-sm">{result.primaryUrl}</p>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => navigate(`/admin/tenants/${result.tenantId}`)}
                variant="default"
              >
                <Eye className="h-4 w-4 mr-2" />
                Go to Tenant
              </Button>

              {result.primaryUrl && (
                <Button
                  onClick={() => window.open(result.primaryUrl, "_blank")}
                  variant="outline"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Open Client Dashboard
                </Button>
              )}

              <Button
                onClick={() => navigate("/admin/operations")}
                variant="ghost"
              >
                <Settings className="h-4 w-4 mr-2" />
                View Observability
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StepHeader = () => {
    const progress = Math.round(((currentStep + 1) / steps.length) * 100);
    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenant Provisioning</h1>
          <p className="text-muted-foreground">Step {currentStep + 1} of {steps.length} • {steps[currentStep].title}</p>
          <div className="mt-2">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={saveDraftNow}>
            Save Draft
          </Button>
          <Button variant="outline" onClick={discardDraft} disabled={!hasDraft}>
            Discard Draft
          </Button>
          <Button variant="ghost" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  const BasicsStep = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Basic Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Restaurant Name *</Label>
            <Input
              id="name"
              value={formData.basics.name}
              onChange={(e) => handleInputChange("basics", "name", e.target.value)}
              placeholder="Amazing Restaurant"
              required
            />
          </div>
          <div>
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={formData.basics.slug}
              onChange={(e) => handleInputChange("basics", "slug", e.target.value)}
              placeholder="amazing-restaurant"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={formData.basics.timezone}
              onValueChange={(value) => handleInputChange("basics", "timezone", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/New_York">Eastern Time</SelectItem>
                <SelectItem value="America/Chicago">Central Time</SelectItem>
                <SelectItem value="America/Denver">Mountain Time</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={formData.basics.currency}
              onValueChange={(value) => handleInputChange("basics", "currency", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
                <SelectItem value="CAD">CAD (C$)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.basics.description || ""}
            onChange={(e) => handleInputChange("basics", "description", e.target.value)}
            placeholder="A demo restaurant for testing"
          />
        </div>
      </CardContent>
    </Card>
  );

  const ContactStep = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Contact & Address
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Business Email</Label>
            <Input
              id="email"
              type="email"
              value={(formData.basics as { email?: string }).email || ""}
              onChange={(e) => handleInputChange("basics", "email", e.target.value)}
              placeholder="contact@restaurant.com"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={(formData.basics as { phone?: string }).phone || ""}
              onChange={(e) => handleInputChange("basics", "phone", e.target.value)}
              placeholder="+1 555 123 4567"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="street">Street</Label>
            <Input
              id="street"
              value={formData.basics.address?.street || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  basics: {
                    ...prev.basics,
                    address: { ...(prev.basics.address || {}), street: e.target.value },
                  },
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.basics.address?.city || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  basics: {
                    ...prev.basics,
                    address: { ...(prev.basics.address || {}), city: e.target.value },
                  },
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={formData.basics.address?.state || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  basics: {
                    ...prev.basics,
                    address: { ...(prev.basics.address || {}), state: e.target.value },
                  },
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="zip">ZIP</Label>
            <Input
              id="zip"
              value={formData.basics.address?.zipCode || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  basics: {
                    ...prev.basics,
                    address: { ...(prev.basics.address || {}), zipCode: e.target.value },
                  },
                }))
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const OwnerStep = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Owner Account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="owner-email">Owner Email *</Label>
          <Input
            id="owner-email"
            type="email"
            value={formData.owner.email}
            onChange={(e) => handleInputChange("owner", "email", e.target.value)}
            placeholder="owner@restaurant.com"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Send Welcome Email</Label>
            <p className="text-sm text-muted-foreground">Send setup instructions to the owner</p>
          </div>
          <Switch
            checked={formData.owner.sendInvite}
            onCheckedChange={(checked) => handleInputChange("owner", "sendInvite", checked)}
          />
        </div>
      </CardContent>
    </Card>
  );

  const ConfigStep = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Access Mode</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Button
              type="button"
              variant={formData.access.mode === "standard" ? "default" : "outline"}
              onClick={() => handleInputChange("access", "mode", "standard")}
              className="justify-start"
            >
              Standard
            </Button>
            <Button
              type="button"
              variant={formData.access.mode === "premium" ? "default" : "outline"}
              onClick={() => handleInputChange("access", "mode", "premium")}
              className="justify-start"
            >
              Premium
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Deposit Policy</Label>
              <p className="text-sm text-muted-foreground">Require deposits for reservations (default: OFF)</p>
            </div>
            <Switch
              checked={formData.seed.enableDepositPolicy}
              onCheckedChange={(checked) => handleInputChange("seed", "enableDepositPolicy", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Pacing</Label>
              <p className="text-sm text-muted-foreground">Intelligent table pacing and optimization</p>
            </div>
            <Switch
              checked={formData.seed.enablePacing}
              onCheckedChange={(checked) => handleInputChange("seed", "enablePacing", checked)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const BillingStep = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Billing & SMS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Plan</Label>
          <Select
            value={formData.billing.plan}
            onValueChange={(value) => handleInputChange("billing", "plan", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic Plan</SelectItem>
              <SelectItem value="professional">Professional Plan</SelectItem>
              <SelectItem value="enterprise">Enterprise Plan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Create Subscription</Label>
            <p className="text-sm text-muted-foreground">Automatically create billing subscription</p>
          </div>
          <Switch
            checked={formData.billing.createSubscription}
            onCheckedChange={(checked) => handleInputChange("billing", "createSubscription", checked)}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label>Start SMS Registration</Label>
            <p className="text-sm text-muted-foreground">Enable SMS notifications for this tenant</p>
          </div>
          <Switch
            checked={formData.sms.startRegistration}
            onCheckedChange={(checked) => handleInputChange("sms", "startRegistration", checked)}
          />
        </div>
      </CardContent>
    </Card>
  );

  const ReviewStep = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Review & Submit
        </CardTitle>
        <CardDescription>Double-check details before creating the tenant.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="text-muted-foreground">Name</Label>
            <div>{formData.basics.name}</div>
          </div>
          <div>
            <Label className="text-muted-foreground">Slug</Label>
            <div>/{formData.basics.slug}</div>
          </div>
          <div>
            <Label className="text-muted-foreground">Timezone</Label>
            <div>{formData.basics.timezone}</div>
          </div>
          <div>
            <Label className="text-muted-foreground">Currency</Label>
            <div>{formData.basics.currency}</div>
          </div>
          {(formData.basics as { email?: string }).email && (
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <div>{(formData.basics as { email?: string }).email}</div>
            </div>
          )}
          {(formData.basics as { phone?: string }).phone && (
            <div>
              <Label className="text-muted-foreground">Phone</Label>
              <div>{(formData.basics as { phone?: string }).phone}</div>
            </div>
          )}
          <div className="col-span-2">
            <Label className="text-muted-foreground">Address</Label>
            <div>
              {[formData.basics.address?.street, formData.basics.address?.city, formData.basics.address?.state, formData.basics.address?.zipCode]
                .filter(Boolean)
                .join(", ") || "—"}
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Owner Email</Label>
            <div>{formData.owner.email}</div>
          </div>
          <div>
            <Label className="text-muted-foreground">Send Invite</Label>
            <div>{formData.owner.sendInvite ? "Yes" : "No"}</div>
          </div>
          <div>
            <Label className="text-muted-foreground">Access Mode</Label>
            <div className="capitalize">{formData.access.mode}</div>
          </div>
          <div>
            <Label className="text-muted-foreground">Deposit Policy</Label>
            <div>{formData.seed.enableDepositPolicy ? "Enabled" : "Disabled"}</div>
          </div>
          <div>
            <Label className="text-muted-foreground">Pacing</Label>
            <div>{formData.seed.enablePacing ? "Enabled" : "Disabled"}</div>
          </div>
          <div>
            <Label className="text-muted-foreground">Plan</Label>
            <div className="capitalize">{formData.billing.plan}</div>
          </div>
          <div>
            <Label className="text-muted-foreground">Create Subscription</Label>
            <div>{formData.billing.createSubscription ? "Yes" : "No"}</div>
          </div>
          <div>
            <Label className="text-muted-foreground">Start SMS Registration</Label>
            <div>{formData.sms.startRegistration ? "Yes" : "No"}</div>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Idempotency Key</Label>
            <p className="text-xs text-muted-foreground font-mono">{idempotencyKey}</p>
          </div>
          <Badge variant="outline">Unique Request</Badge>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep = () => {
    switch (steps[currentStep].key) {
      case "basics":
        return BasicsStep;
      case "contact":
        return ContactStep;
      case "owner":
        return OwnerStep;
      case "config":
        return ConfigStep;
      case "billing":
        return BillingStep;
      case "review":
        return ReviewStep;
      default:
        return BasicsStep;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <StepHeader />

      <form onSubmit={handleSubmit} className="space-y-6">
        {renderStep()}

    <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={goBack} disabled={currentStep === 0 || loading}>
            Back
          </Button>
          {currentStep < steps.length - 1 ? (
      <Button type="button" onClick={goNext} disabled={loading || !stepIsValid(currentStep)}>
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Provisioning...
                </>
              ) : (
                "Create Tenant"
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
