import { describe, it, expect } from 'vitest';
import { createWidgetToken } from '@/widgets/management/tokenUtils';

// We only assert structural correctness (3 segments) since server validates fully

describe('Widget token', () => {
  it('creates a signed token with three segments', () => {
    const token = createWidgetToken('demo-slug', '2.0', 'booking');
    const parts = token.split('.');
    expect(parts.length).toBe(3);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
    expect(parts[2].length).toBeGreaterThan(0);
  });
});
