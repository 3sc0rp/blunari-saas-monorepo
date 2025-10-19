/**
 * Catering Widget Analytics Tracking
 * 
 * Comprehensive event tracking for catering order funnel analysis.
 * Tracks user interactions, form abandonment, and conversion metrics.
 */

// Analytics event types
export type CateringAnalyticsEvent =
  | 'catering_widget_viewed'
  | 'catering_package_viewed'
  | 'catering_package_selected'
  | 'catering_step_completed'
  | 'catering_field_focused'
  | 'catering_field_completed'
  | 'catering_field_error'
  | 'catering_validation_error'
  | 'catering_draft_saved'
  | 'catering_draft_restored'
  | 'catering_order_submitted'
  | 'catering_order_failed'
  | 'catering_form_abandoned';

// Event metadata interfaces
export interface CateringEventMetadata {
  tenant_id?: string;
  tenant_slug?: string;
  session_id?: string;
  timestamp?: number;
  [key: string]: any;
}

export interface PackageViewedMetadata extends CateringEventMetadata {
  package_id: string;
  package_name: string;
  price_per_person: number;
  min_guests: number;
  max_guests?: number;
}

export interface PackageSelectedMetadata extends CateringEventMetadata {
  package_id: string;
  package_name: string;
  price_per_person: number;
}

export interface StepCompletedMetadata extends CateringEventMetadata {
  step: 'packages' | 'customize' | 'details' | 'confirmation';
  step_number: number;
  time_on_step_seconds: number;
}

export interface FieldEventMetadata extends CateringEventMetadata {
  field_name: string;
  field_type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'textarea';
  value_length?: number;
  is_required: boolean;
}

export interface FieldErrorMetadata extends FieldEventMetadata {
  error_message: string;
  error_type: 'validation' | 'required' | 'format';
}

export interface OrderSubmittedMetadata extends CateringEventMetadata {
  package_id: string;
  guest_count: number;
  service_type: string;
  total_price_cents: number;
  has_special_instructions: boolean;
  has_dietary_requirements: boolean;
  time_to_complete_seconds: number;
  draft_restored: boolean;
}

export interface FormAbandonedMetadata extends CateringEventMetadata {
  last_step: 'packages' | 'customize' | 'details';
  fields_completed: string[];
  fields_total: number;
  completion_percentage: number;
  time_spent_seconds: number;
}

// Session tracking
let sessionStartTime: number | null = null;
let stepStartTimes: Record<string, number> = {};
let sessionId: string | null = null;

/**
 * Generates a unique session ID
 */
const generateSessionId = (): string => {
  return `catering_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Gets or creates a session ID
 */
export const getSessionId = (): string => {
  if (!sessionId) {
    sessionId = generateSessionId();
  }
  return sessionId;
};

/**
 * Tracks time spent on a step
 */
export const startStepTimer = (step: string): void => {
  stepStartTimes[step] = Date.now();
};

/**
 * Gets time spent on a step in seconds
 */
export const getStepDuration = (step: string): number => {
  const startTime = stepStartTimes[step];
  if (!startTime) return 0;
  return Math.floor((Date.now() - startTime) / 1000);
};

/**
 * Tracks total session duration
 */
export const startSession = (): void => {
  sessionStartTime = Date.now();
  getSessionId(); // Initialize session ID
};

/**
 * Gets total session duration in seconds
 */
export const getSessionDuration = (): number => {
  if (!sessionStartTime) return 0;
  return Math.floor((Date.now() - sessionStartTime) / 1000);
};

/**
 * Main analytics tracking function
 * Integrates with your analytics provider (e.g., Google Analytics, Mixpanel, PostHog)
 * Also sends events to server-side Edge Function to bypass ad blockers
 */
export const trackCateringEvent = (
  event: CateringAnalyticsEvent,
  metadata: CateringEventMetadata = {}
): void => {
  const enrichedMetadata = {
    ...metadata,
    session_id: getSessionId(),
    timestamp: Date.now(),
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    viewport_width: typeof window !== 'undefined' ? window.innerWidth : 0,
    viewport_height: typeof window !== 'undefined' ? window.innerHeight : 0,
  };

  // Console logging for development
  if (import.meta.env.DEV || import.meta.env.VITE_ANALYTICS_DEBUG) {
    console.log('[Analytics]', event, enrichedMetadata);
  }

  // Client-side analytics providers (can be blocked by ad blockers)

  // Google Analytics 4
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, enrichedMetadata);
  }

  // Mixpanel
  if (typeof window !== 'undefined' && (window as any).mixpanel) {
    (window as any).mixpanel.track(event, enrichedMetadata);
  }

  // PostHog
  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture(event, enrichedMetadata);
  }

  // Server-side tracking (CANNOT be blocked by ad blockers)
  if (metadata.tenant_id) {
    trackEventServerSide(event, enrichedMetadata).catch((error) => {
      // Silently fail - don't break user experience if server tracking fails
      if (import.meta.env.DEV) {
        console.error('[Analytics] Server-side tracking failed:', error);
      }
    });
  }
};

/**
 * Server-side event tracking via Edge Function
 * This bypasses ad blockers and provides reliable analytics
 */
const trackEventServerSide = async (
  event: CateringAnalyticsEvent,
  metadata: CateringEventMetadata
): Promise<void> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/track-catering-analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        tenant_id: metadata.tenant_id,
        event_name: event,
        event_data: metadata,
        session_id: metadata.session_id,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Server-side tracking failed');
    }

    if (import.meta.env.DEV || import.meta.env.VITE_ANALYTICS_DEBUG) {
      const result = await response.json();
      console.log('[Analytics] Server-side tracked:', result);
    }
  } catch (error) {
    // Re-throw to be caught by caller
    throw error;
  }
};

/**
 * Tracks widget view
 */
export const trackWidgetViewed = (tenantId: string, tenantSlug: string): void => {
  startSession();
  trackCateringEvent('catering_widget_viewed', {
    tenant_id: tenantId,
    tenant_slug: tenantSlug,
  });
};

/**
 * Tracks package view
 */
export const trackPackageViewed = (
  packageData: PackageViewedMetadata
): void => {
  trackCateringEvent('catering_package_viewed', packageData);
};

/**
 * Tracks package selection
 */
export const trackPackageSelected = (
  packageData: PackageSelectedMetadata
): void => {
  trackCateringEvent('catering_package_selected', packageData);
};

/**
 * Tracks step completion
 */
export const trackStepCompleted = (
  step: 'packages' | 'customize' | 'details' | 'confirmation',
  stepNumber: number
): void => {
  const duration = getStepDuration(step);
  trackCateringEvent('catering_step_completed', {
    step,
    step_number: stepNumber,
    time_on_step_seconds: duration,
  });
};

/**
 * Tracks field interaction
 */
export const trackFieldFocused = (
  fieldName: string,
  fieldType: string,
  isRequired: boolean
): void => {
  trackCateringEvent('catering_field_focused', {
    field_name: fieldName,
    field_type: fieldType,
    is_required: isRequired,
  });
};

/**
 * Tracks field completion
 */
export const trackFieldCompleted = (
  fieldName: string,
  fieldType: string,
  valueLength: number,
  isRequired: boolean
): void => {
  trackCateringEvent('catering_field_completed', {
    field_name: fieldName,
    field_type: fieldType,
    value_length: valueLength,
    is_required: isRequired,
  });
};

/**
 * Tracks field validation error
 */
export const trackFieldError = (
  fieldName: string,
  fieldType: string,
  errorMessage: string,
  errorType: 'validation' | 'required' | 'format',
  isRequired: boolean
): void => {
  trackCateringEvent('catering_field_error', {
    field_name: fieldName,
    field_type: fieldType,
    error_message: errorMessage,
    error_type: errorType,
    is_required: isRequired,
  });
};

/**
 * Tracks draft save
 */
export const trackDraftSaved = (): void => {
  trackCateringEvent('catering_draft_saved', {
    session_duration_seconds: getSessionDuration(),
  });
};

/**
 * Tracks draft restoration
 */
export const trackDraftRestored = (draftAge: string): void => {
  trackCateringEvent('catering_draft_restored', {
    draft_age: draftAge,
  });
};

/**
 * Tracks successful order submission
 */
export const trackOrderSubmitted = (
  orderData: OrderSubmittedMetadata
): void => {
  trackCateringEvent('catering_order_submitted', {
    ...orderData,
    time_to_complete_seconds: getSessionDuration(),
  });
};

/**
 * Tracks order submission failure
 */
export const trackOrderFailed = (
  errorMessage: string,
  errorType: string
): void => {
  trackCateringEvent('catering_order_failed', {
    error_message: errorMessage,
    error_type: errorType,
    session_duration_seconds: getSessionDuration(),
  });
};

/**
 * Tracks form abandonment
 */
export const trackFormAbandoned = (
  abandonmentData: FormAbandonedMetadata
): void => {
  trackCateringEvent('catering_form_abandoned', {
    ...abandonmentData,
    time_spent_seconds: getSessionDuration(),
  });
};

/**
 * Hook for tracking form abandonment on page unload
 */
export const setupAbandonmentTracking = (
  getCurrentStep: () => string,
  getCompletedFields: () => string[],
  getTotalFields: () => number
): (() => void) => {
  const handleBeforeUnload = () => {
    const currentStep = getCurrentStep();
    const completedFields = getCompletedFields();
    const totalFields = getTotalFields();
    const completionPercentage = totalFields > 0 
      ? Math.round((completedFields.length / totalFields) * 100)
      : 0;

    // Only track if user has started filling the form
    if (completedFields.length > 0 && currentStep !== 'confirmation') {
      trackFormAbandoned({
        last_step: currentStep as any,
        fields_completed: completedFields,
        fields_total: totalFields,
        completion_percentage: completionPercentage,
        time_spent_seconds: getSessionDuration(),
      });
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleBeforeUnload);
  }

  // Cleanup function
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  };
};

/**
 * Calculates form completion percentage
 */
export const calculateCompletionPercentage = (
  formData: Record<string, any>,
  requiredFields: string[]
): number => {
  const completedRequired = requiredFields.filter(field => {
    const value = formData[field];
    return value !== undefined && value !== null && value !== '';
  }).length;

  return requiredFields.length > 0
    ? Math.round((completedRequired / requiredFields.length) * 100)
    : 0;
};

/**
 * Gets list of completed fields
 */
export const getCompletedFields = (
  formData: Record<string, any>
): string[] => {
  return Object.keys(formData).filter(field => {
    const value = formData[field];
    return value !== undefined && value !== null && value !== '' && 
           (Array.isArray(value) ? value.length > 0 : true);
  });
};
