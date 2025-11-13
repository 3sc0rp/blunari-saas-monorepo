import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type UIMode = "management";

interface UIPreference {
  mode: UIMode;
  tenantId: string;
  seenTourAt?: string;
  version?: string; // For future migrations
}

interface ModeContextType {
  mode: UIMode;
  setMode: (mode: UIMode) => void;
  ready: boolean;
  seenTour: boolean;
  markTourSeen: () => Promise<void>;
  error?: string; // Add error state
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const useUIMode = () => {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error("useUIMode must be used within a ModeProvider");
  }
  return context;
};

interface ModeProviderProps {
  children: React.ReactNode;
}

// Utility function for retry logic
const withRetry = async <T,>(
  operation: () => Promise<T>,
  maxRetries = 2,
  delay = 1000
): Promise<T> => {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
};

export const ModeProvider: React.FC<ModeProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [mode, setModeState] = useState<UIMode>("management");
  const [ready, setReady] = useState(false);
  const [seenTour, setSeenTour] = useState(false);
  const [hasUserPreferences, setHasUserPreferences] = useState<boolean | null>(null);
  const [error, setError] = useState<string>();

  // Check if tenant_settings table exists and is accessible
  const checkUserPreferencesTable = useCallback(async () => {
    if (hasUserPreferences !== null) return hasUserPreferences;
    
    try {
      const { error } = await supabase
        .from('tenant_settings')
        .select('id')
        .limit(1);
      
      const tableExists = !error || !error.message.includes('does not exist');
      setHasUserPreferences(tableExists);
      return tableExists;
    } catch (e) {
      setHasUserPreferences(false);
      return false;
    }
  }, [hasUserPreferences]);

  // Get role-based default mode
  const getRoleBasedDefault = useCallback(async (): Promise<UIMode> => {
    if (!user) return "management";

    try {
      // Check if user has a role in employees table
      const { data: employee } = await supabase
        .from('employees')
        .select('role')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (employee?.role) {
        // Map employee roles to default UI mode
        switch (employee.role) {
          case 'SUPER_ADMIN':
          case 'ADMIN':
            return "management"; // Owner/Admin defaults to management
          case 'SUPPORT':
          case 'OPS':
          case 'VIEWER':
          default:
            return "management"; // Single mode enforced
        }
      }

      // Fallback: check profiles table for role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.role === 'owner') {
        return "management";
      }

      // Default for unknown roles
      return "management";
    } catch (error) {
      console.error("Error determining role-based default:", error);
      return "management";
    }
  }, [user]);

  // Load preference from server or localStorage
  const loadPreference = useCallback(async (): Promise<UIPreference | null> => {
    if (!user || !tenant) return null;

    const tableExists = await checkUserPreferencesTable();
    
    if (tableExists) {
      try {
        const { data, error } = await supabase
          .from('tenant_settings')
          .select('setting_key, setting_value')
          .eq('tenant_id', tenant.id)
          .eq('setting_key', `ui.mode.${user.id}`)
          .maybeSingle();

        if (!error && data?.setting_value) {
          const preference = data.setting_value as unknown as UIPreference;
          // Validate preference structure and version compatibility
          if (preference?.mode && 
              preference?.tenantId === tenant.id && 
              ['operations', 'management'].includes(preference.mode)) {
            return preference;
          }
        }
      } catch (error) {
        console.error("Error loading server preference:", error);
      }
    }

    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      try {
        const key = `bln.ui-mode.v1:${tenant.id}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          const preference = JSON.parse(stored) as UIPreference;
          // Validate localStorage data
          if (preference?.mode && 
              preference?.tenantId === tenant.id &&
              ['operations', 'management'].includes(preference.mode)) {
            return preference;
          }
        }
      } catch (error) {
        console.error("Error loading localStorage preference:", error);
      }
    }

    return null;
  }, [user, tenant, checkUserPreferencesTable]);

  // Save preference to server and localStorage with retry logic
  const savePreference = useCallback(async (preference: UIPreference) => {
    if (!user || !tenant) return;

    const tableExists = await checkUserPreferencesTable();
    
    if (tableExists) {
      try {
        await withRetry(async () => {
          await supabase
            .from('tenant_settings')
            .upsert({
              tenant_id: tenant.id,
              setting_key: `ui.mode.${user.id}`,
              setting_value: preference as unknown as Json
            }, {
              onConflict: 'tenant_id,setting_key'
            });
        });
      } catch (error) {
        console.error("Error saving server preference:", error);
      }
    }

    // Always save to localStorage as backup
    if (typeof window !== 'undefined') {
      try {
        const key = `bln.ui-mode.v1:${tenant.id}`;
        localStorage.setItem(key, JSON.stringify(preference));
      } catch (error) {
        console.error("Error saving localStorage preference:", error);
      }
    }
  }, [user, tenant, checkUserPreferencesTable]);

  // Initialize mode from preferences or role-based default
  useEffect(() => {
    const initializeMode = async () => {
      // For public routes without tenant, just mark as ready
      if (!tenant) {
        setReady(true);
        return;
      }
      
      if (!user) {
        setReady(true);
        return;
      }

      try {
        setError(undefined); // Clear any previous errors
        
        const savedPreference = await loadPreference();
        
        if (savedPreference && savedPreference.mode) {
          setModeState("management");
          setSeenTour(!!savedPreference.seenTourAt);
        } else {
          // First time - use role-based default
          const defaultMode = await getRoleBasedDefault();
          setModeState(defaultMode);
          setSeenTour(false);
          
          // Save the initial preference
          const newPreference: UIPreference = {
            mode: defaultMode,
            tenantId: tenant.id,
            version: '1.0'
          };
          await savePreference(newPreference);
        }
      } catch (error) {
        console.error("Error initializing UI mode:", error);
        setError("Failed to load UI preferences");
        setModeState("management"); // Safe default
      } finally {
        setReady(true);
      }
    };

    initializeMode();
  }, [user, tenant, loadPreference, savePreference, getRoleBasedDefault]);

  // Set mode and persist
  const setMode = useCallback(async (newMode: UIMode) => {
    if (!tenant) return;

    setModeState(newMode);
    
    const preference: UIPreference = {
      mode: newMode,
      tenantId: tenant.id,
      seenTourAt: seenTour ? new Date().toISOString() : undefined
    };
    
    await savePreference(preference);

    // Log mode change to activity feed for audit trail
    try {
      await supabase
        .from('activity_feed')
        .insert({
          activity_type: 'ui_mode_change',
          message: `UI mode changed from ${mode} to ${newMode}`,
          service_name: 'client-dashboard',
          status: 'success',
          user_id: user?.id,
          details: {
            from_mode: mode,
            to_mode: newMode,
            tenant_id: tenant.id
          }
        });
    } catch (error) {
      // Don't fail if logging fails
      console.debug("Activity logging failed:", error);
    }
  }, [mode, tenant, user, seenTour, savePreference]);

  // Mark tour as seen
  const markTourSeen = useCallback(async () => {
    if (!tenant) return;

    setSeenTour(true);
    
    const preference: UIPreference = {
      mode,
      tenantId: tenant.id,
      seenTourAt: new Date().toISOString()
    };
    
    await savePreference(preference);

    // Log tour completion to activity feed for audit trail
    try {
      await supabase
        .from('activity_feed')
        .insert({
          activity_type: 'tour_completion',
          message: 'User completed the UI tour',
          service_name: 'client-dashboard',
          status: 'success',
          user_id: user?.id,
          details: {
            tenant_id: tenant.id,
            mode: mode
          }
        });
    } catch (error) {
      console.debug("Activity logging failed:", error);
    }
  }, [mode, tenant, user, savePreference]);

  const value = {
    mode,
    setMode,
    ready,
    seenTour,
    markTourSeen,
    error
  };

  return (
    <ModeContext.Provider value={value}>
      {children}
    </ModeContext.Provider>
  );
};
