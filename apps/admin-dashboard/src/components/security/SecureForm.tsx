import { FormEvent, ReactNode, useState } from "react";
import { CSRFProtection } from "@/lib/security/csrfProtection";
import { InputSanitizer } from "@/lib/security/inputSanitizer";
import { RateLimiter } from "@/lib/security/rateLimiter";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SecureFormProps {
  children: ReactNode;
  onSubmit: (formData: FormData) => Promise<void> | void;
  action?: string;
  rateLimit?: {
    limit: number;
    windowMinutes: number;
  };
  sanitizeInputs?: boolean;
  className?: string;
}

export const SecureForm = ({
  children,
  onSubmit,
  action = "form_submit",
  rateLimit = { limit: 10, windowMinutes: 5 },
  sanitizeInputs = true,
  className = "",
}: SecureFormProps) => {
  const { user } = useAuth();
  const { logSecurityEvent } = useAuditLogger();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitting) return;

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Rate limiting check
    if (user) {
      const isRateLimited = RateLimiter.isRateLimited(
        user.id,
        action,
        rateLimit.limit,
        rateLimit.windowMinutes,
      );

      if (isRateLimited) {
        toast.error("Too many requests. Please wait before trying again.");
        await logSecurityEvent({
          eventType: "rate_limit_violation",
          severity: "medium",
          eventData: {
            action,
            form_action: action,
            blocked: true,
          },
        });
        return;
      }
    }

    // CSRF token validation
    const csrfToken = CSRFProtection.getToken();
    if (!csrfToken || !CSRFProtection.validateToken(csrfToken)) {
      toast.error("Security token invalid. Please refresh the page.");
      await logSecurityEvent({
        eventType: "csrf_validation_failed",
        severity: "high",
        eventData: {
          action,
          has_token: !!csrfToken,
        },
      });
      return;
    }

    // Add CSRF token to form data
    formData.set("csrf_token", csrfToken);

    // Sanitize inputs if enabled
    if (sanitizeInputs) {
      for (const [key, value] of formData.entries()) {
        if (typeof value === "string") {
          const sanitized = InputSanitizer.sanitizeUserInput(value);
          formData.set(key, sanitized);
        }
      }
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);

      // Log successful form submission
      await logSecurityEvent({
        eventType: "secure_form_submitted",
        severity: "low",
        eventData: {
          action,
          sanitized: sanitizeInputs,
          csrf_validated: true,
        },
      });
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("An error occurred. Please try again.");

      await logSecurityEvent({
        eventType: "secure_form_error",
        severity: "medium",
        eventData: {
          action,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <input
        type="hidden"
        name="csrf_token"
        value={CSRFProtection.getToken() || ""}
      />
      {children}
    </form>
  );
};
