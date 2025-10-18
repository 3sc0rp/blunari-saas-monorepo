import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from './useTenant';
import { 
  CreateReservationRequest, 
  MoveReservationRequest,
  CancelReservationRequest,
  Reservation,
  validateCreateReservationRequest,
  validateMoveReservationRequest,
  validateCancelReservationRequest
} from '@/lib/contracts';
import { parseError, toastError, toastSuccess, createIdempotencyKey } from '@/lib/errors';

interface ReservationActionResult {
  ok: boolean;
  data?: any;
  error?: string;
  requestId?: string;
}

// Helper function to validate UUID format
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export function useReservationActions() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  // Create reservation mutation
  const createReservation = useMutation({
    mutationFn: async (request: CreateReservationRequest): Promise<Reservation> => {
      if (!tenantId) {
        throw new Error('Tenant not found');
      }

      // Validate request
      const validatedRequest = validateCreateReservationRequest(request);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      // Generate idempotency key
      const idempotencyKey = createIdempotencyKey('create-reservation', validatedRequest);

      const { data, error } = await supabase.functions.invoke('create-reservation', {
        body: validatedRequest,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey
        }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.data;
    },
    onSuccess: (reservation) => {
      toastSuccess('Reservation created successfully', `Table ${reservation.tableId} reserved for ${reservation.guestName}`);
      
      // Invalidate command center queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['command-center', tenantId] });
    },
    onError: (error) => {
      const parsedError = parseError(error);
      toastError(parsedError, 'Failed to create reservation');
    }
  });

  // Move reservation mutation
  const moveReservation = useMutation({
    mutationFn: async (request: MoveReservationRequest): Promise<Reservation> => {
      if (!tenantId) {
        throw new Error('Tenant not found');
      }

      // Log the request for debugging
      console.log('Move reservation request:', request);

      // Check if reservation ID format is valid
      if (!isValidUUID(request.reservationId)) {
        const errorMsg = `Invalid reservation ID format: ${request.reservationId}. Expected UUID format.`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      // Validate request
      try {
        const validatedRequest = validateMoveReservationRequest(request);
        console.log('Validated request:', validatedRequest);
      } catch (validationError) {
        console.error('Validation error:', validationError);
        throw new Error(`Invalid reservation data: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`);
      }

      const validatedRequest = validateMoveReservationRequest(request);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      // Generate idempotency key
      const idempotencyKey = createIdempotencyKey('move-reservation', validatedRequest);

      const { data, error } = await supabase.functions.invoke('update-reservation', {
        body: validatedRequest,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey
        }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.data;
    },
    onSuccess: (reservation) => {
      toastSuccess('Reservation moved successfully', `Updated reservation for ${reservation.guestName}`);
      
      // Invalidate command center queries
      queryClient.invalidateQueries({ queryKey: ['command-center', tenantId] });
    },
    onError: (error) => {
      const parsedError = parseError(error);
      console.error('Move reservation error details:', {
        error: parsedError,
        originalError: error
      });
      toastError(parsedError, 'Failed to move reservation');
    }
  });

  // Cancel reservation mutation
  const cancelReservation = useMutation({
    mutationFn: async (request: CancelReservationRequest): Promise<void> => {
      if (!tenantId) {
        throw new Error('Tenant not found');
      }

      // Validate request
      const validatedRequest = validateCancelReservationRequest(request);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      // Generate idempotency key
      const idempotencyKey = createIdempotencyKey('cancel-reservation', validatedRequest);

      const { data, error } = await supabase.functions.invoke('cancel-reservation', {
        body: validatedRequest,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey
        }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error.message);
      }
    },
    onSuccess: () => {
      toastSuccess('Reservation cancelled successfully');
      
      // Invalidate command center queries
      queryClient.invalidateQueries({ queryKey: ['command-center', tenantId] });
    },
    onError: (error) => {
      const parsedError = parseError(error);
      toastError(parsedError, 'Failed to cancel reservation');
    }
  });

  // Helper functions that return action results
  const createReservationAction = async (request: CreateReservationRequest): Promise<ReservationActionResult> => {
    try {
      const data = await createReservation.mutateAsync(request);
      return { ok: true, data };
    } catch (error) {
      const parsedError = parseError(error);
      return { 
        ok: false, 
        error: parsedError.message, 
        requestId: parsedError.requestId 
      };
    }
  };

  const moveReservationAction = async (request: MoveReservationRequest): Promise<ReservationActionResult> => {
    try {
      const data = await moveReservation.mutateAsync(request);
      return { ok: true, data };
    } catch (error) {
      const parsedError = parseError(error);
      return { 
        ok: false, 
        error: parsedError.message, 
        requestId: parsedError.requestId 
      };
    }
  };

  const cancelReservationAction = async (request: CancelReservationRequest): Promise<ReservationActionResult> => {
    try {
      await cancelReservation.mutateAsync(request);
      return { ok: true };
    } catch (error) {
      const parsedError = parseError(error);
      return { 
        ok: false, 
        error: parsedError.message, 
        requestId: parsedError.requestId 
      };
    }
  };

  return {
    // Mutation objects (for loading states, etc.)
    createReservation,
    moveReservation,
    cancelReservation,
    
    // Action functions (for direct use)
    createReservationAction,
    moveReservationAction,
    cancelReservationAction,
    
    // Loading states
    isCreating: createReservation.isPending,
    isMoving: moveReservation.isPending,
    isCancelling: cancelReservation.isPending,
    isAnyLoading: createReservation.isPending || moveReservation.isPending || cancelReservation.isPending
  };
}
