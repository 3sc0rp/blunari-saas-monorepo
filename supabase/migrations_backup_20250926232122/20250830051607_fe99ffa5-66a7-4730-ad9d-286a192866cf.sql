-- Clean up existing demo domain so it can be added fresh
DELETE FROM public.domain_events WHERE domain_id = '7b5f3842-3aef-4960-ad93-c4377dc7cd23';
DELETE FROM public.domains WHERE id = '7b5f3842-3aef-4960-ad93-c4377dc7cd23';