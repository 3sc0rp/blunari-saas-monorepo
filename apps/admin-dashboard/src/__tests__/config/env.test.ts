import { describe, it, expect } from 'vitest';
import { 
  env, 
  isDevelopment, 
  isProduction, 
  isAllowedAdminDomain,
  getAllowedAdminDomains
} from '@/config/env';

describe('env configuration', () => {
  it('should have required Supabase configuration', () => {
    expect(env.VITE_SUPABASE_URL).toBeDefined();
    expect(env.VITE_SUPABASE_ANON_KEY).toBeDefined();
    expect(env.VITE_SUPABASE_URL).toMatch(/^https?:\/\//);
  });

  it('should have mode defined', () => {
    expect(env.MODE).toBeDefined();
    expect(['development', 'production', 'test']).toContain(env.MODE);
  });

  it('should provide environment check helpers', () => {
    expect(typeof isDevelopment).toBe('boolean');
    expect(typeof isProduction).toBe('boolean');
    
    // In test mode
    expect(isDevelopment || isProduction || env.MODE === 'test').toBe(true);
  });

  describe('getAllowedAdminDomains', () => {
    it('should return array of domains', () => {
      const domains = getAllowedAdminDomains();
      expect(Array.isArray(domains)).toBe(true);
      expect(domains.length).toBeGreaterThan(0);
    });

    it('should include default domain', () => {
      const domains = getAllowedAdminDomains();
      expect(domains).toContain('blunari.ai');
    });
  });

  describe('isAllowedAdminDomain', () => {
    it('should validate allowed domains', () => {
      expect(isAllowedAdminDomain('user@blunari.ai')).toBe(true);
    });

    it('should reject non-allowed domains', () => {
      expect(isAllowedAdminDomain('user@gmail.com')).toBe(false);
      expect(isAllowedAdminDomain('user@random.com')).toBe(false);
    });

    it('should handle invalid emails', () => {
      expect(isAllowedAdminDomain('invalid-email')).toBe(false);
      expect(isAllowedAdminDomain('')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isAllowedAdminDomain('user@BLUNARI.AI')).toBe(true);
      expect(isAllowedAdminDomain('user@Blunari.Ai')).toBe(true);
    });
  });
});
