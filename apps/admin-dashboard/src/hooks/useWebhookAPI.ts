import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface WebhookPayload {
  event_type: string;
  data: any;
  timestamp: string;
  source: "pos" | "payment" | "email";
}

export interface WebhookResponse {
  success: boolean;
  message: string;
  processed_at: string;
}

export const useWebhookAPI = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const callWebhookAPI = async (
    endpoint: string,
    options: RequestInit = {},
  ) => {
    try {
      setLoading(true);

      const response = await supabase.functions.invoke("webhook-handler", {
        body: {
          endpoint,
          method: options.method || "POST",
          body: options.body ? JSON.parse(options.body as string) : undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    } catch (error) {
      console.error("Webhook API Error:", error);
      toast({
        title: "Webhook Error",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const triggerPOSWebhook = async (eventData: {
    event_type: string;
    tenant_id: string;
    pos_data: any;
  }) => {
    return callWebhookAPI("/webhooks/pos", {
      method: "POST",
      body: JSON.stringify(eventData),
    });
  };

  const triggerPaymentWebhook = async (eventData: {
    event_type: string;
    payment_id: string;
    amount: number;
    status: string;
    tenant_id: string;
  }) => {
    return callWebhookAPI("/webhooks/payment", {
      method: "POST",
      body: JSON.stringify(eventData),
    });
  };

  const triggerEmailWebhook = async (eventData: {
    event_type: string;
    email_id: string;
    status: string;
    recipient: string;
    tenant_id?: string;
  }) => {
    return callWebhookAPI("/webhooks/email", {
      method: "POST",
      body: JSON.stringify(eventData),
    });
  };

  const testWebhook = async (
    webhookType: "pos" | "payment" | "email",
    testData: any,
  ) => {
    const endpointMap = {
      pos: "/webhooks/pos",
      payment: "/webhooks/payment",
      email: "/webhooks/email",
    };

    return callWebhookAPI(endpointMap[webhookType], {
      method: "POST",
      body: JSON.stringify({
        ...testData,
        test_mode: true,
      }),
    });
  };

  return {
    loading,
    triggerPOSWebhook,
    triggerPaymentWebhook,
    triggerEmailWebhook,
    testWebhook,
  };
};
