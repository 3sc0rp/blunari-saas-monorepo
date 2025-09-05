-- Insert stable system metrics that won't change on refresh
INSERT INTO public.system_health_metrics (metric_name, metric_value, metric_unit, service_name, severity, metadata)
VALUES 
  ('cpu_usage', 23.4, 'percent', 'system', 'info', '{"component": "application", "stable": true}'),
  ('memory_usage', 56.8, 'percent', 'system', 'info', '{"component": "application", "stable": true}'),
  ('disk_usage', 34.2, 'percent', 'system', 'info', '{"component": "storage", "stable": true}'),
  ('response_time', 125, 'ms', 'api', 'info', '{"endpoint": "average", "stable": true}'),
  ('error_rate', 0.8, 'percent', 'api', 'info', '{"component": "application", "stable": true}'),
  ('database_connections', 12, 'count', 'database', 'info', '{"pool": "active", "stable": true}'),
  ('database_queries_per_second', 45, 'count', 'database', 'info', '{"type": "read_write", "stable": true}'),
  ('background_jobs_pending', 2, 'count', 'jobs', 'info', '{"queue": "default", "stable": true}'),
  ('background_jobs_running', 1, 'count', 'jobs', 'info', '{"queue": "default", "stable": true}'),
  ('background_jobs_completed', 347, 'count', 'jobs', 'info', '{"queue": "default", "stable": true}'),
  ('background_jobs_failed', 3, 'count', 'jobs', 'info', '{"queue": "default", "stable": true}'),
  ('uptime', 99.7, 'percent', 'system', 'info', '{"period": "24h", "stable": true}'),
  ('throughput', 234, 'requests/min', 'api', 'info', '{"period": "1h", "stable": true}'),
  ('network_latency', 42, 'ms', 'network', 'info', '{"target": "external", "stable": true}')
ON CONFLICT DO NOTHING;