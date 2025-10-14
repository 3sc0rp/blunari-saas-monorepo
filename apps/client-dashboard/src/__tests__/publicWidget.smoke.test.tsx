import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BookingWidget from '@/components/booking/BookingWidget';

// Smoke test: ensures BookingWidget renders basic loading state without auth context.
// We simulate slug prop directly (as used by public widget entry routing).

describe('Public BookingWidget (unauth)', () => {
  it('renders loading state initially', () => {
    render(<BookingWidget slug="demo" />);
    // Loading state contains "Loading Restaurant" heading
      const heading = screen.getByText(/Loading Restaurant/i);
    expect(heading).toBeInTheDocument();
  });
});

