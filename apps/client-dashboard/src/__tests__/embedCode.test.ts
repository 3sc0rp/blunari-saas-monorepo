import { describe, it, expect } from 'vitest';
import { generateEmbedCode, getDefaultWidgetConfig } from '@/utils/widgetUtils';

describe('generateEmbedCode sandbox hardening', () => {
  it('never includes allow-same-origin in sandbox', () => {
    const cfg = getDefaultWidgetConfig('booking');
    const { embedCode, isValid } = generateEmbedCode('booking', cfg, '123e4567-e89b-12d3-a456-426614174000', 'Test');
    expect(isValid).toBe(true);
    expect(embedCode).toMatch(/sandbox=['\"]allow-scripts allow-forms allow-popups allow-top-navigation['\"]/);
    expect(embedCode).not.toMatch(/allow-same-origin/);
  });
});
