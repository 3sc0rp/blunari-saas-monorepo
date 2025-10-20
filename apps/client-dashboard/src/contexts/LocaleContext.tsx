/**
 * Locale Context
 * 
 * Provides locale state management and internationalization
 * functionality across the application.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LOCALES, applyDirection, type Locale } from '@/utils/locale';
import { toast } from 'sonner';

interface LocaleContextType {
  // Current locale
  locale: string;
  setLocale: (code: string) => void;
  
  // Available locales
  availableLocales: Locale[];
  
  // Direction
  direction: 'ltr' | 'rtl';
  isRTL: boolean;
  
  // Translation function (from i18next)
  t: (key: string, options?: any) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

interface LocaleProviderProps {
  children: ReactNode;
  defaultLocale?: string;
}

export function LocaleProvider({ 
  children, 
  defaultLocale = 'en-US' 
}: LocaleProviderProps) {
  const { t, i18n } = useTranslation();
  
  const [locale, setLocaleState] = useState<string>(() => {
    // Try to get from localStorage first
    const stored = localStorage.getItem('preferred-locale');
    return stored || i18n.language || defaultLocale;
  });

  // Get current locale metadata
  const currentLocale = LOCALES[locale] || LOCALES['en-US'];
  const direction = currentLocale.direction;
  const isRTL = direction === 'rtl';

  // Update when locale changes
  useEffect(() => {
    // Update localStorage
    localStorage.setItem('preferred-locale', locale);
    
    // Update i18next language
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
    
    // Apply direction to document
    applyDirection(locale);
    
    console.log(`Locale changed to: ${locale} (${direction})`);
  }, [locale, i18n, direction]);

  // Set locale with validation
  const setLocale = (code: string) => {
    if (code in LOCALES) {
      setLocaleState(code);
      toast.success(`Language changed to ${LOCALES[code].name}`);
    } else {
      console.warn(`Invalid locale code: ${code}`);
      toast.error('Invalid language selected');
    }
  };

  const value: LocaleContextType = {
    locale,
    setLocale,
    availableLocales: Object.values(LOCALES),
    direction,
    isRTL,
    t,
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
