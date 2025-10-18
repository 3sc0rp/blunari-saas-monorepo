import { describe, it, expect } from 'vitest';
import {
  SearchRequestSchema,
  HoldRequestSchema,
  ReservationRequestSchema,
  GuestDetailsSchema,
} from '@/types/booking-api';

describe('Booking DTO Schemas', () => {
  it('validates a correct SearchRequest', () => {
    const good = {
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      party_size: 2,
      service_date: '2025-12-31',
      time_window: { start: 'T12:00:00', end: 'T21:00:00' },
    };
    const parsed = SearchRequestSchema.parse(good);
    expect(parsed.party_size).toBe(2);
  });

  it('rejects invalid SearchRequest with party_size < 1', () => {
    const bad = {
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      party_size: 0,
      service_date: '2025-12-31',
    } as any;
    expect(() => SearchRequestSchema.parse(bad)).toThrowError();
  });

  it('validates GuestDetails', () => {
    const guest = {
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      phone: '+15551234567',
      special_requests: 'Window seat',
    };
    const parsed = GuestDetailsSchema.parse(guest);
    expect(parsed.email).toContain('@');
  });

  it('validates HoldRequest', () => {
    const hold = {
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      party_size: 4,
      slot: { time: new Date().toISOString(), available_tables: 1 },
    };
    const parsed = HoldRequestSchema.parse(hold);
    expect(parsed.party_size).toBe(4);
  });

  it('validates ReservationRequest', () => {
    const req = {
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      hold_id: '550e8400-e29b-41d4-a716-446655440001',
      guest_details: {
        first_name: 'John',
        last_name: 'Smith',
        email: 'john@example.com',
        phone: '+15550001111',
      },
    };
    const parsed = ReservationRequestSchema.parse(req);
    expect(parsed.hold_id).toBeTypeOf('string');
  });
});
