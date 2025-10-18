-- Insert sample booking data for the Demo Restaurant tenant
INSERT INTO public.bookings (
  tenant_id,
  guest_name,
  guest_email,
  guest_phone,
  party_size,
  booking_time,
  duration_minutes,
  status,
  table_id,
  special_requests
) VALUES 
  -- Today's bookings
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'John Smith',
    'john.smith@email.com',
    '+1 (555) 123-4567',
    4,
    (CURRENT_DATE + INTERVAL '19 hours')::timestamp with time zone,
    120,
    'confirmed',
    (SELECT id FROM public.restaurant_tables WHERE tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' LIMIT 1),
    'Birthday celebration, need a quiet table'
  ),
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'Sarah Johnson',
    'sarah.j@email.com',
    '+1 (555) 234-5678',
    2,
    (CURRENT_DATE + INTERVAL '20 hours')::timestamp with time zone,
    90,
    'confirmed',
    (SELECT id FROM public.restaurant_tables WHERE tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' OFFSET 1 LIMIT 1),
    'Anniversary dinner'
  ),
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'Mike Williams',
    'mike.w@email.com',
    '+1 (555) 345-6789',
    6,
    (CURRENT_DATE + INTERVAL '18 hours 30 minutes')::timestamp with time zone,
    150,
    'seated',
    (SELECT id FROM public.restaurant_tables WHERE tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' OFFSET 2 LIMIT 1),
    'Business dinner, need WiFi'
  ),
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'Emily Davis',
    'emily.davis@email.com',
    '+1 (555) 456-7890',
    3,
    (CURRENT_DATE + INTERVAL '21 hours')::timestamp with time zone,
    120,
    'confirmed',
    (SELECT id FROM public.restaurant_tables WHERE tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' OFFSET 3 LIMIT 1),
    'Vegetarian options needed'
  ),
  -- Tomorrow's bookings
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'Robert Brown',
    'robert.brown@email.com',
    '+1 (555) 567-8901',
    2,
    (CURRENT_DATE + INTERVAL '1 day 19 hours')::timestamp with time zone,
    90,
    'confirmed',
    (SELECT id FROM public.restaurant_tables WHERE tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' OFFSET 4 LIMIT 1),
    'Window seat preferred'
  ),
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'Lisa Wilson',
    'lisa.wilson@email.com',
    '+1 (555) 678-9012',
    8,
    (CURRENT_DATE + INTERVAL '1 day 20 hours')::timestamp with time zone,
    180,
    'confirmed',
    (SELECT id FROM public.restaurant_tables WHERE tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' OFFSET 5 LIMIT 1),
    'Large group, celebrating graduation'
  ),
  -- Past booking (completed)
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'David Miller',
    'david.miller@email.com',
    '+1 (555) 789-0123',
    4,
    (CURRENT_DATE - INTERVAL '1 day' + INTERVAL '19 hours')::timestamp with time zone,
    120,
    'completed',
    (SELECT id FROM public.restaurant_tables WHERE tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' OFFSET 6 LIMIT 1),
    'Perfect experience, thank you!'
  ),
  -- Cancelled booking
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'Jennifer Taylor',
    'jennifer.taylor@email.com',
    '+1 (555) 890-1234',
    2,
    (CURRENT_DATE + INTERVAL '22 hours')::timestamp with time zone,
    90,
    'cancelled',
    NULL,
    'Had to cancel due to emergency'
  );