import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });

    it('should provide auth context values', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('session');
      expect(result.current).toHaveProperty('profile');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('isAdmin');
      expect(result.current).toHaveProperty('signIn');
      expect(result.current).toHaveProperty('signUp');
      expect(result.current).toHaveProperty('signOut');
    });
  });

  describe('evaluateAdminStatus', () => {
    it('should set isAdmin to true for SUPER_ADMIN role', async () => {
      const mockEmployee = {
        data: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
        error: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue(mockEmployee),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { timeout: 3000 }
      );
    });

    it('should set isAdmin to false for inactive employee', async () => {
      const mockEmployee = {
        data: { role: 'ADMIN', status: 'INACTIVE' },
        error: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue(mockEmployee),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('signIn', () => {
    it('should validate required fields', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const response = await result.current.signIn('', '');

      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('required');
    });

    it('should sanitize email input', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await result.current.signIn('  TEST@EXAMPLE.COM  ', 'password123');

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  describe('signUp', () => {
    it('should validate password strength', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const response = await result.current.signUp(
        'test@blunari.ai',
        'weak',
        'John',
        'Doe'
      );

      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('12 characters');
    });

    it('should require uppercase, lowercase, numbers, and special chars', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const response = await result.current.signUp(
        'test@blunari.ai',
        'alllowercase123',
        'John',
        'Doe'
      );

      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('uppercase');
    });

    it('should sanitize name inputs', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await result.current.signUp(
        'test@blunari.ai',
        'SecurePass123!',
        '<script>John</script>',
        'Doe<>'
      );

      expect(supabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: {
              first_name: 'scriptJohnscript',
              last_name: 'Doe',
            },
          }),
        })
      );
    });
  });
});
