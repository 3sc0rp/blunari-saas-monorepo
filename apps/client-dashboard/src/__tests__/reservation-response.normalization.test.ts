import { describe, it, expect } from 'vitest';
import { ReservationResponseSchema } from '@/types/booking-api';

describe('ReservationResponseSchema', () => {
  it('accepts minimal summary with coerced party_size and optional time', () => {
    const payload = {
      reservation_id: '550e8400-e29b-41d4-a716-446655440001',
      confirmation_number: 'CONF123456',
      status: 'confirmed',
      summary: {
        date: new Date().toISOString(),
        party_size: '4',
      }
    } as any;
    const parsed = ReservationResponseSchema.parse(payload);
    expect(parsed.summary.party_size).toBe(4);
    expect(parsed.summary.time === undefined || typeof parsed.summary.time === 'string').toBe(true);
  });
});