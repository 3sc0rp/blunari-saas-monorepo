import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import {
  CateringPackage,
  CateringServiceType,
  DietaryRestriction,
} from "@/types/catering";
import {
  saveDraft,
  loadDraft,
  clearDraft,
  hasDraft,
  getDraftAge,
  createAutoSave,
  cleanupExpiredDrafts,
} from "@/utils/catering-autosave";
import {
  trackStepCompleted,
  trackFieldError,
  trackDraftSaved,
  trackDraftRestored,
  setupAbandonmentTracking,
} from "@/utils/catering-analytics";
import { useServerAutoSave, getOrCreateSessionId, SyncStatus } from "@/hooks/useServerAutoSave";

// ============================================================================
// Types
// ============================================================================

export type CateringStep = "packages" | "customize" | "details" | "confirmation";

export interface OrderForm {
  package_id?: string;
  event_name: string;
  event_date: string;
  event_start_time: string;
  event_end_time?: string;
  guest_count: number;
  service_type: CateringServiceType;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  venue_name?: string;
  venue_address?: string;
  delivery_address?: string;
  special_instructions?: string;
  dietary_requirements: DietaryRestriction[];
}

export interface CateringContextValue {
  // State
  currentStep: CateringStep;
  selectedPackage: CateringPackage | null;
  orderForm: OrderForm;
  orderConfirmed: boolean;
  submitting: boolean;
  submitError: string | null;
  fieldErrors: Record<string, string>;
  showDraftNotification: boolean;
  draftAge: string | null;

  // Server auto-save state
  syncStatus: SyncStatus;
  lastSyncTime: Date | null;

  // Actions
  setCurrentStep: (step: CateringStep) => void;
  setSelectedPackage: (pkg: CateringPackage | null) => void;
  updateOrderForm: (updates: Partial<OrderForm>) => void;
  setOrderConfirmed: (confirmed: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  setSubmitError: (error: string | null) => void;
  setFieldError: (field: string, error: string) => void;
  clearFieldError: (field: string) => void;
  clearAllFieldErrors: () => void;
  restoreDraft: () => void;
  dismissDraft: () => void;
  resetForm: () => void;

  // Utilities
  getSessionId: () => string;
  getTenantId: () => string | undefined;
  autoSave: (data: OrderForm) => void;
}

// ============================================================================
// Context
// ============================================================================

const CateringContext = createContext<CateringContextValue | undefined>(undefined);

// ============================================================================
// Provider Props
// ============================================================================

interface CateringProviderProps {
  children: ReactNode;
  slug: string;
  tenantId?: string;
  onStepChange?: (step: CateringStep) => void;
}

// ============================================================================
// Initial Form State
// ============================================================================

const getInitialFormState = (): OrderForm => ({
  event_name: "",
  event_date: "",
  event_start_time: "12:00",
  guest_count: 50,
  service_type: "drop_off",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  venue_name: "",
  venue_address: "",
  special_instructions: "",
  dietary_requirements: [],
});

// ============================================================================
// Provider Component
// ============================================================================

export const CateringProvider: React.FC<CateringProviderProps> = ({
  children,
  slug,
  tenantId,
  onStepChange,
}) => {
  // State
  const [currentStep, setCurrentStepState] = useState<CateringStep>("packages");
  const [selectedPackage, setSelectedPackage] = useState<CateringPackage | null>(null);
  const [orderForm, setOrderForm] = useState<OrderForm>(getInitialFormState());
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showDraftNotification, setShowDraftNotification] = useState(false);
  const [draftAge, setDraftAge] = useState<string | null>(null);
  const [sessionId] = useState(() => getOrCreateSessionId());

  // Server auto-save hook
  const {
    syncStatus,
    lastSyncTime,
    serverDraft,
    autoSave: serverAutoSave,
    loadServerDraft,
    clearServerDraft,
  } = useServerAutoSave({
    tenantId: tenantId || "",
    tenantSlug: slug,
    sessionId,
    currentStep,
    enabled: !!tenantId, // Only enable if we have tenantId
  });

  // Auto-save function with debouncing (fallback to local if server unavailable)
  const autoSave = useCallback(
    (formData: Partial<OrderForm>, packageId?: string) => {
      if (tenantId) {
        serverAutoSave(formData, packageId);
      } else {
        createAutoSave(slug, 2000)(formData, packageId);
      }
    },
    [slug, tenantId, serverAutoSave]
  );

  // Wrapped setCurrentStep to trigger onStepChange callback
  const setCurrentStep = useCallback((step: CateringStep) => {
    setCurrentStepState(step);
    if (onStepChange) {
      onStepChange(step);
    }
    
    // Track step completion
    const stepNumber = {
      packages: 1,
      customize: 2,
      details: 3,
      confirmation: 4,
    }[step];
    trackStepCompleted(step, stepNumber);
  }, [onStepChange]);

  // Update order form and trigger auto-save
  const updateOrderForm = useCallback((updates: Partial<OrderForm>) => {
    setOrderForm((prev) => {
      const updated = { ...prev, ...updates };
      autoSave(updated);
      return updated;
    });
  }, [autoSave]);

  // Field error management
  const setFieldError = useCallback((field: string, error: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
    
    // Track field error
    trackFieldError(field, "text", error, "validation", false);
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  }, []);

  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  // Draft management
  const restoreDraft = useCallback(() => {
    const draft = loadDraft(slug);
    if (draft && draft.data) {
      setOrderForm(draft.data as OrderForm);
      setShowDraftNotification(false);
      
      // Track draft restoration
      const age = getDraftAge(slug);
      if (age) {
        trackDraftRestored(`${age} minutes`);
      }
    }
  }, [slug]);

  const dismissDraft = useCallback(() => {
    clearDraft(slug);
    setShowDraftNotification(false);
  }, [slug]);

  const resetForm = useCallback(() => {
    setOrderForm(getInitialFormState());
    setSelectedPackage(null);
    setCurrentStepState("packages");
    setOrderConfirmed(false);
    setSubmitting(false);
    setSubmitError(null);
    setFieldErrors({});
    clearDraft(slug);
  }, [slug]);

  // Utility functions
  const getSessionId = useCallback(() => sessionId, [sessionId]);
  const getTenantId = useCallback(() => tenantId, [tenantId]);

  // Check for existing draft on mount
  useEffect(() => {
    if (hasDraft(slug)) {
      const age = getDraftAge(slug);
      setDraftAge(age ? `${age} minutes ago` : null);
      setShowDraftNotification(true);
    }
  }, [slug]);

  // Cleanup expired drafts periodically
  useEffect(() => {
    cleanupExpiredDrafts();
    const interval = setInterval(() => {
      cleanupExpiredDrafts();
    }, 300000); // Every 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Setup abandonment tracking
  useEffect(() => {
    if (tenantId) {
      const cleanup = setupAbandonmentTracking(
        () => currentStep,
        () => Object.keys(orderForm).filter(key => {
          const value = orderForm[key as keyof OrderForm];
          return value !== "" && value !== undefined && value !== null;
        }),
        () => Object.keys(orderForm).length
      );

      return cleanup;
    }
  }, [tenantId, currentStep, orderForm]);

  // Context value
  const value: CateringContextValue = {
    // State
    currentStep,
    selectedPackage,
    orderForm,
    orderConfirmed,
    submitting,
    submitError,
    fieldErrors,
    showDraftNotification,
    draftAge,

    // Server auto-save state
    syncStatus,
    lastSyncTime,

    // Actions
    setCurrentStep,
    setSelectedPackage,
    updateOrderForm,
    setOrderConfirmed,
    setSubmitting,
    setSubmitError,
    setFieldError,
    clearFieldError,
    clearAllFieldErrors,
    restoreDraft,
    dismissDraft,
    resetForm,

    // Utilities
    getSessionId,
    getTenantId,
    autoSave,
  };

  return (
    <CateringContext.Provider value={value}>
      {children}
    </CateringContext.Provider>
  );
};

// ============================================================================
// Custom Hook
// ============================================================================

export const useCateringContext = (): CateringContextValue => {
  const context = useContext(CateringContext);
  if (!context) {
    throw new Error("useCateringContext must be used within CateringProvider");
  }
  return context;
};

// ============================================================================
// Export Types
// ============================================================================

export type { OrderForm as CateringOrderForm };
