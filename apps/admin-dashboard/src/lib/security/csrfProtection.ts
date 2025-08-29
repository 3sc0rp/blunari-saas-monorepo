/**
 * Enhanced CSRF Protection with secure token generation
 */
export class CSRFProtection {
  private static readonly TOKEN_KEY = 'csrf_token';
  private static readonly TOKEN_HEADER = 'X-CSRF-Token';

  /**
   * Generate a cryptographically secure CSRF token
   */
  static generateToken(): string {
    if (typeof window === 'undefined') {
      // Server-side fallback
      return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    // Use crypto.getRandomValues for better entropy
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Store CSRF token securely
   */
  static setToken(): string {
    const token = this.generateToken();
    
    if (typeof window !== 'undefined') {
      // Use sessionStorage instead of localStorage for better security
      sessionStorage.setItem(this.TOKEN_KEY, token);
      
      // Also set as meta tag for forms
      let metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.name = 'csrf-token';
        document.head.appendChild(metaTag);
      }
      metaTag.content = token;
    }
    
    return token;
  }

  /**
   * Get current CSRF token
   */
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    return sessionStorage.getItem(this.TOKEN_KEY) || 
           document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  }

  /**
   * Validate CSRF token
   */
  static validateToken(providedToken: string): boolean {
    const storedToken = this.getToken();
    
    if (!storedToken || !providedToken) {
      return false;
    }
    
    // Constant-time comparison to prevent timing attacks
    if (storedToken.length !== providedToken.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < storedToken.length; i++) {
      result |= storedToken.charCodeAt(i) ^ providedToken.charCodeAt(i);
    }
    
    return result === 0;
  }

  /**
   * Add CSRF token to request headers
   */
  static addToHeaders(headers: Record<string, string> = {}): Record<string, string> {
    const token = this.getToken();
    if (token) {
      headers[this.TOKEN_HEADER] = token;
    }
    return headers;
  }

  /**
   * Add CSRF token to form data
   */
  static addToFormData(formData: FormData): FormData {
    const token = this.getToken();
    if (token) {
      formData.append('_csrf', token);
    }
    return formData;
  }

  /**
   * Clear CSRF token
   */
  static clearToken(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(this.TOKEN_KEY);
      const metaTag = document.querySelector('meta[name="csrf-token"]');
      metaTag?.remove();
    }
  }

  /**
   * Initialize CSRF protection for the session
   */
  static initialize(): void {
    if (!this.getToken()) {
      this.setToken();
    }
  }
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  CSRFProtection.initialize();
}