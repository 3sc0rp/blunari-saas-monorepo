-- Fix activity_feed table - add missing columns
ALTER TABLE public.activity_feed 
ADD COLUMN IF NOT EXISTS type text,
ADD COLUMN IF NOT EXISTS service text,
ADD COLUMN IF NOT EXISTS timestamp timestamp with time zone DEFAULT now();

-- Update existing records to have proper values
UPDATE public.activity_feed 
SET 
  type = activity_type,
  service = service_name,
  timestamp = created_at
WHERE type IS NULL OR service IS NULL OR timestamp IS NULL;

-- Fix system_health_metrics table - add missing columns if they don't exist
ALTER TABLE public.system_health_metrics
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS recorded_at timestamp with time zone DEFAULT now();

-- Update existing records
UPDATE public.system_health_metrics 
SET 
  name = metric_name,
  recorded_at = created_at
WHERE name IS NULL OR recorded_at IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_feed_type ON public.activity_feed(type);
CREATE INDEX IF NOT EXISTS idx_activity_feed_service ON public.activity_feed(service);
CREATE INDEX IF NOT EXISTS idx_activity_feed_timestamp ON public.activity_feed(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_recorded_at ON public.system_health_metrics(recorded_at);