-- Clear rate limit for testing purposes
DELETE FROM password_reset_rate_limits WHERE email = 'deewav3@gmail.com';