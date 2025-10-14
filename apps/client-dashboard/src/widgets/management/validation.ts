import { WidgetConfig, ValidationError } from './types';

const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;

/**
 * Sanitization utilities for input validation
 */
export class InputSanitizer {
  /**
   * Sanitize string input - remove dangerous characters and trim
   */
  static sanitizeString(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') return '';

    return input
      .trim()
      .replace(/[<>"'&]/g, '') // Remove HTML characters
      .split('')
      .filter(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127)
      .join('')
      .substring(0, maxLength);
  }

  /**
   * Sanitize HTML content - allow only safe tags
   */
  static sanitizeHTML(input: string, maxLength: number = 2000): string {
    if (typeof input !== 'string') return '';

    // Allow only basic formatting tags
      const allowedTags = ['b', 'i', 'u', 'strong', 'em', 'br', 'p'];
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;

    return input
      .replace(tagRegex, (match, tagName) => {
        return allowedTags.includes(tagName.toLowerCase()) ? match : '';
      })
      .substring(0, maxLength);
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(input: any, min: number = -Infinity, max: number = Infinity): number {
    const num = Number(input);
    if (isNaN(num)) return min;

    return Math.max(min, Math.min(max, num));
  }

  /**
   * Sanitize color input - ensure valid hex format
   */
  static sanitizeColor(input: string): string {
    if (typeof input !== 'string') return '#000000';

    const clean = input.trim().toLowerCase();

    // If it's already a valid hex color,
      return it
      if (colorRegex.test(clean)) {
      return clean;
    }

    // Try to convert named colors to hex (basic mapping)
      const namedColors: Record<string, string> = {
      'red': '#FF0000',
      'blue': '#0000FF',
      'green': '#00FF00',
      'black': '#000000',
      'white': '#FFFFFF',
      'gray': '#808080',
      'grey': '#808080'
    };

    if (namedColors[clean]) {
      return namedColors[clean];
    }

    // Default fallback
      return '#000000';
  }

  /**
   * Sanitize URL input
   */
  static sanitizeURL(input: string): string {
    if (typeof input !== 'string') return '';

    const clean = input.trim();

    // Basic URL validation and sanitization
      if (urlRegex.test(clean)) {
      return clean;
    }

    // If it doesn't start with http, try to make it a valid URL
      if (clean && !clean.startsWith('http')) {
      const testUrl = `https://${clean}`;
      if (urlRegex.test(testUrl)) {
        return testUrl;
      }
    }

    return '';
  }

  /**
   * Sanitize email input
   */
  static sanitizeEmail(input: string): string {
    if (typeof input !== 'string') return '';

    const clean = input.trim().toLowerCase();

    if (emailRegex.test(clean)) {
      return clean;
    }

    return '';
  }

  /**
   * Sanitize phone number input
   */
  static sanitizePhone(input: string): string {
    if (typeof input !== 'string') return '';

    const clean = input.replace(/[^\d+\-()\s]/g, '').trim();

    if (phoneRegex.test(clean.replace(/[\s\-()]/g, ''))) {
      return clean;
    }

    return '';
  }

  /**
   * Sanitize font family name
   */
  static sanitizeFontFamily(input: string): string {
    if (typeof input !== 'string') return 'system-ui';

    const clean = input.trim();

    // Allow only alphanumeric, spaces, hyphens, and quotes
      const sanitized = clean.replace(/[^a-zA-Z0-9\s\-'"]/g, '');

    // Common safe font families
      const safeFonts = [
      'system-ui', 'Arial', 'Helvetica', 'sans-serif',
      'Times New Roman', 'serif', 'Courier New', 'monospace',
      'Georgia', 'Verdana', 'Tahoma', 'Trebuchet MS'
    ];

    if (safeFonts.includes(sanitized)) {
      return sanitized;
    }

    // If custom font, ensure it's safe
      if (sanitized.length > 0 && sanitized.length <= 50) {
      return sanitized;
    }

    return 'system-ui';
  }
}

/**
 * Sanitize entire widget configuration
 */
export function sanitizeConfig(config: Partial<WidgetConfig>): WidgetConfig {
  return {
    // Appearance
    theme: config.theme || 'light',
    primaryColor: InputSanitizer.sanitizeColor(config.primaryColor || '#007bff'),
    secondaryColor: InputSanitizer.sanitizeColor(config.secondaryColor || '#6c757d'),
    backgroundColor: InputSanitizer.sanitizeColor(config.backgroundColor || '#ffffff'),
    textColor: InputSanitizer.sanitizeColor(config.textColor || '#000000'),
    borderRadius: InputSanitizer.sanitizeNumber(config.borderRadius, 0, 50),
    borderWidth: InputSanitizer.sanitizeNumber(config.borderWidth, 0, 10),
    borderColor: InputSanitizer.sanitizeColor(config.borderColor || '#dee2e6'),
    shadowIntensity: InputSanitizer.sanitizeNumber(config.shadowIntensity, 0, 20),

    // Typography
    fontFamily: config.fontFamily || 'system',
    fontSize: InputSanitizer.sanitizeNumber(config.fontSize, 10, 24),
    fontWeight: config.fontWeight || 'normal',
    lineHeight: InputSanitizer.sanitizeNumber(config.lineHeight, 1, 2),

    // Content
    welcomeMessage: InputSanitizer.sanitizeString(config.welcomeMessage || '', 500),
    description: InputSanitizer.sanitizeString(config.description || '', 1000),
    buttonText: InputSanitizer.sanitizeString(config.buttonText || '', 100),
    footerText: InputSanitizer.sanitizeString(config.footerText || '', 500),

    // Layout
    width: InputSanitizer.sanitizeNumber(config.width, 300, 800),
    height: InputSanitizer.sanitizeNumber(config.height, 400, 1000),
    padding: InputSanitizer.sanitizeNumber(config.padding, 0, 50),
    spacing: InputSanitizer.sanitizeNumber(config.spacing, 0, 50),
    alignment: config.alignment || 'center',
    size: config.size || 'medium',

    // Features
    showLogo: Boolean(config.showLogo),
    showDescription: Boolean(config.showDescription),
    showFooter: Boolean(config.showFooter),
    compactMode: Boolean(config.compactMode),
    enableAnimations: Boolean(config.enableAnimations),
    animationType: config.animationType || 'none',

    // Booking-specific features
    enableTableOptimization: Boolean(config.enableTableOptimization),
    showAvailabilityIndicator: Boolean(config.showAvailabilityIndicator),
    requireDeposit: Boolean(config.requireDeposit),
    enableSpecialRequests: Boolean(config.enableSpecialRequests),
    showDurationSelector: Boolean(config.showDurationSelector),
    enablePhoneBooking: Boolean(config.enablePhoneBooking),
    maxPartySize: InputSanitizer.sanitizeNumber(config.maxPartySize, 1, 100),
    minAdvanceBooking: InputSanitizer.sanitizeNumber(config.minAdvanceBooking, 0, 48),
    maxAdvanceBooking: InputSanitizer.sanitizeNumber(config.maxAdvanceBooking, 1, 365),

    // Advanced
    customCss: InputSanitizer.sanitizeString(config.customCss || '', 5000),
    customJs: InputSanitizer.sanitizeString(config.customJs || '', 5000),
    isEnabled: Boolean(config.isEnabled),
    bookingSource: config.bookingSource || 'widget',

    // Behavior
    autoFocus: Boolean(config.autoFocus),
    closeOnOutsideClick: Boolean(config.closeOnOutsideClick),
    showCloseButton: Boolean(config.showCloseButton),

    // Embedding
    safeArea: Boolean(config.safeArea ?? true) // Default to true
      if (not specified
  };
}

export function validateConfig(config: WidgetConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required text fields
      if (!config.welcomeMessage?.trim()) {
    errors.push({ field: 'welcomeMessage', message: 'Welcome message is required' });
  }
  if (!config.buttonText?.trim()) {
    errors.push({ field: 'buttonText', message: 'Button text is required' });
  }

  // Length validations
      if (config.welcomeMessage && config.welcomeMessage.length > 500) {
    errors.push({ field: 'welcomeMessage', message: 'Welcome message must be less than 500 characters' });
  }
  if (config.buttonText && config.buttonText.length > 100) {
    errors.push({ field: 'buttonText', message: 'Button text must be less than 100 characters' });
  }

  // Numeric validations
      if (!config.width || config.width < 300 || config.width > 800) {
    errors.push({ field: 'width', message: 'Width must be between 300 and 800 pixels' });
  }
  if (!config.height || config.height < 400 || config.height > 1000) {
    errors.push({ field: 'height', message: 'Height must be between 400 and 1000 pixels' });
  }
  if (!config.fontSize || config.fontSize < 10 || config.fontSize > 24) {
    errors.push({ field: 'fontSize', message: 'Font size must be between 10 and 24 pixels' });
  }

  // Color validations
      if (!colorRegex.test(config.primaryColor)) {
    errors.push({ field: 'primaryColor', message: 'Primary color must be a valid hex color' });
  }
  if (!colorRegex.test(config.secondaryColor)) {
    errors.push({ field: 'secondaryColor', message: 'Secondary color must be a valid hex color' });
  }
  if (!colorRegex.test(config.backgroundColor)) {
    errors.push({ field: 'backgroundColor', message: 'Background color must be a valid hex color' });
  }
  if (!colorRegex.test(config.textColor)) {
    errors.push({ field: 'textColor', message: 'Text color must be a valid hex color' });
  }

  // URL validations (none currently in WidgetConfig)

  // Email validation (none currently in WidgetConfig)

  // Phone validation (none currently in WidgetConfig)

  // Booking-specific validations
      if (!config.maxPartySize || config.maxPartySize < 1 || config.maxPartySize > 100) {
    errors.push({ field: 'maxPartySize', message: 'Max party size must be between 1 and 100' });
  }
  if (config.minAdvanceBooking < 0 || config.minAdvanceBooking > 48) {
    errors.push({ field: 'minAdvanceBooking', message: 'Min advance booking must be between 0 and 48 hours' });
  }
  if (!config.maxAdvanceBooking || config.maxAdvanceBooking < 1 || config.maxAdvanceBooking > 365) {
    errors.push({ field: 'maxAdvanceBooking', message: 'Max advance booking must be between 1 and 365 days' });
  }

  if (config.minAdvanceBooking >= (config.maxAdvanceBooking * 24)) {
    errors.push({ field: 'minAdvanceBooking', message: 'Min advance booking must be less than max advance booking' });
  }

  // Custom code validations (basic XSS prevention)
      if (config.customCss && /<script|<iframe|<object|<embed/i.test(config.customCss)) {
    errors.push({ field: 'customCss', message: 'Custom CSS cannot contain script or embed tags' });
  }
  if (config.customJs && /<script|<iframe|<object|<embed/i.test(config.customJs)) {
    errors.push({ field: 'customJs', message: 'Custom JS cannot contain script or embed tags' });
  }

  return errors;
}


