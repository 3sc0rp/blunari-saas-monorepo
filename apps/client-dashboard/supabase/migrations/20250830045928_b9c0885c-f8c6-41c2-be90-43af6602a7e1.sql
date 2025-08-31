-- Clear rate limit for testing purposes
DELETE FROM password_reset_rate_limits WHERE email = 'deewav3@gmail.com';

-- Also clean up any old reset codes for this email
DELETE FROM password_reset_codes WHERE email = 'deewav3@gmail.com' AND created_at < now() - interval '1 hour';