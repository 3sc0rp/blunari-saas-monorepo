/**
 * Currency Utilities
 * 
 * Provides currency conversion, formatting, and management utilities
 */

// Supported currencies with metadata
export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  typicalLocale: string;
}

export const CURRENCIES: Record<string, Currency> = {
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, typicalLocale: 'en-US' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2, typicalLocale: 'en-GB' },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2, typicalLocale: 'en-GB' },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0, typicalLocale: 'ja-JP' },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', decimalPlaces: 2, typicalLocale: 'en-CA' },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2, typicalLocale: 'en-AU' },
  CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimalPlaces: 2, typicalLocale: 'de-CH' },
  CNY: { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimalPlaces: 2, typicalLocale: 'zh-CN' },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimalPlaces: 2, typicalLocale: 'en-IN' },
  MXN: { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', decimalPlaces: 2, typicalLocale: 'es-MX' },
  BRL: { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimalPlaces: 2, typicalLocale: 'pt-BR' },
};

export const CURRENCY_LIST = Object.values(CURRENCIES);

/**
 * Format currency amount with proper locale and symbol
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  locale?: string
): string {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const effectiveLocale = locale || currency.typicalLocale;

  try {
    return new Intl.NumberFormat(effectiveLocale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currency.decimalPlaces,
      maximumFractionDigits: currency.decimalPlaces,
    }).format(amount);
  } catch (error) {
    // Fallback if locale/currency not supported
    const symbol = currency.symbol;
    const formatted = amount.toFixed(currency.decimalPlaces);
    return `${symbol}${formatted}`;
  }
}

/**
 * Format currency amount with compact notation for large numbers
 * Example: $1,234 -> $1.2K, $1,234,567 -> $1.2M
 */
export function formatCurrencyCompact(
  amount: number,
  currencyCode: string = 'USD',
  locale?: string
): string {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const effectiveLocale = locale || currency.typicalLocale;

  try {
    return new Intl.NumberFormat(effectiveLocale, {
      style: 'currency',
      currency: currencyCode,
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(amount);
  } catch (error) {
    // Fallback
    return formatCurrency(amount, currencyCode, locale);
  }
}

/**
 * Parse currency string to number (removes symbols and formatting)
 */
export function parseCurrency(value: string): number | null {
  if (!value) return null;
  
  // Remove currency symbols, spaces, and commas
  const cleaned = value.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}

/**
 * Convert amount between currencies using exchange rate
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRate: number
): number {
  if (fromCurrency === toCurrency) return amount;
  return amount * exchangeRate;
}

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCIES[currencyCode]?.symbol || currencyCode;
}

/**
 * Get currency decimal places
 */
export function getCurrencyDecimalPlaces(currencyCode: string): number {
  return CURRENCIES[currencyCode]?.decimalPlaces ?? 2;
}

/**
 * Validate currency code
 */
export function isValidCurrency(code: string): boolean {
  return code in CURRENCIES;
}

/**
 * Get currency display name
 */
export function getCurrencyName(currencyCode: string): string {
  return CURRENCIES[currencyCode]?.name || currencyCode;
}

/**
 * Format number without currency symbol
 */
export function formatNumber(
  value: number,
  locale: string = 'en-US',
  options?: Intl.NumberFormatOptions
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch (error) {
    return value.toFixed(2);
  }
}

/**
 * Get exchange rate display
 * Example: 1 USD = 0.92 EUR
 */
export function formatExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  rate: number
): string {
  const fromSymbol = getCurrencySymbol(fromCurrency);
  const toSymbol = getCurrencySymbol(toCurrency);
  return `1 ${fromSymbol} = ${rate.toFixed(4)} ${toSymbol}`;
}
