/**
 * Production Logger - PII-Safe
 * Removes sensitive data from logs in production
 */

// PII patterns to redact
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(\+?1[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g,
  ssn: /\d{3}-\d{2}-\d{4}/g,
  creditCard: /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g,
  ip: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
};

// Fields that commonly contain PII
const PII_FIELDS = [
  'email',
  'guest_email',
  'phone',
  'guest_phone',
  'name',
  'guest_name',
  'customerName',
  'address',
  'ssn',
  'password',
  'token',
  'api_key',
  'secret',
  'creditCard',
  'cardNumber',
  'cvv',
];

const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';
const isDevelopment = import.meta.env.MODE === 'development';

/**
 * Redact PII from a string
 */
export function redactPII(text: string): string {
  if (!isProduction) return text; // Don't redact in development
  
  let redacted = text;
  
  // Replace email addresses
  redacted = redacted.replace(PII_PATTERNS.email, '[EMAIL_REDACTED]');
  
  // Replace phone numbers
  redacted = redacted.replace(PII_PATTERNS.phone, '[PHONE_REDACTED]');
  
  // Replace SSN
  redacted = redacted.replace(PII_PATTERNS.ssn, '[SSN_REDACTED]');
  
  // Replace credit cards
  redacted = redacted.replace(PII_PATTERNS.creditCard, '[CC_REDACTED]');
  
  // Replace IP addresses
  redacted = redacted.replace(PII_PATTERNS.ip, '[IP_REDACTED]');
  
  return redacted;
}

/**
 * Redact PII from an object (recursively)
 */
export function redactObject<T extends Record<string, any>>(obj: T): T {
  if (!isProduction) return obj; // Don't redact in development
  
  if (!obj || typeof obj !== 'object') return obj;
  
  const redacted: any = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    const value = obj[key];
    
    // Check if field name suggests PII
    const isPIIField = PII_FIELDS.some(field => 
      key.toLowerCase().includes(field.toLowerCase())
    );
    
    if (isPIIField && typeof value === 'string') {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactObject(value);
    } else if (typeof value === 'string') {
      redacted[key] = redactPII(value);
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}

/**
 * Safe console.log for production
 */
export const safeLog = {
  log(...args: any[]) {
    if (isDevelopment) {
      console.log(...args);
    } else {
      // In production, redact PII from objects
      const redacted = args.map(arg => 
        typeof arg === 'object' ? redactObject(arg) : 
        typeof arg === 'string' ? redactPII(arg) : arg
      );
      console.log(...redacted);
    }
  },
  
  error(...args: any[]) {
    if (isDevelopment) {
      console.error(...args);
    } else {
      const redacted = args.map(arg => 
        typeof arg === 'object' ? redactObject(arg) : 
        typeof arg === 'string' ? redactPII(arg) : arg
      );
      console.error(...redacted);
    }
  },
  
  warn(...args: any[]) {
    if (isDevelopment) {
      console.warn(...args);
    } else {
      const redacted = args.map(arg => 
        typeof arg === 'object' ? redactObject(arg) : 
        typeof arg === 'string' ? redactPII(arg) : arg
      );
      console.warn(...redacted);
    }
  },
  
  info(...args: any[]) {
    if (isDevelopment) {
      console.info(...args);
    } else {
      const redacted = args.map(arg => 
        typeof arg === 'object' ? redactObject(arg) : 
        typeof arg === 'string' ? redactPII(arg) : arg
      );
      console.info(...redacted);
    }
  },
  
  debug(...args: any[]) {
    // Only log debug in development
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

/**
 * Sanitize booking data for logging
 */
export function sanitizeBookingForLog(booking: any) {
  if (!booking) return null;
  
  return {
    id: booking.id,
    status: booking.status,
    booking_time: booking.booking_time,
    party_size: booking.party_size,
    tenant_id: booking.tenant_id,
    table_id: booking.table_id,
    source: booking.source,
    // PII fields redacted
    guest_name: isProduction ? '[REDACTED]' : booking.guest_name,
    guest_email: isProduction ? '[REDACTED]' : booking.guest_email,
    guest_phone: isProduction ? '[REDACTED]' : booking.guest_phone,
    special_requests: isProduction ? '[REDACTED]' : booking.special_requests,
  };
}

/**
 * Sanitize array of bookings for logging
 */
export function sanitizeBookingsForLog(bookings: any[]) {
  if (!bookings || !Array.isArray(bookings)) return [];
  return bookings.map(sanitizeBookingForLog);
}

/**
 * Create a production-safe logger instance
 */
export function createSafeLogger(component: string) {
  return {
    log: (...args: any[]) => safeLog.log(`[${component}]`, ...args),
    error: (...args: any[]) => safeLog.error(`[${component}]`, ...args),
    warn: (...args: any[]) => safeLog.warn(`[${component}]`, ...args),
    info: (...args: any[]) => safeLog.info(`[${component}]`, ...args),
    debug: (...args: any[]) => safeLog.debug(`[${component}]`, ...args),
  };
}

/**
 * Disable all console methods in production (aggressive mode)
 */
export function disableConsoleInProduction() {
  if (!isProduction) return;
  
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;
  // Keep error and warn for critical issues
}

/**
 * Example usage:
 * 
 * // Instead of:
 * console.log('Booking created:', booking);
 * 
 * // Use:
 * safeLog.log('Booking created:', sanitizeBookingForLog(booking));
 * 
 * // Or create a component logger:
 * const logger = createSafeLogger('BookingWizard');
 * logger.log('User submitted form', sanitizeBookingForLog(booking));
 */
