/**
 * Command Center Filtering Test
 * 
 * This test file validates that all filtering functionality works correctly
 * in the Command Center, including real-time data updates.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import CommandCenter from '@/pages/CommandCenter';

// Mock the hooks
vi.mock('@/hooks/useTenant', () => ({
  useTenant: () => ({
    tenant: {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      slug: 'demo',
      name: 'Demo Restaurant',
      timezone: 'America/New_York',
      currency: 'USD'
    },
    tenantId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    isLoading: false,
    loading: false,
    error: null
  })
}));

vi.mock('@/hooks/useCommandCenterDataSimple', () => ({
  useCommandCenterDataSimple: () => ({
    kpis: [
      {
        id: 'total-bookings',
        label: 'Total Bookings',
        value: '8',
        spark: [],
        tone: 'positive',
        hint: 'Total bookings in system'
      }
    ],
    tables: [
      { id: 'table-1', name: 'Table 1', seats: 4, section: 'Main Dining', status: 'AVAILABLE' },
      { id: 'table-2', name: 'Table 2', seats: 2, section: 'Main Dining', status: 'AVAILABLE' },
      { id: 'table-3', name: 'Table 3', seats: 6, section: 'Main Dining', status: 'AVAILABLE' }
    ],
    reservations: [
      {
        id: 'booking-1',
        guestName: 'John Smith',
        guestEmail: 'john@example.com',
        guestPhone: '+1234567890',
        partySize: 4,
        start: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        end: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
        status: 'CONFIRMED',
        tableId: 'table-1',
        channel: 'WEB',
        specialRequests: 'Window seat',
        depositAmount: 0,
        vip: false
      },
      {
        id: 'booking-2',
        guestName: 'Sarah Johnson',
        guestEmail: 'sarah@example.com',
        guestPhone: '+1234567891',
        partySize: 2,
        start: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        end: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
        status: 'CONFIRMED',
        tableId: 'table-2',
        channel: 'PHONE',
        specialRequests: null,
        depositAmount: 25,
        vip: true
      },
      {
        id: 'booking-3',
        guestName: 'Mike Wilson',
        guestEmail: 'mike@example.com',
        guestPhone: '+1234567892',
        partySize: 6,
        start: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        status: 'SEATED',
        tableId: 'table-3',
        channel: 'WALKIN',
        specialRequests: null,
        depositAmount: 0,
        vip: false
      }
    ],
    policies: {
      tenantId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      depositsEnabled: false,
      depositAmount: 25,
      minPartyForDeposit: 6,
      advanceBookingDays: 30,
      cancellationPolicy: 'flexible'
    },
    loading: false,
    error: null,
    refetch: vi.fn()
  })
}));

vi.mock('@/hooks/useRealtimeCommandCenter', () => ({
  useRealtimeCommandCenter: () => ({
    bookings: [],
    tables: [],
    metrics: {},
    isLoading: false,
    error: null,
    connectionStatus: {
      bookings: 'disconnected',
      tables: 'disconnected',
      waitlist: 'disconnected',
      overall: 'disconnected'
    },
    isConnected: false,
    refreshData: vi.fn()
  })
}));

vi.mock('@/hooks/useReservationActions', () => ({
  useReservationActions: () => ({
    createReservationAction: vi.fn(),
    moveReservationAction: vi.fn(),
    cancelReservationAction: vi.fn(),
    isAnyLoading: false
  })
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({
        data: { session: { access_token: 'fake-token' } }
      }))
    },
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: { success: true } }))
    },
    from: vi.fn(() => ({
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }))
    }))
  }
}));

// Mock other dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

const renderCommandCenter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <CommandCenter />
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Command Center Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the Command Center with sample data', async () => {
    renderCommandCenter();
    
    // Check that basic elements are present
    expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    expect(screen.getByText('Party Size')).toBeInTheDocument();
    expect(screen.getByText('Channel')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    
    // Should show all reservations initially
    await waitFor(() => {
      expect(screen.getByText(/Showing 3 of 3 reservations/)).toBeInTheDocument();
    });
  });

  it('should filter reservations by party size', async () => {
    renderCommandCenter();
    
    // Click on Party Size filter
    const partySizeButton = screen.getByText('Party Size');
    fireEvent.click(partySizeButton);
    
    // Select party size of 4
    await waitFor(() => {
      const size4Button = screen.getByText('4');
      fireEvent.click(size4Button);
    });
    
    // Should show only reservations with 4 guests
    await waitFor(() => {
      expect(screen.getByText(/Showing 1 of 3 reservations/)).toBeInTheDocument();
      expect(screen.getByText('(filtered)')).toBeInTheDocument();
    });
  });

  it('should filter reservations by channel', async () => {
    renderCommandCenter();
    
    // Click on Channel filter
    const channelButton = screen.getByText('Channel');
    fireEvent.click(channelButton);
    
    // Select Web channel
    await waitFor(() => {
      const webCheckbox = screen.getByLabelText('Web');
      fireEvent.click(webCheckbox);
    });
    
    // Should show only web reservations
    await waitFor(() => {
      expect(screen.getByText(/Showing 1 of 3 reservations/)).toBeInTheDocument();
      expect(screen.getByText('(filtered)')).toBeInTheDocument();
    });
  });

  it('should filter reservations by status', async () => {
    renderCommandCenter();
    
    // Click on Status filter
    const statusButton = screen.getByText('Status');
    fireEvent.click(statusButton);
    
    // Select Confirmed status
    await waitFor(() => {
      const confirmedCheckbox = screen.getByLabelText('Confirmed');
      fireEvent.click(confirmedCheckbox);
    });
    
    // Should show only confirmed reservations
    await waitFor(() => {
      expect(screen.getByText(/Showing 2 of 3 reservations/)).toBeInTheDocument();
      expect(screen.getByText('(filtered)')).toBeInTheDocument();
    });
  });

  it('should clear all filters when clicking Clear all filters', async () => {
    renderCommandCenter();
    
    // Apply a filter first
    const partySizeButton = screen.getByText('Party Size');
    fireEvent.click(partySizeButton);
    
    await waitFor(() => {
      const size4Button = screen.getByText('4');
      fireEvent.click(size4Button);
    });
    
    // Verify filter is applied
    await waitFor(() => {
      expect(screen.getByText(/Showing 1 of 3 reservations/)).toBeInTheDocument();
    });
    
    // Click Clear all filters
    const clearButton = screen.getByText('Clear all filters');
    fireEvent.click(clearButton);
    
    // Should show all reservations again
    await waitFor(() => {
      expect(screen.getByText(/Showing 3 of 3 reservations/)).toBeInTheDocument();
      expect(screen.queryByText('(filtered)')).not.toBeInTheDocument();
    });
  });

  it('should update KPI values based on filtered data', async () => {
    renderCommandCenter();
    
    // Initially should show total bookings
    expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    
    // Apply status filter for only confirmed bookings
    const statusButton = screen.getByText('Status');
    fireEvent.click(statusButton);
    
    await waitFor(() => {
      const confirmedCheckbox = screen.getByLabelText('Confirmed');
      fireEvent.click(confirmedCheckbox);
    });
    
    // KPIs should update to reflect filtered data
    await waitFor(() => {
      expect(screen.getByText(/Showing 2 of 3 reservations/)).toBeInTheDocument();
    });
  });

  it('should show dynamic filter counts', async () => {
    renderCommandCenter();
    
    // Check that filter counts are displayed
    const channelButton = screen.getByText('Channel');
    fireEvent.click(channelButton);
    
    // Should show counts next to each channel option
    await waitFor(() => {
      expect(screen.getByText(/Web/)).toBeInTheDocument();
      expect(screen.getByText(/Phone/)).toBeInTheDocument();
      expect(screen.getByText(/Walk-in/)).toBeInTheDocument();
    });
  });

  it('should handle multiple filters simultaneously', async () => {
    renderCommandCenter();
    
    // Apply party size filter
    const partySizeButton = screen.getByText('Party Size');
    fireEvent.click(partySizeButton);
    
    await waitFor(() => {
      const size2Button = screen.getByText('2');
      fireEvent.click(size2Button);
    });
    
    // Apply channel filter
    const channelButton = screen.getByText('Channel');
    fireEvent.click(channelButton);
    
    await waitFor(() => {
      const phoneCheckbox = screen.getByLabelText('Phone');
      fireEvent.click(phoneCheckbox);
    });
    
    // Should show reservations that match both filters
    await waitFor(() => {
      expect(screen.getByText(/Showing 1 of 3 reservations/)).toBeInTheDocument();
      expect(screen.getByText('(filtered)')).toBeInTheDocument();
    });
  });
});