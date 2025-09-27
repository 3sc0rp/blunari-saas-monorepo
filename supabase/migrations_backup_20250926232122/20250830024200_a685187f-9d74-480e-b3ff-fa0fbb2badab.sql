-- Remove test data to have clean slate
DELETE FROM auto_provisioning WHERE restaurant_name = 'Test Restaurant';
DELETE FROM tenants WHERE name = 'Test Restaurant';