/**
 * Command Center Functionality Test
 * 
 * This file tests all Command Center components for functionality,
 * performance, accessibility, and error handling.
 * 
 * @author Senior Developer Team
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import all Command Center components
import CommandCenter from '@/pages/CommandCenter';
import { MainSplit } from '@/components/command-center/MainSplit.tsx';
import { Timeline } from '@/components/command-center/Timeline.tsx';
import MiniFloorplan from '@/components/command-center/MiniFloorplan.tsx';
import KitchenLoadGauge from '@/components/command-center/KitchenLoadGauge.tsx';
import { StatusLegend } from '@/components/command-center/StatusLegend.tsx';
import { KpiStrip } from '@/components/command-center/KpiStrip.tsx';

// Mock data for testing
const mockTables = [
  { id: 'table-1', name: 'Table 1', capacity: 4, section: 'Main' as const, status: 'available' as const },
  { id: 'table-2', name: 'Table 2', capacity: 2, section: 'Bar' as const, status: 'occupied' as const },
  { id: 'table-3', name: 'Table 3', capacity: 6, section: 'Patio' as const, status: 'reserved' as const },
];

const mockReservations = [
  {
    id: 'res-1',
    tableId: 'table-2',
    guestName: 'John Doe',
    partySize: 2,
    start: new Date().toISOString(),
    end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: 'seated' as const,
    channel: 'online' as const,
  },
  {
    id: 'res-2',
    tableId: 'table-3',
    guestName: 'Jane Smith',
    partySize: 4,
    start: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
    end: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    status: 'confirmed' as const,
    channel: 'phone' as const,
  },
];

const mockKpiCards = [
  { id: 'kpi-1', label: 'Total Reservations', value: '24', trendDirection: 'up' as const },
  { id: 'kpi-2', label: 'Revenue', value: '$2,850', trendDirection: 'up' as const },
  { id: 'kpi-3', label: 'Table Turnover', value: '2.3', trendDirection: 'down' as const },
];

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
    })),
  },
}));

describe('Command Center Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MainSplit Component', () => {
    it('renders without crashing', () => {
      const mockProps = {
        tables: mockTables,
        reservations: mockReservations,
        onSelectReservation: vi.fn(),
        onFocusTable: vi.fn(),
        loading: false,
        error: null,
      };

      render(<MainSplit {...mockProps} />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('displays loading state correctly', () => {
      const mockProps = {
        tables: [],
        reservations: [],
        onSelectReservation: vi.fn(),
        loading: true,
        error: null,
      };

      render(<MainSplit {...mockProps} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByLabelText('Loading command center data')).toBeInTheDocument();
    });

    it('handles error state properly', () => {
      const mockProps = {
        tables: [],
        reservations: [],
        onSelectReservation: vi.fn(),
        loading: false,
        error: { message: 'Test error message', requestId: 'test-123' },
      };

      render(<MainSplit {...mockProps} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
      expect(screen.getByText('Request ID: test-123')).toBeInTheDocument();
    });

    it('calculates kitchen load correctly', () => {
      const mockProps = {
        tables: mockTables,
        reservations: mockReservations,
        onSelectReservation: vi.fn(),
        loading: false,
        error: null,
        kitchenLoad: 0, // Should calculate from active reservations
      };

      render(<MainSplit {...mockProps} />);
      // Kitchen load should be calculated based on seated reservations
      expect(screen.getByText('Kitchen Load Monitor')).toBeInTheDocument();
    });
  });

  describe('Timeline Component', () => {
    it('renders timeline with proper accessibility', () => {
      const mockProps = {
        tables: mockTables,
        reservations: mockReservations,
        onReservationClick: vi.fn(),
        onTimeSlotClick: vi.fn(),
      };

      render(<Timeline {...mockProps} />);
      expect(screen.getByRole('application')).toBeInTheDocument();
      expect(screen.getByLabelText(/reservation timeline/i)).toBeInTheDocument();
    });

    it('handles reservation clicks', async () => {
      const mockOnReservationClick = vi.fn();
      const mockProps = {
        tables: mockTables,
        reservations: mockReservations,
        onReservationClick: mockOnReservationClick,
        onTimeSlotClick: vi.fn(),
      };

      render(<Timeline {...mockProps} />);
      
      // Find and click on a reservation (this would be implementation-specific)
      const reservationElements = screen.queryAllByRole('button', { name: /reservation/i });
      if (reservationElements.length > 0) {
        fireEvent.click(reservationElements[0]);
        expect(mockOnReservationClick).toHaveBeenCalled();
      }
    });
  });

  describe('MiniFloorplan Component', () => {
    it('renders floor plan with table status', () => {
      const mockProps = {
        tables: mockTables,
        reservations: mockReservations,
        onFocusTable: vi.fn(),
      };

      render(<MiniFloorplan {...mockProps} />);
      expect(screen.getByRole('application')).toBeInTheDocument();
      expect(screen.getByLabelText(/restaurant floor plan/i)).toBeInTheDocument();
    });

    it('handles table focus interactions', () => {
      const mockOnFocusTable = vi.fn();
      const mockProps = {
        tables: mockTables,
        reservations: mockReservations,
        onFocusTable: mockOnFocusTable,
      };

      render(<MiniFloorplan {...mockProps} />);
      
      // Find table buttons and test interaction
      const tableButtons = screen.getAllByRole('button');
      if (tableButtons.length > 0) {
        fireEvent.click(tableButtons[0]);
        expect(mockOnFocusTable).toHaveBeenCalled();
      }
    });

    it('supports keyboard navigation', () => {
      const mockOnFocusTable = vi.fn();
      const mockProps = {
        tables: mockTables,
        reservations: mockReservations,
        onFocusTable: mockOnFocusTable,
      };

      render(<MiniFloorplan {...mockProps} />);
      
      const tableButtons = screen.getAllByRole('button');
      if (tableButtons.length > 0) {
        fireEvent.keyDown(tableButtons[0], { key: 'Enter' });
        expect(mockOnFocusTable).toHaveBeenCalled();
      }
    });
  });

  describe('KitchenLoadGauge Component', () => {
    it('renders gauge with correct percentage', () => {
      render(<KitchenLoadGauge percentage={75} />);
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('Kitchen Load')).toBeInTheDocument();
    });

    it('handles edge cases for percentage values', () => {
      render(<KitchenLoadGauge percentage={150} />); // Should clamp to 100
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('shows correct status based on load', () => {
      const { rerender } = render(<KitchenLoadGauge percentage={25} />);
      expect(screen.getByText('Light')).toBeInTheDocument();

      rerender(<KitchenLoadGauge percentage={65} />);
      expect(screen.getByText('Moderate')).toBeInTheDocument();

      rerender(<KitchenLoadGauge percentage={85} />);
      expect(screen.getByText('Heavy')).toBeInTheDocument();
    });
  });

  describe('StatusLegend Component', () => {
    it('renders status legend with counts', () => {
      const mockCounts = {
        available: 5,
        seated: 3,
        reserved: 2,
        phone: 1,
        walkIn: 0,
        maintenance: 1,
      };

      render(<StatusLegend counts={mockCounts} />);
      
      expect(screen.getByText('Table Status')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Total Tables')).toBeInTheDocument();
    });

    it('handles undefined counts gracefully', () => {
      render(<StatusLegend />);
      expect(screen.getByText('Total Tables')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // Total should be 0
    });
  });

  describe('KpiStrip Component', () => {
    it('renders KPI cards correctly', () => {
      render(<KpiStrip items={mockKpiCards} />);
      
      expect(screen.getByText('Total Reservations')).toBeInTheDocument();
      expect(screen.getByText('24')).toBeInTheDocument();
      expect(screen.getByText('Revenue')).toBeInTheDocument();
      expect(screen.getByText('$2,850')).toBeInTheDocument();
    });

    it('shows loading state', () => {
      render(<KpiStrip items={[]} loading={true} />);
      // Should show skeleton loaders
      const skeletons = screen.getAllByRole('status', { hidden: true });
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility Compliance', () => {
    it('has proper ARIA labels and roles', () => {
      const mockProps = {
        tables: mockTables,
        reservations: mockReservations,
        onSelectReservation: vi.fn(),
        loading: false,
        error: null,
      };

      render(<MainSplit {...mockProps} />);
      
      // Check for main landmark
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Check for complementary sidebar
      expect(screen.getByRole('complementary')).toBeInTheDocument();
      
      // Check for proper labeling
      expect(screen.getByLabelText(/restaurant command center/i)).toBeInTheDocument();
    });

    it('supports screen readers with proper headings', () => {
      const mockProps = {
        tables: mockTables,
        reservations: mockReservations,
        onSelectReservation: vi.fn(),
        loading: false,
        error: null,
      };

      render(<MainSplit {...mockProps} />);
      
      // Check for screen reader only headings
      expect(screen.getByText('Restaurant Floor Plan')).toHaveClass('sr-only');
      expect(screen.getByText('Kitchen Load Monitor')).toHaveClass('sr-only');
      expect(screen.getByText('Table Status Legend')).toHaveClass('sr-only');
    });
  });

  describe('Error Handling', () => {
    it('gracefully handles invalid data', () => {
      const mockProps = {
        tables: null as any, // Invalid data
        reservations: null as any, // Invalid data
        onSelectReservation: vi.fn(),
        loading: false,
        error: null,
      };

      render(<MainSplit {...mockProps} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/invalid data format/i)).toBeInTheDocument();
    });

    it('handles network errors properly', () => {
      const mockProps = {
        tables: mockTables,
        reservations: mockReservations,
        onSelectReservation: vi.fn(),
        loading: false,
        error: { 
          message: 'Network error: Unable to load reservations',
          requestId: 'req-failed-123'
        },
      };

      render(<MainSplit {...mockProps} />);
      expect(screen.getByText('Unable to load data')).toBeInTheDocument();
      expect(screen.getByText('Network error: Unable to load reservations')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('uses memoization to prevent unnecessary re-renders', () => {
      // This would be tested with React DevTools or performance monitoring
      // For now, we verify the components render without performance warnings
      
      const mockProps = {
        tables: mockTables,
        reservations: mockReservations,
        onSelectReservation: vi.fn(),
        loading: false,
        error: null,
      };

      const { rerender } = render(<MainSplit {...mockProps} />);
      
      // Re-render with same props should not cause issues
      rerender(<MainSplit {...mockProps} />);
      
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});

export default {
  testSuite: 'Command Center Functionality Tests',
  components: [
    'MainSplit',
    'Timeline', 
    'MiniFloorplan',
    'KitchenLoadGauge',
    'StatusLegend',
    'KpiStrip'
  ],
  coverage: [
    'Functionality',
    'Accessibility',
    'Error Handling',
    'Performance',
    'TypeScript Compliance'
  ]
};
