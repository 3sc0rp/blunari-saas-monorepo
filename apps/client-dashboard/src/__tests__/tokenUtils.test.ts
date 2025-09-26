import { describe, it, expect, vi } from 'vitest';

// We will import dynamically to manipulate env before module eval

describe('tokenUtils hardening', () => {
  it('throws when feature flag disabled', async () => {
    (import.meta as any).env = { ...(import.meta as any).env, VITE_ENABLE_WIDGET_TOKENS: 'false', DEV: true };
    const mod = await import('../widgets/management/tokenUtils');
    await expect(mod.createWidgetToken('slug', '1.0', 'booking')).rejects.toThrow(/disabled/i);
  });

  it('throws in prod when edge fails and local signing path reached', async () => {
    (import.meta as any).env = { ...(import.meta as any).env, VITE_ENABLE_WIDGET_TOKENS: 'true', DEV: false };
    const mod = await import('../widgets/management/tokenUtils');
    // Force edge failure by pointing to no URL
    await expect(mod.createWidgetToken('slug', '1.0', 'booking')).rejects.toThrow(/unavailable/i);
  });
});
