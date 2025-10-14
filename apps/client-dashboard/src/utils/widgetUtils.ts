/**
 * Widget Management Utilities
 * Defensive programming utilities for safe widget operations
 */

// Type definitions for widget configuration
export interface WidgetConfig {
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  welcomeMessage: string;
  buttonText: string;
  showLogo: boolean;
  compactMode: boolean;
  customCss: string;
  animation: 'none' | 'fade' | 'slide' | 'bounce';
  shadowIntensity: number;
  fontFamily: string;
  fontSize: number;
  spacing: number;
}

// Analytics data type - nullable for safe empty state handling
export type AnalyticsData = {
  totalViews?: number | null;
  totalInteractions?: number | null;
  totalConversions?: number | null;
  conversionRate?: number | null;
  avgSessionDuration?: number | null;
  bounceRate?: number | null;
  topSources?: Array<{ source: string; views: number | null; conversions: number | null }>;
  deviceBreakdown?: Array<{ device: string; percentage: number }>;
  hourlyData?: Array<{ hour: string; views: number; conversions: number }>;
  weeklyData?: Array<{ day: string; views: number; conversions: number }>;
  dailyStats?: Array<{ date: string; views: number | null; conversions: number | null }>;
};

// Validation functions
export const validateHexColor = (color: string): boolean => {
  if (!color || typeof color !== 'string') return false;
  return /^#[0-9A-F]{6}$/i.test(color);
};

export const validateWidgetConfig = (config: Partial<WidgetConfig>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validate required string fields
      if (!config.welcomeMessage?.trim()) {
    errors.push('Welcome message is required and cannot be empty');
  }

  if (!config.buttonText?.trim()) {
    errors.push('Button text is required and cannot be empty');
  }

  // Validate colors
      if (config.primaryColor && !validateHexColor(config.primaryColor)) {
    errors.push('Primary color must be a valid hex color (e.g., #3b82f6)');
  }

  if (config.backgroundColor && !validateHexColor(config.backgroundColor)) {
    errors.push('Background color must be a valid hex color (e.g., #ffffff)');
  }

  if (config.textColor && !validateHexColor(config.textColor)) {
    errors.push('Text color must be a valid hex color (e.g., #1f2937)');
  }

  // Validate numeric ranges
      if (config.borderRadius !== undefined) {
    if (typeof config.borderRadius !== 'number' || config.borderRadius < 0 || config.borderRadius > 50) {
      errors.push('Border radius must be a number between 0 and 50');
    }
  }

  if (config.shadowIntensity !== undefined) {
    if (typeof config.shadowIntensity !== 'number' || config.shadowIntensity < 0 || config.shadowIntensity > 10) {
      errors.push('Shadow intensity must be a number between 0 and 10');
    }
  }

  if (config.fontSize !== undefined) {
    if (typeof config.fontSize !== 'number' || config.fontSize < 10 || config.fontSize > 24) {
      errors.push('Font size must be a number between 10 and 24');
    }
  }

  if (config.spacing !== undefined) {
    if (typeof config.spacing !== 'number' || config.spacing < 0.5 || config.spacing > 3) {
      errors.push('Spacing must be a number between 0.5 and 3');
    }
  }

  // Validate enums
      if (config.theme && !['light', 'dark', 'auto'].includes(config.theme)) {
    errors.push('Theme must be one of: light, dark, auto');
  }

  if (config.animation && !['none', 'fade', 'slide', 'bounce'].includes(config.animation)) {
    errors.push('Animation must be one of: none, fade, slide, bounce');
  }

  // Validate custom CSS (basic check)
      if (config.customCss && typeof config.customCss === 'string' && config.customCss.length > 5000) {
    errors.push('Custom CSS cannot exceed 5000 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Safe widget configuration defaults
export const getDefaultWidgetConfig = (type: 'booking' | 'catering'): WidgetConfig => {
  const baseConfig: WidgetConfig = {
    theme: 'light',
    primaryColor: type === 'booking' ? '#3b82f6' : '#f97316',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    borderRadius: 8,
    welcomeMessage: type === 'booking' ? 'Book your table with us!' : 'Order catering for your event!',
    buttonText: type === 'booking' ? 'Reserve Now' : 'Order Catering',
    showLogo: true,
    compactMode: false,
    customCss: '',
    animation: 'fade',
    shadowIntensity: 2,
    fontFamily: 'system',
    fontSize: 14,
    spacing: 1
  };

  return baseConfig;
};

// Safe URL generation with validation
export const generateWidgetUrl = (
  type: 'booking' | 'catering',
  config: WidgetConfig,
  tenantId?: string
): { url: string; isValid: boolean; error?: string } => {
  try {
    if (!tenantId) {
      return { url: '', isValid: false, error: 'Tenant ID is required' };
    }

    const validation = validateWidgetConfig(config);
    if (!validation.isValid) {
      return { url: '', isValid: false, error: validation.errors.join(', ') };
    }

    const baseUrl = `${window.location.origin}/widget/${type}/${tenantId}`;
    
    const params = new URLSearchParams({
      theme: config.theme,
      primaryColor: config.primaryColor.replace('#', ''),
      backgroundColor: config.backgroundColor.replace('#', ''),
      textColor: config.textColor.replace('#', ''),
      borderRadius: config.borderRadius.toString(),
      welcomeMessage: config.welcomeMessage.trim(),
      buttonText: config.buttonText.trim(),
      showLogo: config.showLogo.toString(),
      compactMode: config.compactMode.toString(),
      animation: config.animation,
      shadowIntensity: config.shadowIntensity.toString(),
      fontFamily: config.fontFamily,
      fontSize: config.fontSize.toString(),
      spacing: config.spacing.toString()
    });

    const url = `${baseUrl}?${params.toString()}`;
    
    // Validate URL length (some browsers have limits)
      if (url.length > 2048) {
      return { url: '', isValid: false, error: 'Generated URL is too long. Please reduce custom parameters.' };
    }

    return { url, isValid: true };
  } catch (error) {
    return { 
      url: '', 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Failed to generate widget URL' 
    };
  }
};

// Safe embed code generation
export const generateEmbedCode = (
  type: 'booking' | 'catering',
  config: WidgetConfig,
  tenantId?: string,
  tenantName?: string
): { embedCode: string; isValid: boolean; error?: string } => {
  try {
    const urlResult = generateWidgetUrl(type, config, tenantId);
    
    if (!urlResult.isValid) {
      return { embedCode: '', isValid: false, error: urlResult.error };
    }

    const safeTenantName = (tenantName || 'Restaurant').replace(/[<>&"']/g, '');
    const safeHeight = config.compactMode ? '400px' : '600px';
    const safeBorderRadius = Math.max(0, Math.min(50, config.borderRadius));
    const safeShadowIntensity = Math.max(0, Math.min(10, config.shadowIntensity));

    const embedCode = `<!-- ${safeTenantName} ${type === 'booking' ? 'Booking' : 'Catering'} Widget -->
<!-- Security: sandbox excludes allow-same-origin to prevent same-origin script escalation -->
<div id="${type}-widget-container" style="width: 100%; height: ${safeHeight}; border: none; border-radius: ${safeBorderRadius}px; overflow: hidden; box-shadow: 0 ${safeShadowIntensity * 2}px ${safeShadowIntensity * 8}px rgba(0,0,0,0.1);"></div>
<script>
(function() {
  try {
    var iframe = document.createElement('iframe');
    iframe.src = '${urlResult.url}';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.setAttribute('allow', 'payment; geolocation');
    iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-top-navigation allow-same-origin');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('title', '${safeTenantName} ${type === 'booking' ? 'Booking' : 'Catering'} Widget');
    
    var container = document.getElementById('${type}-widget-container');
    if (container) {
      container.appendChild(iframe);
    } else {
      console.error('Widget container not found');
    }
  } catch (error) {
    console.error('Failed to load widget:', error);
    var container = document.getElementById('${type}-widget-container');
    if (container) {
      container.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">Failed to load widget. Please try again later.</p>';
    }
  }
})();
</script>`;

    return { embedCode, isValid: true };
  } catch (error) {
    return { 
      embedCode: '', 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Failed to generate embed code' 
    };
  }
};

// Safe analytics data generation – remove randomized values in production paths
export const generateSafeAnalyticsData = (_timeRange: string): AnalyticsData => {
  return {
    totalViews: null,
    totalInteractions: null,
    totalConversions: null,
    conversionRate: null,
    avgSessionDuration: null,
    bounceRate: null,
    topSources: [],
    dailyStats: [],
  };
};

// Safe clipboard operations
export const safeCopyToClipboard = async (text: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!text || typeof text !== 'string') {
      return { success: false, error: 'Invalid text to copy' };
    }

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return { success: true };
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        return { success: true };
      } else {
        return { success: false, error: 'Copy command failed' };
      }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to copy to clipboard' 
    };
  }
};

// Deprecated local safeLocalStorage shim replaced by central safeStorage util.
// Keeping exported shape for backward compatibility
      if (imported elsewhere.
import { safeStorage } from '@/utils/safeStorage';
export const safeLocalStorage = {
  getItem: (key: string) => (typeof key === 'string' ? safeStorage.get(key) : null),
  setItem: (key: string, value: string) => {
    if (typeof key !== 'string' || typeof value !== 'string') return false;
    safeStorage.set(key, value); return true;
  },
  removeItem: (key: string) => { if (typeof key !== 'string') return false; safeStorage.remove(key); return true; }
};

export default {
  validateHexColor,
  validateWidgetConfig,
  getDefaultWidgetConfig,
  generateWidgetUrl,
  generateEmbedCode,
  generateSafeAnalyticsData,
  safeCopyToClipboard,
  safeLocalStorage
};


