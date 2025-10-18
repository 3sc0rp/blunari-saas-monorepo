import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
  showUndo?: boolean;
}

/**
 * Hook for optimistic UI updates with automatic rollback on error
 * 
 * @example
 * const { mutate } = useOptimisticUpdate(
 *   state,
 *   setState,
 *   async (newValue) => {
 *     const { error } = await supabase.from('table').update(newValue);
 *     if (error) throw error;
 *   }
 * );
 * 
 * mutate(newValue, {
 *   successMessage: 'Updated successfully',
 *   showUndo: true
 * });
 */
export function useOptimisticUpdate<T>(
  currentState: T,
  setState: React.Dispatch<React.SetStateAction<T>>,
  serverUpdate: (value: T) => Promise<void>
) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [previousState, setPreviousState] = useState<T>(currentState);

  const mutate = useCallback(
    async (newState: T, options: OptimisticUpdateOptions<T> = {}) => {
      // Save previous state for rollback
      setPreviousState(currentState);

      // Optimistically update UI
      setState(newState);
      setIsUpdating(true);

      try {
        // Perform server update
        await serverUpdate(newState);

        // Success
        if (options.successMessage) {
          toast({
            title: 'Success',
            description: options.successMessage,
          });
        }

        options.onSuccess?.(newState);
      } catch (error) {
        // Rollback on error
        setState(previousState);

        const errorMessage =
          options.errorMessage ||
          (error instanceof Error ? error.message : 'Update failed');

        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });

        options.onError?.(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsUpdating(false);
      }
    },
    [currentState, previousState, setState, serverUpdate, toast]
  );

  const rollback = useCallback(() => {
    setState(previousState);
    serverUpdate(previousState).catch((error) => {
      console.error('Rollback failed:', error);
      toast({
        title: 'Rollback Failed',
        description: 'Could not undo the change',
        variant: 'destructive',
      });
    });
  }, [previousState, setState, serverUpdate, toast]);

  return {
    mutate,
    rollback,
    isUpdating,
    previousState,
  };
}
