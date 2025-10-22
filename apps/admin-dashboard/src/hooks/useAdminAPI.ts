import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type {
  TenantData,
  TenantFeature,
  ProvisioningRequestData,
  ProvisioningResponse,
  EmailResendRequest,
  APIResponse,
} from "@/types/admin";

export const useAdminAPI = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const callEdgeFunction = useCallback(
    async <T = unknown>(
      functionName: string,
      payload?: Record<string, unknown>,
    ): Promise<APIResponse<T>> => {
      try {
        setLoading(true);

        const response = await supabase.functions.invoke(functionName, {
          body: payload,
        });

        if (response.error) {
          // Extract detailed error information from response
          const data: Record<string, unknown> = response.data as Record<
            string,
            unknown
          >;
          const errObj = data?.error || data;
          
          // Get error message with priority: error.message > error code > generic message
          const message =
            (errObj as { message?: string })?.message ||
            response.error.message ||
            "Edge function error";
          
          const code = (errObj as { code?: string })?.code || "";
          const details = (errObj as { details?: unknown })?.details;
          const hint = (errObj as { hint?: string })?.hint;
          const correlationId = (errObj as { correlation_id?: string })?.correlation_id;
          
          // Build detailed error message
          let errorMsg = message;
          if (code) {
            errorMsg += ` (${code})`;
          }
          if (details) {
            if (Array.isArray(details)) {
              // Zod validation errors
              const detailMsgs = details.map((d: any) => 
                `${d.path?.join('.') || 'field'}: ${d.message}`
              ).join(', ');
              errorMsg += ` - ${detailMsgs}`;
            } else if (typeof details === 'string') {
              errorMsg += ` - ${details}`;
            }
          }
          if (hint) {
            errorMsg += ` [Hint: ${hint}]`;
          }
          
          console.error('Edge function error details:', {
            functionName,
            code,
            message,
            details,
            hint,
            correlationId,
            fullResponse: data
          });
          
          throw new Error(errorMsg);
        }

        return response.data as APIResponse<T>;
      } catch (error) {
        console.error(`Edge function ${functionName} error:`, error);

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        toast({
          title: "API Error",
          description: errorMessage,
          variant: "destructive",
        });

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  // Tenant Operations
  const provisionTenant = useCallback(
    async (
      data: ProvisioningRequestData,
    ): Promise<APIResponse<ProvisioningResponse>> => {
      // Test bypass: short-circuit provisioning for UI smoke tests
      try {
        const bypass =
          (typeof window !== "undefined" &&
            (window.location.href.includes("__bypass=1") ||
              window.localStorage.getItem("ADMIN_TEST_BYPASS") === "1")) ||
          false;
        if (bypass) {
          const now = new Date().toISOString();
          return {
            success: true,
            requestId: `req-${Date.now()}`,
            data: {
              success: true,
              runId: `test-${Date.now()}`,
              tenantId: `test-${Math.random().toString(36).slice(2, 10)}`,
              slug: data?.basics?.slug || "test-slug",
              primaryUrl: `${window.location.origin}/client/${data?.basics?.slug || "test-slug"}`,
              message: "Mocked success (bypass)",
              createdAt: now,
            },
          } as APIResponse<ProvisioningResponse>;
        }
      } catch (err) {
        // Ignore any errors encountered during bypass detection so real provisioning can proceed.
        if (process.env.NODE_ENV === "development") {
          console.debug("Bypass detection failed (continuing with real provisioning)", err);
        }
      }

      const response = await callEdgeFunction<ProvisioningResponse>(
        "tenant-provisioning",
        data,
      );
      return response;
    },
    [callEdgeFunction],
  );

  const resendWelcomeEmail = useCallback(
    async (tenant: {
      id: string;
      slug: string;
    }): Promise<{
      jobId?: string;
      message?: string;
      email?: {
        success?: boolean;
        message?: string;
        warning?: string;
        error?: string;
      };
    }> => {
      const payload: Record<string, unknown> = {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        emailType: "welcome",
      };

      const response = await callEdgeFunction(
        "tenant-email-operations",
        payload,
      );

      if (!response.success) {
        const err =
          (response as { error?: { message?: string; code?: string } }).error ||
          {};
        const message = err.message || "Failed to queue email";
        const code = err.code ? ` (${err.code})` : "";
        throw new Error(`${message}${code}`);
      }

      const responseData = response as {
        jobId?: string;
        message?: string;
        email?: {
          success?: boolean;
          message?: string;
          warning?: string;
          error?: string;
        };
      };
      return {
        jobId: responseData.jobId,
        message: responseData.message,
        email: responseData.email,
      };
    },
    [callEdgeFunction],
  );

  // Issue password setup (invite or recovery) link for tenant owner
  const issuePasswordSetupLink = useCallback(
    async (tenantId: string, options?: { sendEmail?: boolean; redirectUrl?: string; ownerNameOverride?: string }) => {
      const payload: Record<string, unknown> = {
        tenantId,
        sendEmail: options?.sendEmail !== false,
        loginRedirectUrl: options?.redirectUrl,
        ownerNameOverride: options?.ownerNameOverride,
      };
      const response = await callEdgeFunction<any>(
        "tenant-password-setup-email",
        payload,
      );
      if (!response.success) {
        const e = (response as any).error || {};
        throw new Error(e.message || "Failed to issue password setup link");
      }
      return response as any;
    },
    [callEdgeFunction],
  );

  // Features Management
  const getTenantFeatures = useCallback(
    async (tenantSlug: string): Promise<TenantFeature[]> => {
      const response = await callEdgeFunction<TenantFeature[]>(
        "tenant-features",
        {
          action: "get",
          tenantSlug,
        },
      );
      return response.data!;
    },
    [callEdgeFunction],
  );

  const updateTenantFeature = useCallback(
    async (
      tenantSlug: string,
      featureKey: string,
      enabled: boolean,
    ): Promise<void> => {
      await callEdgeFunction("tenant-features", {
        action: "update",
        tenantSlug,
        featureKey,
        enabled,
      });

      toast({
        title: "Feature Updated",
        description: `Feature ${featureKey} has been ${enabled ? "enabled" : "disabled"}.`,
      });
    },
    [callEdgeFunction, toast],
  );

  const resetFeaturesToPlan = useCallback(
    async (tenantSlug: string): Promise<void> => {
      await callEdgeFunction("tenant-features", {
        action: "reset-to-plan",
        tenantSlug,
      });

      toast({
        title: "Features Reset",
        description:
          "All feature overrides have been removed. Features now match the plan.",
      });
    },
    [callEdgeFunction, toast],
  );

  // Slug to Tenant ID resolution
  const resolveTenantId = useCallback(
    async (slug: string): Promise<string> => {
      const response = await callEdgeFunction<{ tenantId: string }>(
        "tenant-resolver",
        {
          slug,
        },
      );
      return response.data!.tenantId;
    },
    [callEdgeFunction],
  );

  // Enhanced tenant fetching with proper types
  const getTenant = useCallback(
    async (tenantId: string): Promise<TenantData> => {
      // Fetch tenant basic data
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select(
          `
        id,
        name,
        slug,
        status,
        timezone,
        currency,
        description,
        phone,
        email,
        website,
        address,
        created_at,
        updated_at
      `,
        )
        .eq("id", tenantId)
        .single();

      if (tenantError) throw tenantError;

      // Fetch analytics data in parallel
      const [bookingsResult, tablesResult] = await Promise.all([
        // Get total bookings count
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId),
        
        // Get active tables count
        supabase
          .from("restaurant_tables")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("active", true),
      ]);

      const totalBookings = bookingsResult.count || 0;
      const activeTables = tablesResult.count || 0;

      // Calculate revenue from bookings with deposits
      const { data: revenueData } = await supabase
        .from("bookings")
        .select("deposit_amount")
        .eq("tenant_id", tenantId)
        .eq("deposit_paid", true)
        .not("deposit_amount", "is", null);

      const revenue = revenueData?.reduce((sum, booking) => 
        sum + (booking.deposit_amount || 0), 0) || 0;

      return {
        ...tenantData,
        analytics: {
          total_bookings: totalBookings,
          revenue: revenue,
          active_tables: activeTables,
        },
      } as TenantData;
    },
    [],
  );

  const updateTenant = useCallback(
    async (tenantId: string, updates: Partial<{
      name: string;
      description: string;
      email: string;
      phone: string;
      timezone: string;
      currency: string;
      website: string;
      status: string;
      address: any;
    }>): Promise<TenantData> => {
      // Validate required fields
      if (!tenantId) {
        throw new Error("Tenant ID is required");
      }

      // Clean up updates object - remove undefined values and trim strings
      const cleanUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          if (typeof value === 'string') {
            acc[key] = value.trim();
          } else {
            acc[key] = value;
          }
        }
        return acc;
      }, {} as Record<string, any>);

      if (Object.keys(cleanUpdates).length === 0) {
        throw new Error("No valid updates provided");
      }

      // Add updated_at timestamp
      cleanUpdates.updated_at = new Date().toISOString();

      console.log('Updating tenant:', tenantId, 'with data:', cleanUpdates);

      // Special handling for email updates - sync with auth user
      const isEmailUpdate = 'email' in cleanUpdates && cleanUpdates.email;
      
      if (isEmailUpdate) {
        console.log('Email update detected, will sync with auth user after database update');
      }

      // Perform the database update
      const { data, error } = await supabase
        .from("tenants")
        .update(cleanUpdates)
        .eq("id", tenantId)
        .select(
          `
          id,
          name,
          slug,
          status,
          timezone,
          currency,
          description,
          phone,
          email,
          website,
          address,
          created_at,
          updated_at
        `
        )
        .single();

      if (error) {
        console.error('Database update error:', error);
        throw new Error(`Failed to update tenant: ${error.message}`);
      }

      if (!data) {
        throw new Error("No data returned from update operation");
      }

      console.log('Tenant updated successfully in database:', data);

      // If email was updated, sync with auth user
      if (isEmailUpdate) {
        try {
          console.log('Syncing email with tenant owner auth account...');
          await callEdgeFunction('manage-tenant-credentials', {
            tenantId,
            action: 'update_email',
            newEmail: cleanUpdates.email,
          });
          console.log('Auth user email synced successfully');
        } catch (authError) {
          console.error('Failed to sync auth user email:', authError);
          // Log the error but don't fail the entire operation
          // The database was updated successfully, auth sync can be retried
          toast({
            title: "Warning",
            description: "Tenant email updated, but owner account email sync failed. Use the Credentials tab to manually update the owner email.",
            variant: "default",
          });
        }
      }

      // Verify the update by fetching fresh data with analytics
      const updatedTenant = await getTenant(tenantId);
      console.log('Fetched updated tenant with analytics:', updatedTenant);
      
      return updatedTenant;
    },
    [getTenant, callEdgeFunction, toast],
  );

  const listTenants = useCallback(
    async (filters?: {
      search?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }): Promise<{ tenants: TenantData[]; total: number }> => {
      let query = supabase.from("tenants").select(
        `
        id,
        name,
        slug,
        status,
        timezone,
        currency,
        description,
        created_at,
        updated_at
      `,
        { count: "exact" },
      );

      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`,
        );
      }

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.limit) {
        query = query.range(
          filters.offset || 0,
          (filters.offset || 0) + filters.limit - 1,
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const tenants = (data || []).map((tenant) => ({
        ...tenant,
      })) as TenantData[];

      return { tenants, total: count || 0 };
    },
    [],
  );

  return {
    loading,
    // Tenant Operations
    provisionTenant,
    resendWelcomeEmail,
  issuePasswordSetupLink,
    getTenant,
    updateTenant,
    listTenants,
    // Features Management
    getTenantFeatures,
    updateTenantFeature,
    resetFeaturesToPlan,
    // Utilities
    resolveTenantId,
    callEdgeFunction,
  };
};
