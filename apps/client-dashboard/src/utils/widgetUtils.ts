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

export interface AnalyticsData {
  totalViews: number;
  totalInteractions: number;
  totalConversions: number;
  conversionRate: number;
  avgSessionDuration: number;
  bounceRate: number;
  topSources: Array<{ source: string; views: number; conversions: number }>;
  deviceBreakdown: Array<{ device: string; percentage: number }>;
  hourlyData: Array<{ hour: string; views: number; conversions: number }>;
  weeklyData: Array<{ day: string; views: number; conversions: number }>;
}

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
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation');
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

// Safe analytics data generation with fallbacks
export const generateSafeAnalyticsData = (timeRange: string): AnalyticsData => {
  try {
    const seed = timeRange === '24h' ? 1 : timeRange === '7d' ? 2 : timeRange === '30d' ? 3 : 4;
    
    const safeRandom = (index: number): number => {
      try {
        const x = Math.sin(seed * 9999 + index) * 10000;
        const result = x - Math.floor(x);
        return isNaN(result) ? 0.5 : Math.max(0, Math.min(1, result));
      } catch {
        return 0.5; // Fallback value
      }
    };
    
    const safeFloor = (value: number): number => {
      try {
        return Math.floor(value);
      } catch {
        return 0;
      }
    };

    const safeToFixed = (value: number, digits: number): number => {
      try {
        return parseFloat(value.toFixed(digits));
      } catch {
        return 0;
      }
    };

    return {
      totalViews: safeFloor(safeRandom(1) * 10000) + 1000,
      totalInteractions: safeFloor(safeRandom(2) * 5000) + 500,
      totalConversions: safeFloor(safeRandom(3) * 500) + 50,
      conversionRate: safeToFixed(safeRandom(4) * 10 + 2, 1),
      avgSessionDuration: safeFloor(safeRandom(5) * 300) + 60,
      bounceRate: safeToFixed(safeRandom(6) * 40 + 20, 1),
      topSources: [
        { source: 'Direct', views: safeFloor(safeRandom(7) * 2000) + 1000, conversions: safeFloor(safeRandom(8) * 50) + 20 },
        { source: 'Google', views: safeFloor(safeRandom(9) * 1500) + 500, conversions: safeFloor(safeRandom(10) * 40) + 15 },
        { source: 'Social Media', views: safeFloor(safeRandom(11) * 1000) + 300, conversions: safeFloor(safeRandom(12) * 25) + 10 },
        { source: 'Email', views: safeFloor(safeRandom(13) * 800) + 200, conversions: safeFloor(safeRandom(14) * 20) + 5 }
      ],
      deviceBreakdown: [
        { device: 'Mobile', percentage: safeFloor(safeRandom(15) * 30) + 50 },
        { device: 'Desktop', percentage: safeFloor(safeRandom(16) * 20) + 20 },
        { device: 'Tablet', percentage: safeFloor(safeRandom(17) * 15) + 5 }
      ],
      hourlyData: Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}:00`,
        views: safeFloor(safeRandom(18 + i) * 100) + 10,
        conversions: safeFloor(safeRandom(42 + i) * 10) + 1
      })),
      weeklyData: Array.from({ length: 7 }, (_, i) => ({
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i] || 'Day',
        views: safeFloor(safeRandom(50 + i) * 500) + 100,
        conversions: safeFloor(safeRandom(57 + i) * 50) + 10
      }))
    };
  } catch (error) {
    console.error('Error generating analytics data:', error);
    
    // Return safe fallback data
    return {
      totalViews: 1000,
      totalInteractions: 500,
      totalConversions: 50,
      conversionRate: 5.0,
      avgSessionDuration: 120,
      bounceRate: 30.0,
      topSources: [
        { source: 'Direct', views: 500, conversions: 25 },
        { source: 'Google', views: 300, conversions: 15 },
        { source: 'Social Media', views: 150, conversions: 8 },
        { source: 'Email', views: 50, conversions: 2 }
      ],
      deviceBreakdown: [
        { device: 'Mobile', percentage: 60 },
        { device: 'Desktop', percentage: 30 },
        { device: 'Tablet', percentage: 10 }
      ],
      hourlyData: Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}:00`,
        views: 50,
        conversions: 5
      })),
      weeklyData: [
        { day: 'Mon', views: 200, conversions: 20 },
        { day: 'Tue', views: 180, conversions: 18 },
        { day: 'Wed', views: 220, conversions: 22 },
        { day: 'Thu', views: 240, conversions: 24 },
        { day: 'Fri', views: 280, conversions: 28 },
        { day: 'Sat', views: 300, conversions: 30 },
        { day: 'Sun', views: 260, conversions: 26 }
      ]
    };
  }
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

// Safe localStorage operations
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (!key || typeof key !== 'string') return null;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  
  setItem: (key: string, value: string): boolean => {
    try {
      if (!key || typeof key !== 'string' || typeof value !== 'string') return false;
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  
  removeItem: (key: string): boolean => {
    try {
      if (!key || typeof key !== 'string') return false;
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
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
