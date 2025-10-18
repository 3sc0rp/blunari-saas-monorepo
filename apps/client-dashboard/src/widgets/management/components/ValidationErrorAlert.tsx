/**
 * ValidationErrorAlert Component
 * Displays validation errors in a consistent alert format
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { ValidationError } from '../types';

interface ValidationErrorAlertProps {
  errors: ValidationError[];
}

export const ValidationErrorAlert: React.FC<ValidationErrorAlertProps> = ({ errors }) => {
  if (errors.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" role="alert" aria-live="assertive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Configuration Errors</AlertTitle>
      <AlertDescription>
        <ul className="list-disc list-inside space-y-1" role="list">
          {errors.map((error, index) => (
            <li key={`${error.field}-${index}`} role="listitem">
              <strong>{error.field}:</strong> {error.message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
};