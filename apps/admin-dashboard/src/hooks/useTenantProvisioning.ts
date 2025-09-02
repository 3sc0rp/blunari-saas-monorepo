import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const BACKGROUND_OPS_URL =
  import.meta.env.VITE_BACKGROUND_OPS_URL || "https://background-ops.fly.dev";
const API_KEY = import.meta.env.VITE_BACKGROUND_OPS_API_KEY;
const SIGNING_SECRET = import.meta.env.VITE_BACKGROUND_OPS_SIGNING_SECRET;

if (!API_KEY || !SIGNING_SECRET) {
  throw new Error(
    "Missing required environment variables: VITE_BACKGROUND_OPS_API_KEY and VITE_BACKGROUND_OPS_SIGNING_SECRET",
  );
}

export interface ProvisioningData {
  // Basic Information
  restaurantName: string;
  slug: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  cuisineTypeId?: string;

  // Owner Account
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerPassword: string;

  // Business Configuration
  timezone: string;
  businessHours: Array<{
    dayOfWeek: number;
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
  }>;
  partySizeConfig: {
    minPartySize: number;
    maxPartySize: number;
    defaultPartySize: number;
    allowLargeParties: boolean;
    largePartyThreshold: number;
  };

  // Billing Setup
  selectedPlanId: string;
  billingCycle: "monthly" | "yearly";

  // Feature Configuration
  enabledFeatures: {
    deposits: boolean;
    posIntegration: boolean;
    etaNotifications: boolean;
    customBranding: boolean;
    advancedAnalytics: boolean;
    multiLocation: boolean;
  };
}

export const useTenantProvisioning = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Helper function to create HMAC signature using Web Crypto API
  const createHmacSignature = async (
    message: string,
    secret: string,
  ): Promise<string> => {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const createAuthHeaders = async (
    body: ProvisioningData | Record<string, unknown>,
    tenantId: string = "admin",
  ): Promise<Record<string, string>> => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const requestId = crypto.getRandomValues(new Uint32Array(4)).join("");
    const idempotencyKey = crypto.getRandomValues(new Uint32Array(4)).join("");

    // Create payload for HMAC signature
    const payload = JSON.stringify(body) + timestamp + tenantId + requestId;
    const signature =
      "sha256=" + (await createHmacSignature(payload, SIGNING_SECRET!));

    return {
      "Content-Type": "application/json",
      "x-api-key": API_KEY!,
      "x-signature": signature,
      "x-timestamp": timestamp,
      "x-tenant-id": tenantId,
      "x-request-id": requestId,
      "x-idempotency-key": idempotencyKey,
    };
  };

  const provisionTenant = async (data: ProvisioningData) => {
    try {
      setLoading(true);

      const response = await fetch(
        `${BACKGROUND_OPS_URL}/api/v1/tenants/provision`,
        {
          method: "POST",
          headers: await createAuthHeaders(data),
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to provision tenant");
      }

      toast({
        title: "Success!",
        description:
          result.message ||
          `${data.restaurantName} has been successfully created!`,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      toast({
        title: "Provisioning Failed",
        description: errorMessage,
        variant: "destructive",
      });

      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getTenants = async (filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, value.toString());
        });
      }

      const url = `${BACKGROUND_OPS_URL}/api/v1/tenants${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tenants: HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch tenants",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getTenant = async (id: string) => {
    try {
      setLoading(true);

      const response = await fetch(
        `${BACKGROUND_OPS_URL}/api/v1/tenants/${id}`,
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Tenant not found");
        }
        throw new Error(`Failed to fetch tenant: HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to fetch tenant",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    provisionTenant,
    getTenants,
    getTenant,
  };
};
