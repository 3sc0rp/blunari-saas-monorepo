import { describe, it, expect, vi } from 'vitest';
import { 
  getErrorMessage, 
  classifyError, 
  getUserFriendlyErrorMessage,
  handleOperationError
} from '@/lib/errorHandling';

describe('errorHandling utilities', () => {
  describe('getErrorMessage', () => {
    it('should extract message from Error instance', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    it('should handle string errors', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should handle object with message property', () => {
      const error = { message: 'Object error' };
      expect(getErrorMessage(error)).toBe('Object error');
    });

    it('should return default message for unknown errors', () => {
      expect(getErrorMessage(null)).toBe('An unknown error occurred');
      expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
      expect(getErrorMessage(123)).toBe('An unknown error occurred');
    });
  });

  describe('classifyError', () => {
    it('should classify network errors', () => {
      expect(classifyError(new Error('Network error occurred'))).toBe('network');
      expect(classifyError(new Error('Fetch failed'))).toBe('network');
      expect(classifyError(new Error('Connection timeout'))).toBe('network');
    });

    it('should classify auth errors', () => {
      expect(classifyError(new Error('Unauthorized access'))).toBe('auth');
      expect(classifyError(new Error('Invalid token'))).toBe('auth');
      expect(classifyError(new Error('Authentication failed'))).toBe('auth');
    });

    it('should classify validation errors', () => {
      expect(classifyError(new Error('Invalid input'))).toBe('validation');
      expect(classifyError(new Error('Validation failed'))).toBe('validation');
      expect(classifyError(new Error('Email is required'))).toBe('validation');
    });

    it('should classify permission errors', () => {
      expect(classifyError(new Error('Permission denied'))).toBe('permission');
      expect(classifyError(new Error('Access forbidden'))).toBe('permission');
    });

    it('should classify not found errors', () => {
      expect(classifyError(new Error('Resource not found'))).toBe('not_found');
      expect(classifyError(new Error('404 error'))).toBe('not_found');
    });

    it('should return unknown for unclassified errors', () => {
      expect(classifyError(new Error('Something went wrong'))).toBe('unknown');
    });
  });

  describe('getUserFriendlyErrorMessage', () => {
    it('should return user-friendly messages', () => {
      const networkError = new Error('Network connection failed');
      expect(getUserFriendlyErrorMessage(networkError)).toContain('internet connection');

      const authError = new Error('Unauthorized');
      expect(getUserFriendlyErrorMessage(authError)).toContain('log in again');

      const validationError = new Error('Invalid email');
      expect(getUserFriendlyErrorMessage(validationError)).toContain('check your data');
    });
  });

  describe('handleOperationError', () => {
    it('should log error without toast', () => {
      const error = new Error('Test operation failed');
      const options = {
        operation: 'Test Operation',
        component: 'TestComponent',
      };

      // Should not throw
      expect(() => handleOperationError(error, options)).not.toThrow();
    });

    it('should call toast function when provided', () => {
      const error = new Error('Test error');
      const toastFn = vi.fn();
      const options = {
        operation: 'Test Operation',
        toast: {
          title: 'Operation Failed',
          description: 'Please try again',
          variant: 'destructive' as const,
        },
      };

      handleOperationError(error, options, toastFn);

      expect(toastFn).toHaveBeenCalledWith({
        title: 'Operation Failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    });
  });
});
