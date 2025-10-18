import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  subscribers?: Array<{
    id: string;
    subscribed: boolean;
    subscription_tier: string;
    subscription_status: string;
    billing_cycle: string;
    current_period_end: string;
    stripe_customer_id: string;
  }>;
  lastPayment?: {
    status: string;
    amount: number;
    created_at: string;
  };
  failedPayments?: number;
  totalRevenue?: number;
}

export interface PaymentHistory {
  id: string;
  tenant_id: string;
  amount: number;
  currency: string;
  status: string;
  billing_reason: string;
  paid_at: string;
  due_date: string;
  created_at: string;
  tenants: {
    name: string;
    slug: string;
  };
  subscribers: {
    subscription_tier: string;
  };
}

export interface BillingAnalytics {
  totalRevenue: number;
  totalTransactions: number;
  revenueByPlan: Record<string, number>;
  subscriptionsByTier: Record<string, number>;
}

export const useBillingAPI = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const callBillingAPI = async (
    endpoint: string,
    options?: {
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      body?: Record<string, unknown>;
    },
  ) => {
    try {
      setLoading(true);
      console.log("Calling billing API:", endpoint, options);

      const { data, error } = await supabase.functions.invoke(
        "billing-management",
        {
          body: {
            action: endpoint,
            ...options?.body,
          },
        },
      );

      if (error) {
        console.error("Billing API error:", error);
        throw error;
      }

      console.log("Billing API response:", data);
      return data;
    } catch (error: unknown) {
      const errorObj = error as Error;
      console.error("Billing API error:", errorObj);
      toast({
        title: "Error",
        description:
          errorObj.message || "An error occurred while calling the billing API",
        variant: "destructive",
      });
      throw errorObj;
    } finally {
      setLoading(false);
    }
  };

  const getRestaurants = async (): Promise<Restaurant[]> => {
    const data = await callBillingAPI("restaurants");
    return data.restaurants || [];
  };

  const getPaymentHistory = async (
    tenantId?: string,
  ): Promise<PaymentHistory[]> => {
    const url = tenantId
      ? `payment-history?tenant_id=${tenantId}`
      : "payment-history";
    const data = await callBillingAPI(url);
    return data.payments || [];
  };

  const sendPaymentReminder = async (
    tenantId: string,
    reminderType: "overdue" | "failed" | "upcoming",
  ) => {
    const data = await callBillingAPI("send-reminder", {
      method: "POST",
      body: { tenant_id: tenantId, reminder_type: reminderType },
    });

    return data;
  };

  const getBillingAnalytics = async (
    startDate?: string,
    endDate?: string,
  ): Promise<BillingAnalytics> => {
    let url = "analytics";
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const data = await callBillingAPI(url);
    return (
      data.analytics || {
        totalRevenue: 0,
        totalTransactions: 0,
        revenueByPlan: {},
        subscriptionsByTier: {},
      }
    );
  };

  const updateSubscription = async (tenantId: string, newPlan: string) => {
    const data = await callBillingAPI("update-subscription", {
      method: "POST",
      body: { tenant_id: tenantId, new_plan: newPlan },
    });

    toast({
      title: "Success",
      description: "Subscription updated successfully",
    });

    return data;
  };

  const exportBillingData = async (
    format: "csv" | "json",
    tenantId?: string,
  ) => {
    try {
      const payments = await getPaymentHistory(tenantId);

      if (format === "csv") {
        const csvContent = [
          "Date,Restaurant,Plan,Amount,Status,Billing Reason",
          ...payments.map(
            (p) =>
              `${p.created_at},${p.tenants.name},${p.subscribers.subscription_tier},${p.amount / 100},${p.status},${p.billing_reason || ""}`,
          ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `billing-data-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const jsonContent = JSON.stringify(payments, null, 2);
        const blob = new Blob([jsonContent], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `billing-data-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Success",
        description: `Billing data exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: "Failed to export billing data",
        variant: "destructive",
      });
    }
  };

  return {
    loading,
    getRestaurants,
    getPaymentHistory,
    sendPaymentReminder,
    getBillingAnalytics,
    updateSubscription,
    exportBillingData,
  };
};
