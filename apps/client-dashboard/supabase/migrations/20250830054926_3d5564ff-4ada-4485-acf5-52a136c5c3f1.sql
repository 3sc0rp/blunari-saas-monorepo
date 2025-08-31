-- Create some sample bookings for today to show in the dashboard
INSERT INTO public.bookings (
  id, tenant_id, guest_name, guest_email, guest_phone, party_size, 
  booking_time, duration_minutes, status, table_id, special_requests
) VALUES 
  (
    gen_random_uuid(),
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'John Smith',
    'john.smith@email.com',
    '+1-555-0123',
    4,
    CURRENT_DATE + INTERVAL '19 hours',  -- 7 PM today
    120,
    'confirmed',
    (SELECT id FROM public.restaurant_tables WHERE tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid LIMIT 1),
    'Window table preferred'
  ),
  (
    gen_random_uuid(),
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'Sarah Johnson',
    'sarah.j@email.com',
    '+1-555-0124',
    2,
    CURRENT_DATE + INTERVAL '20 hours',  -- 8 PM today
    90,
    'confirmed',
    (SELECT id FROM public.restaurant_tables WHERE tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid OFFSET 1 LIMIT 1),
    NULL
  ),
  (
    gen_random_uuid(),
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'Mike Davis',
    'mike.davis@email.com',
    '+1-555-0125',
    6,
    CURRENT_DATE + INTERVAL '18 hours 30 minutes',  -- 6:30 PM today
    150,
    'seated',
    (SELECT id FROM public.restaurant_tables WHERE tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid OFFSET 2 LIMIT 1),
    'Birthday celebration'
  ),
  (
    gen_random_uuid(),
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'Lisa Wilson',
    'lisa.w@email.com',
    '+1-555-0126',
    3,
    CURRENT_DATE + INTERVAL '17 hours',  -- 5 PM today (completed)
    120,
    'completed',
    (SELECT id FROM public.restaurant_tables WHERE tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid OFFSET 3 LIMIT 1),
    NULL
  ),
  (
    gen_random_uuid(),
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'Robert Brown',
    'rob.brown@email.com',
    '+1-555-0127',
    2,
    CURRENT_DATE + INTERVAL '21 hours',  -- 9 PM today
    90,
    'confirmed',
    (SELECT id FROM public.restaurant_tables WHERE tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid LIMIT 1),
    'Anniversary dinner'
  )
ON CONFLICT DO NOTHING;