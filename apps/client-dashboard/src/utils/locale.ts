/**
 * Locale Utilities
 * 
 * Provides locale management, formatting, and RTL support
 */

// Supported locales with metadata
export interface Locale {
  code: string;
  name: string;
  language: string;
  country: string;
  direction: 'ltr' | 'rtl';
}

export const LOCALES: Record<string, Locale> = {
  'en-US': { code: 'en-US', name: 'English (US)', language: 'English', country: 'United States', direction: 'ltr' },
  'en-GB': { code: 'en-GB', name: 'English (UK)', language: 'English', country: 'United Kingdom', direction: 'ltr' },
  'es-ES': { code: 'es-ES', name: 'Spanish (Spain)', language: 'Spanish', country: 'Spain', direction: 'ltr' },
  'es-MX': { code: 'es-MX', name: 'Spanish (Mexico)', language: 'Spanish', country: 'Mexico', direction: 'ltr' },
  'fr-FR': { code: 'fr-FR', name: 'French (France)', language: 'French', country: 'France', direction: 'ltr' },
  'de-DE': { code: 'de-DE', name: 'German (Germany)', language: 'German', country: 'Germany', direction: 'ltr' },
  'it-IT': { code: 'it-IT', name: 'Italian (Italy)', language: 'Italian', country: 'Italy', direction: 'ltr' },
  'pt-BR': { code: 'pt-BR', name: 'Portuguese (Brazil)', language: 'Portuguese', country: 'Brazil', direction: 'ltr' },
  'ja-JP': { code: 'ja-JP', name: 'Japanese (Japan)', language: 'Japanese', country: 'Japan', direction: 'ltr' },
  'zh-CN': { code: 'zh-CN', name: 'Chinese (Simplified)', language: 'Chinese', country: 'China', direction: 'ltr' },
  'ar-SA': { code: 'ar-SA', name: 'Arabic (Saudi Arabia)', language: 'Arabic', country: 'Saudi Arabia', direction: 'rtl' },
  'he-IL': { code: 'he-IL', name: 'Hebrew (Israel)', language: 'Hebrew', country: 'Israel', direction: 'rtl' },
};

export const LOCALE_LIST = Object.values(LOCALES);

/**
 * Get locale from code
 */
export function getLocale(code: string): Locale | undefined {
  return LOCALES[code];
}

/**
 * Check if locale is RTL
 */
export function isRTL(localeCode: string): boolean {
  return LOCALES[localeCode]?.direction === 'rtl';
}

/**
 * Get locale direction
 */
export function getDirection(localeCode: string): 'ltr' | 'rtl' {
  return LOCALES[localeCode]?.direction || 'ltr';
}

/**
 * Format date with locale
 */
export function formatDate(
  date: Date | string,
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  } catch (error) {
    return dateObj.toLocaleDateString();
  }
}

/**
 * Format date with relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(
  date: Date | string,
  locale: string = 'en-US'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    
    if (diffYear > 0) return rtf.format(-diffYear, 'year');
    if (diffMonth > 0) return rtf.format(-diffMonth, 'month');
    if (diffDay > 0) return rtf.format(-diffDay, 'day');
    if (diffHour > 0) return rtf.format(-diffHour, 'hour');
    if (diffMin > 0) return rtf.format(-diffMin, 'minute');
    return rtf.format(-diffSec, 'second');
  } catch (error) {
    // Fallback
    if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    return 'Just now';
  }
}

/**
 * Format time with locale
 */
export function formatTime(
  date: Date | string,
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };
  
  try {
    return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
  } catch (error) {
    return dateObj.toLocaleTimeString();
  }
}

/**
 * Format date and time together
 */
export function formatDateTime(
  date: Date | string,
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };
  
  try {
    return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
  } catch (error) {
    return dateObj.toLocaleString();
  }
}

/**
 * Format number with locale
 */
export function formatNumber(
  value: number,
  locale: string = 'en-US',
  options?: Intl.NumberFormatOptions
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch (error) {
    return value.toString();
  }
}

/**
 * Format percentage with locale
 */
export function formatPercentage(
  value: number,
  locale: string = 'en-US',
  decimals: number = 1
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value / 100);
  } catch (error) {
    return `${value.toFixed(decimals)}%`;
  }
}

/**
 * Get browser locale
 */
export function getBrowserLocale(): string {
  const browserLang = navigator.language || 'en-US';
  
  // Try exact match first
  if (browserLang in LOCALES) {
    return browserLang;
  }
  
  // Try language code only (e.g., 'en' from 'en-US')
  const langCode = browserLang.split('-')[0];
  const matchingLocale = Object.keys(LOCALES).find(key => 
    key.startsWith(langCode)
  );
  
  return matchingLocale || 'en-US';
}

/**
 * Validate locale code
 */
export function isValidLocale(code: string): boolean {
  return code in LOCALES;
}

/**
 * Get locale display name
 */
export function getLocaleName(localeCode: string): string {
  return LOCALES[localeCode]?.name || localeCode;
}

/**
 * Get locale language
 */
export function getLanguage(localeCode: string): string {
  return LOCALES[localeCode]?.language || localeCode.split('-')[0];
}

/**
 * Get locale country
 */
export function getCountry(localeCode: string): string {
  return LOCALES[localeCode]?.country || localeCode.split('-')[1] || '';
}

/**
 * Get list of RTL locales
 */
export function getRTLLocales(): string[] {
  return Object.values(LOCALES)
    .filter(locale => locale.direction === 'rtl')
    .map(locale => locale.code);
}

/**
 * Get list of LTR locales
 */
export function getLTRLocales(): string[] {
  return Object.values(LOCALES)
    .filter(locale => locale.direction === 'ltr')
    .map(locale => locale.code);
}

/**
 * Apply RTL class to document
 */
export function applyDirection(localeCode: string): void {
  const direction = getDirection(localeCode);
  document.documentElement.dir = direction;
  document.documentElement.lang = localeCode.split('-')[0];
}
