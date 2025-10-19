/**
 * Local Storage Auto-Save Utility for Catering Widget
 * 
 * Prevents data loss by automatically saving form progress to localStorage.
 * Includes draft recovery and expiration management.
 */

import { CateringOrderFormData } from './catering-validation';

const STORAGE_KEY_PREFIX = 'catering_draft_';
const EXPIRATION_DAYS = 7; // Drafts expire after 7 days

interface SavedDraft {
  data: Partial<CateringOrderFormData>;
  timestamp: number;
  packageId?: string;
  tenantSlug: string;
}

/**
 * Generates a unique storage key for a tenant
 */
const getStorageKey = (tenantSlug: string): string => {
  return `${STORAGE_KEY_PREFIX}${tenantSlug}`;
};

/**
 * Checks if a draft has expired
 */
const isDraftExpired = (timestamp: number): boolean => {
  const expirationTime = EXPIRATION_DAYS * 24 * 60 * 60 * 1000; // Convert to milliseconds
  return Date.now() - timestamp > expirationTime;
};

/**
 * Saves form data to localStorage
 */
export const saveDraft = (
  tenantSlug: string,
  formData: Partial<CateringOrderFormData>,
  packageId?: string
): void => {
  try {
    const draft: SavedDraft = {
      data: formData,
      timestamp: Date.now(),
      packageId,
      tenantSlug,
    };

    const storageKey = getStorageKey(tenantSlug);
    localStorage.setItem(storageKey, JSON.stringify(draft));
    
    console.log('[Auto-save] Draft saved successfully');
  } catch (error) {
    console.error('[Auto-save] Failed to save draft:', error);
    // Fail silently - don't disrupt user experience
  }
};

/**
 * Loads draft from localStorage
 */
export const loadDraft = (
  tenantSlug: string
): SavedDraft | null => {
  try {
    const storageKey = getStorageKey(tenantSlug);
    const savedData = localStorage.getItem(storageKey);

    if (!savedData) {
      return null;
    }

    const draft: SavedDraft = JSON.parse(savedData);

    // Check if draft has expired
    if (isDraftExpired(draft.timestamp)) {
      console.log('[Auto-save] Draft expired, removing...');
      clearDraft(tenantSlug);
      return null;
    }

    console.log('[Auto-save] Draft loaded successfully');
    return draft;
  } catch (error) {
    console.error('[Auto-save] Failed to load draft:', error);
    return null;
  }
};

/**
 * Clears saved draft from localStorage
 */
export const clearDraft = (tenantSlug: string): void => {
  try {
    const storageKey = getStorageKey(tenantSlug);
    localStorage.removeItem(storageKey);
    console.log('[Auto-save] Draft cleared');
  } catch (error) {
    console.error('[Auto-save] Failed to clear draft:', error);
  }
};

/**
 * Checks if a draft exists for the tenant
 */
export const hasDraft = (tenantSlug: string): boolean => {
  const draft = loadDraft(tenantSlug);
  return draft !== null;
};

/**
 * Gets human-readable time since draft was saved
 */
export const getDraftAge = (tenantSlug: string): string | null => {
  const draft = loadDraft(tenantSlug);
  
  if (!draft) {
    return null;
  }

  const ageMs = Date.now() - draft.timestamp;
  const ageMinutes = Math.floor(ageMs / (1000 * 60));
  const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

  if (ageDays > 0) {
    return `${ageDays} day${ageDays > 1 ? 's' : ''} ago`;
  } else if (ageHours > 0) {
    return `${ageHours} hour${ageHours > 1 ? 's' : ''} ago`;
  } else if (ageMinutes > 0) {
    return `${ageMinutes} minute${ageMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'just now';
  }
};

/**
 * Creates a debounced auto-save function
 */
export const createAutoSave = (
  tenantSlug: string,
  delay = 2000 // 2 seconds default delay
): ((formData: Partial<CateringOrderFormData>, packageId?: string) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (formData: Partial<CateringOrderFormData>, packageId?: string) => {
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      saveDraft(tenantSlug, formData, packageId);
    }, delay);
  };
};

/**
 * Cleans up expired drafts for all tenants
 * Call this on app initialization
 */
export const cleanupExpiredDrafts = (): void => {
  try {
    const keysToRemove: string[] = [];

    // Iterate through localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const data = localStorage.getItem(key);
        
        if (data) {
          try {
            const draft: SavedDraft = JSON.parse(data);
            
            if (isDraftExpired(draft.timestamp)) {
              keysToRemove.push(key);
            }
          } catch {
            // Invalid data, mark for removal
            keysToRemove.push(key);
          }
        }
      }
    }

    // Remove expired drafts
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    if (keysToRemove.length > 0) {
      console.log(`[Auto-save] Cleaned up ${keysToRemove.length} expired draft(s)`);
    }
  } catch (error) {
    console.error('[Auto-save] Failed to cleanup expired drafts:', error);
  }
};
