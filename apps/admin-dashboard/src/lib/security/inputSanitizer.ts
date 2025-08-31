import DOMPurify from 'dompurify';

/**
 * Comprehensive input sanitization utilities
 */
export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHTML(input: string): string {
    if (typeof window === 'undefined') {
      // Server-side fallback
      return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href'],
      ALLOW_DATA_ATTR: false,
    });
  }

  /**
   * Sanitize user input for SQL injection prevention
   */
  static sanitizeForDatabase(input: string): string {
    return input
      .replace(/'/g, "''")  // Escape single quotes
      .replace(/;/g, "")    // Remove semicolons
      .replace(/--/g, "")   // Remove SQL comments
      .replace(/\/\*/g, "") // Remove block comments
      .replace(/\*\//g, ""); // Remove block comments
  }

  /**
   * Validate and sanitize email addresses
   */
  static sanitizeEmail(email: string): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = email.trim().toLowerCase();
    
    if (!emailRegex.test(sanitized)) {
      return null;
    }
    
    return sanitized;
  }

  /**
   * Sanitize file names to prevent path traversal
   */
  static sanitizeFileName(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '') // Only allow safe characters
      .replace(/\.\./g, '')           // Remove path traversal attempts
      .substring(0, 255);             // Limit length
  }

  /**
   * Remove potentially dangerous characters from user input
   */
  static sanitizeUserInput(input: string): string {
    return input
      .replace(/[<>'"&]/g, '') // Remove HTML/JS dangerous chars
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:/gi, '')       // Remove data: protocol
      .trim()
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate and sanitize phone numbers
   */
  static sanitizePhoneNumber(phone: string): string {
    return phone
      .replace(/[^0-9+\-\s()]/g, '') // Only allow phone number characters
      .trim();
  }
}