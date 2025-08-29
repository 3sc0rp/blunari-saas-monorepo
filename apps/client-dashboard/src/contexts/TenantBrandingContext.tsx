import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTenant } from '@/hooks/useTenant';

interface TenantBrandingContextType {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  restaurantName: string;
  updateBranding: (branding: Partial<TenantBrandingContextType>) => void;
}

const TenantBrandingContext = createContext<TenantBrandingContextType | undefined>(undefined);

export const TenantBrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenant } = useTenant();
  const [primaryColor, setPrimaryColor] = useState('#1e3a8a'); // Default primary
  const [secondaryColor, setSecondaryColor] = useState('#f59e0b'); // Default secondary
  const [logoUrl, setLogoUrl] = useState('https://raw.githubusercontent.com/3sc0rp/Blunari/refs/heads/main/logo-bg.png');
  const [restaurantName, setRestaurantName] = useState('Restaurant Dashboard');

  // Update branding when tenant changes
  useEffect(() => {
    if (tenant) {
      if (tenant.primary_color) {
        setPrimaryColor(tenant.primary_color);
        updateCSSVariable('--primary', tenant.primary_color);
      }
      
      if (tenant.secondary_color) {
        setSecondaryColor(tenant.secondary_color);
        updateCSSVariable('--secondary', tenant.secondary_color);
      }
      
      if (tenant.logo_url) {
        setLogoUrl(tenant.logo_url);
      }
      
      setRestaurantName(tenant.name);
      
      // Update page title
      document.title = `${tenant.name} - Dashboard`;
    }
  }, [tenant]);

  const updateCSSVariable = (variable: string, value: string) => {
    // Convert hex to HSL if needed
    const hslValue = hexToHsl(value);
    document.documentElement.style.setProperty(variable, hslValue);
  };

  const hexToHsl = (hex: string): string => {
    // Remove the hash if present
    hex = hex.replace('#', '');
    
    // Parse RGB values
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const updateBranding = (branding: Partial<TenantBrandingContextType>) => {
    if (branding.primaryColor) {
      setPrimaryColor(branding.primaryColor);
      updateCSSVariable('--primary', branding.primaryColor);
    }
    if (branding.secondaryColor) {
      setSecondaryColor(branding.secondaryColor);
      updateCSSVariable('--secondary', branding.secondaryColor);
    }
    if (branding.logoUrl) {
      setLogoUrl(branding.logoUrl);
    }
    if (branding.restaurantName) {
      setRestaurantName(branding.restaurantName);
      document.title = `${branding.restaurantName} - Dashboard`;
    }
  };

  const value = {
    primaryColor,
    secondaryColor,
    logoUrl,
    restaurantName,
    updateBranding,
  };

  return (
    <TenantBrandingContext.Provider value={value}>
      {children}
    </TenantBrandingContext.Provider>
  );
};

export const useTenantBranding = () => {
  const context = useContext(TenantBrandingContext);
  if (context === undefined) {
    throw new Error('useTenantBranding must be used within a TenantBrandingProvider');
  }
  return context;
};