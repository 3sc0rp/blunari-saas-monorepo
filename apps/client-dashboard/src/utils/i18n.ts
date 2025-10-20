/**
 * i18n Configuration
 * 
 * Configures react-i18next for internationalization support
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getBrowserLocale } from './locale';

// Import translations
import enUS from '../locales/en-US.json';
import esES from '../locales/es-ES.json';
import frFR from '../locales/fr-FR.json';
import deDE from '../locales/de-DE.json';
import arSA from '../locales/ar-SA.json';

// Translation resources
const resources = {
  'en-US': { translation: enUS },
  'es-ES': { translation: esES },
  'fr-FR': { translation: frFR },
  'de-DE': { translation: deDE },
  'ar-SA': { translation: arSA },
};

// Get stored locale or use browser default
const getInitialLocale = (): string => {
  const stored = localStorage.getItem('preferred-locale');
  if (stored && stored in resources) {
    return stored;
  }
  const browser = getBrowserLocale();
  return browser in resources ? browser : 'en-US';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLocale(),
    fallbackLng: 'en-US',
    
    interpolation: {
      escapeValue: false, // React already escapes
    },
    
    react: {
      useSuspense: false,
    },
    
    // Namespaces
    defaultNS: 'translation',
    
    // Debug in development
    debug: process.env.NODE_ENV === 'development',
  });

export default i18n;
