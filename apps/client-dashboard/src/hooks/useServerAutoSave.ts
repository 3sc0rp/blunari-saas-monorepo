/**
 * useServerAutoSave Hook
 * 
 * Provides server-side auto-save functionality for catering orders.
 * Syncs draft data to Supabase for cross-device continuity and recovery.
 * 
 * Features:
 * - Automatic save with debouncing (3s default)
 * - Conflict detection and resolution
 * - Sync status indicator
 * - Draft loading on mount
 * - Fallback to local storage if server fails
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OrderForm } from "@/components/catering/CateringContext";
import { saveDraft as saveLocalDraft, loadDraft as loadLocalDraft } from "@/utils/catering-autosave";

export type SyncStatus = "idle" | "saving" | "saved" | "error" | "conflict";

interface ServerDraft {
  id: string;
  draft_data: Partial<OrderForm>;
  package_id?: string;
  current_step: string;
  version: number;
  updated_at: string;
  expires_at: string;
}

interface UseServerAutoSaveConfig {
  /** Tenant ID */
  tenantId: string;
  
  /** Tenant slug for local storage fallback */
  tenantSlug: string;
  
  /** Session ID (generated once per browser session) */
  sessionId: string;
  
  /** Current step */
  currentStep: string;
  
  /** Auto-save delay in milliseconds */
  debounceDelay?: number;
  
  /** Enable server auto-save (can disable for testing) */
  enabled?: boolean;
}

/**
 * Hook for server-side auto-save
 */
export const useServerAutoSave = (config: UseServerAutoSaveConfig) => {
  const {
    tenantId,
    tenantSlug,
    sessionId,
    currentStep,
    debounceDelay = 3000,
    enabled = true,
  } = config;

  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [serverDraft, setServerDraft] = useState<ServerDraft | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const versionRef = useRef<number>(1);

  /**
   * Get Edge Function URL
   */
  const getEdgeFunctionUrl = useCallback((endpoint: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/functions/v1/catering-draft-autosave/${endpoint}`;
  }, []);

  /**
   * Load draft from server on mount
   */
  const loadServerDraft = useCallback(async (): Promise<ServerDraft | null> => {
    if (!enabled) return null;

    try {
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const url = `${getEdgeFunctionUrl("load")}?sessionId=${sessionId}&tenantId=${tenantId}`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const { draft } = await response.json();
      
      if (draft) {
        setServerDraft(draft);
        versionRef.current = draft.version;
        setLastSyncTime(new Date(draft.updated_at));
        return draft;
      }

      return null;
    } catch (error) {
      console.error("[Server Auto-save] Failed to load draft:", error);
      // Fallback to local storage
      const localDraft = loadLocalDraft(tenantSlug);
      if (localDraft) {
        console.log("[Server Auto-save] Using local draft as fallback");
        return {
          id: "local",
          draft_data: localDraft.data as Partial<OrderForm>,
          package_id: localDraft.packageId,
          current_step: "packages",
          version: 1,
          updated_at: new Date(localDraft.timestamp).toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };
      }
      return null;
    }
  }, [enabled, sessionId, tenantId, tenantSlug, getEdgeFunctionUrl]);

  /**
   * Save draft to server
   */
  const saveDraftToServer = useCallback(async (
    draftData: Partial<OrderForm>,
    packageId?: string
  ): Promise<void> => {
    if (!enabled) {
      // Fallback to local storage
      saveLocalDraft(tenantSlug, draftData, packageId);
      return;
    }

    try {
      setSyncStatus("saving");

      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(getEdgeFunctionUrl("save"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          sessionId,
          tenantId,
          draftData,
          packageId,
          currentStep,
          version: versionRef.current,
        }),
      });

      const result = await response.json();

      if (response.status === 409) {
        // Conflict detected
        setSyncStatus("conflict");
        console.warn("[Server Auto-save] Conflict detected:", result);
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      // Success
      setServerDraft(result.draft);
      versionRef.current = result.draft.version;
      setLastSyncTime(new Date());
      setSyncStatus("saved");

      // Also save to local storage as backup
      saveLocalDraft(tenantSlug, draftData, packageId);

      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSyncStatus("idle");
      }, 2000);

    } catch (error) {
      console.error("[Server Auto-save] Failed to save draft:", error);
      setSyncStatus("error");
      
      // Fallback to local storage
      saveLocalDraft(tenantSlug, draftData, packageId);

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setSyncStatus("idle");
      }, 3000);
    }
  }, [enabled, sessionId, tenantId, tenantSlug, currentStep, getEdgeFunctionUrl]);

  /**
   * Debounced auto-save
   */
  const autoSave = useCallback((
    draftData: Partial<OrderForm>,
    packageId?: string
  ) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      saveDraftToServer(draftData, packageId);
    }, debounceDelay);
  }, [saveDraftToServer, debounceDelay]);

  /**
   * Clear draft from server
   */
  const clearServerDraft = useCallback(async (): Promise<void> => {
    if (!enabled) return;

    try {
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(getEdgeFunctionUrl("clear"), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          sessionId,
          tenantId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setServerDraft(null);
      versionRef.current = 1;
      setLastSyncTime(null);
      setSyncStatus("idle");

    } catch (error) {
      console.error("[Server Auto-save] Failed to clear draft:", error);
    }
  }, [enabled, sessionId, tenantId, getEdgeFunctionUrl]);

  /**
   * Load draft on mount
   */
  useEffect(() => {
    loadServerDraft();
  }, [loadServerDraft]);

  /**
   * Cleanup timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    syncStatus,
    lastSyncTime,
    serverDraft,
    autoSave,
    loadServerDraft,
    clearServerDraft,
    saveDraftToServer, // For immediate save (e.g., on submit)
  };
};

/**
 * Generate a persistent session ID for the browser
 */
export const getOrCreateSessionId = (): string => {
  const STORAGE_KEY = "catering_session_id";
  
  let sessionId = localStorage.getItem(STORAGE_KEY);
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(STORAGE_KEY, sessionId);
  }
  
  return sessionId;
};
