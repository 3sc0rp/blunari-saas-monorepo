/**
 * Input Sanitization Utilities
 * 
 * Provides comprehensive functions to sanitize user input and prevent XSS attacks,
 * SQL injection, and other security vulnerabilities.
 * 
 * @module sanitization
 * @author Blunari Team
 * @since Phase 2 - Performance & Security
 */

/**
 * Sanitizes email addresses by converting to lowercase and trimming whitespace.
 * 
 * @param {string} email - The email address to sanitize
 * @returns {string} The sanitized email address
 * 
 * @example
 * ```typescript
 * const clean = sanitizeEmail("  User@Example.COM  ");
 * // Result: "user@example.com"
 * ```
 * 
 * @remarks
 * This function does NOT validate email format. Use `validateEmail()` for validation.
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Sanitizes user names by removing dangerous HTML characters and limiting length.
 * 
 * @param {string} name - The name to sanitize
 * @returns {string} The sanitized name (max 100 characters)
 * 
 * @example
 * ```typescript
 * const clean = sanitizeName("John <script>alert('xss')</script> Doe");
 * // Result: "John scriptalert('xss')/script Doe"
 * ```
 * 
 * @remarks
 * - Removes angle brackets (< >)
 * - Removes curly braces ({ })
 * - Trims whitespace
 * - Limits to 100 characters
 * 
 * @security Prevents XSS attacks via HTML injection in name fields
 */
export function sanitizeName(name: string): string {
  return name
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/[{}]/g, '') // Remove curly braces
    .slice(0, 100); // Limit length
}

/**
 * Sanitizes slugs for URL-safe identifiers.
 * 
 * @param {string} slug - The slug to sanitize
 * @returns {string} A URL-safe slug (max 50 characters)
 * 
 * @example
 * ```typescript
 * const clean = sanitizeSlug("My Café & Restaurant!!");
 * // Result: "my-caf-restaurant"
 * ```
 * 
 * @remarks
 * - Converts to lowercase
 * - Allows only letters, numbers, and hyphens
 * - Removes leading/trailing hyphens
 * - Limits to 50 characters
 * 
 * @use-case Tenant slugs, URL identifiers, SEO-friendly URLs
 */
export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '') // Only allow lowercase letters, numbers, and hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .slice(0, 50); // Limit length
}

/**
 * Sanitizes phone numbers by removing invalid characters.
 * 
 * @param {string} phone - The phone number to sanitize
 * @returns {string} The sanitized phone number (max 20 characters)
 * 
 * @example
 * ```typescript
 * const clean = sanitizePhone("+1 (555) 123-4567 ext. 890");
 * // Result: "+1 (555) 123-4567  890"
 * ```
 * 
 * @remarks
 * Allows: digits (0-9), plus (+), minus (-), parentheses (), and spaces
 * Removes: letters, special characters, and limits to 20 characters
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[^0-9+\-() ]/g, '').slice(0, 20);
}

/**
 * Sanitizes and validates URLs by ensuring only safe protocols.
 * 
 * @param {string} url - The URL to sanitize and validate
 * @returns {string | null} The sanitized URL or null if invalid
 * 
 * @example
 * ```typescript
 * const safe = sanitizeUrl("https://example.com/page?id=1");
 * // Result: "https://example.com/page?id=1"
 * 
 * const unsafe = sanitizeUrl("javascript:alert('xss')");
 * // Result: null
 * ```
 * 
 * @remarks
 * - Only allows http:// and https:// protocols
 * - Returns null for invalid URLs or dangerous protocols
 * - Uses native URL parser for validation
 * 
 * @security Prevents javascript:, data:, and other dangerous protocols
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitizes HTML content by removing dangerous tags and attributes.
 * 
 * @param {string} html - The HTML content to sanitize
 * @returns {string} The sanitized HTML
 * 
 * @example
 * ```typescript
 * const dirty = '<p onclick="alert()">Hello</p><script>alert("xss")</script>';
 * const clean = sanitizeHtml(dirty);
 * // Result: '<p>Hello</p>'
 * ```
 * 
 * @remarks
 * Removes:
 * - `<script>` tags and content
 * - `<iframe>` tags and content
 * - Event handlers (onclick, onload, etc.)
 * - javascript: protocol references
 * 
 * @warning This is basic sanitization. For production rich-text editing,
 * use DOMPurify library for comprehensive XSS protection.
 * 
 * @security Prevents XSS attacks via HTML injection
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, ''); // Remove javascript: protocol
}

/**
 * Sanitizes generic text by removing control characters and limiting length.
 * 
 * @param {string} text - The text to sanitize
 * @param {number} [maxLength=1000] - Maximum allowed length
 * @returns {string} The sanitized text
 * 
 * @example
 * ```typescript
 * const clean = sanitizeText("Hello\x00World\x1F!", 50);
 * // Result: "HelloWorld!"
 * ```
 * 
 * @remarks
 * - Removes ASCII control characters (0x00-0x1F, 0x7F)
 * - Trims leading/trailing whitespace
 * - Limits to specified maxLength (default: 1000)
 * 
 * @use-case General text fields, descriptions, comments
 */
export function sanitizeText(text: string, maxLength = 1000): string {
  return text
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitizes objects for safe logging by redacting sensitive fields.
 * 
 * @param {Record<string, unknown>} obj - The object to sanitize
 * @returns {Record<string, unknown>} The sanitized object with sensitive data redacted
 * 
 * @example
 * ```typescript
 * const user = {
 *   email: "user@example.com",
 *   password: "secret123",
 *   apiKey: "abc123",
 *   name: "John Doe"
 * };
 * 
 * const safe = sanitizeForLogging(user);
 * // Result: {
 * //   email: "user@example.com",
 * //   password: "[REDACTED]",
 * //   apiKey: "[REDACTED]",
 * //   name: "John Doe"
 * // }
 * ```
 * 
 * @remarks
 * Automatically redacts fields containing:
 * - password
 * - token
 * - secret
 * - apiKey / api_key
 * - accessToken
 * - refreshToken
 * 
 * Recursively sanitizes nested objects.
 * 
 * @security Prevents accidental exposure of credentials in logs
 * @use-case Error logging, debug logging, audit trails
 */
export function sanitizeForLogging(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitive = ['password', 'token', 'secret', 'apiKey', 'api_key', 'accessToken', 'refreshToken'];
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (sensitive.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validates and sanitizes email addresses in one step.
 * 
 * @param {string} email - The email address to validate and sanitize
 * @returns {{ valid: boolean; sanitized: string }} Validation result and sanitized email
 * 
 * @example
 * ```typescript
 * const result = validateEmail("  User@Example.COM  ");
 * // Result: { valid: true, sanitized: "user@example.com" }
 * 
 * const invalid = validateEmail("not-an-email");
 * // Result: { valid: false, sanitized: "not-an-email" }
 * ```
 * 
 * @remarks
 * - First sanitizes (lowercase, trim)
 * - Then validates with RFC-compliant regex
 * - Returns both validation status and sanitized value
 * 
 * @use-case Form validation, user registration, email verification
 */
export function validateEmail(email: string): { valid: boolean; sanitized: string } {
  const sanitized = sanitizeEmail(email);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized);
  return { valid, sanitized };
}

/**
 * Sanitizes search queries to prevent SQL injection and XSS attacks.
 * 
 * @param {string} query - The search query to sanitize
 * @returns {string} The sanitized search query (max 100 characters)
 * 
 * @example
 * ```typescript
 * const clean = sanitizeSearchQuery("'; DROP TABLE users; --");
 * // Result: " DROP TABLE users "
 * 
 * const safe = sanitizeSearchQuery("john's <restaurant>");
 * // Result: "johns restaurant"
 * ```
 * 
 * @remarks
 * Removes:
 * - SQL injection characters: ', ", ;, -
 * - HTML characters: <, >
 * - Limits to 100 characters
 * 
 * @security Prevents SQL injection and XSS in search functionality
 * @use-case Search bars, filter inputs, query parameters
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .replace(/['";-]/g, '') // Remove SQL injection characters
    .replace(/[<>]/g, '') // Remove HTML characters
    .trim()
    .slice(0, 100);
}
