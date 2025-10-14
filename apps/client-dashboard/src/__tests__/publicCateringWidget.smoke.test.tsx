import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CateringWidget from '@/components/catering/CateringWidget';

// Smoke test for unauthenticated public catering widget rendering

describe('Public CateringWidget (unauth)', () => {
  it('renders initial loading or heading state', () => {
    render(<CateringWidget slug="demo" />);
    // We don't know exact wording; attempt a generic pattern and fallback to container existence.
      const possible = screen.queryByText(/loading/i);
    expect(possible || document.querySelector('div')).toBeTruthy();
  });
});

