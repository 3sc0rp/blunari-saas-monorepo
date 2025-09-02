import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RateLimitCheck {
  allowed: boolean;
  attemptsRemaining?: number;
  blockedUntil?: string;
  reason?: string;
}

export const useSecurityRateLimit = () => {
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  const checkRateLimit = async (
    operationType: string,
  ): Promise<RateLimitCheck> => {
    setChecking(true);
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { allowed: false, reason: "Not authenticated" };
      }

      // Simple rate limiting using activity_logs for now (since security_rate_limits may not exist)
      const now = new Date();
      const windowStart = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour window

      const { data: recentAttempts, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("action", `rate_limit_${operationType}`)
        .gte("created_at", windowStart.toISOString());

      if (error) {
        console.error("Rate limit check error:", error);
        return { allowed: true }; // Allow on error to not block legitimate users
      }

      // Define limits per operation type
      const limits: Record<string, number> = {
        api_key_generation: 5,
        password_reset: 3,
        login_attempt: 10,
        data_export: 2,
        sensitive_data_access: 20,
      };

      const maxAttempts = limits[operationType] || 10;
      const currentAttempts = recentAttempts?.length || 0;

      if (currentAttempts >= maxAttempts) {
        return {
          allowed: false,
          reason: "Rate limited",
          attemptsRemaining: 0,
        };
      }

      // Log this attempt
      await supabase.rpc("log_employee_activity", {
        p_action: `rate_limit_${operationType}`,
        p_resource_type: "security",
        p_resource_id: operationType,
      });

      return {
        allowed: true,
        attemptsRemaining: maxAttempts - currentAttempts - 1,
      };
    } catch (error) {
      console.error("Rate limit check failed:", error);
      return { allowed: true }; // Allow on error
    } finally {
      setChecking(false);
    }
  };

  const logSecurityViolation = async (
    operationType: string,
    details: any = {},
  ) => {
    try {
      // Log security events using the enhanced audit function
      await supabase.rpc("enhanced_security_audit", {
        operation_type: `rate_limit_violation_${operationType}`,
        resource_type: "security",
        sensitive_data_accessed: true,
        risk_level: "high",
      });

      toast({
        title: "Security Alert",
        description: `Rate limit exceeded for ${operationType}. Your account has been temporarily restricted.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error("Failed to log security violation:", error);
    }
  };

  return {
    checkRateLimit,
    logSecurityViolation,
    checking,
  };
};
