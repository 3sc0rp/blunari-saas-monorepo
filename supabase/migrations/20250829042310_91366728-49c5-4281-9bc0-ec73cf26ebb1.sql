-- Fix background_jobs table - add missing scheduled_for column (maps to scheduled_at)
ALTER TABLE public.background_jobs 
ADD COLUMN IF NOT EXISTS scheduled_for timestamp with time zone DEFAULT now();

-- Update scheduled_for to match scheduled_at if scheduled_at exists
UPDATE public.background_jobs 
SET scheduled_for = scheduled_at 
WHERE scheduled_for IS NULL AND scheduled_at IS NOT NULL;

-- Fix system_health_metrics table - add missing name column (maps to metric_name)  
ALTER TABLE public.system_health_metrics
ADD COLUMN IF NOT EXISTS name text;

-- Update name to match metric_name if metric_name exists
UPDATE public.system_health_metrics 
SET name = metric_name 
WHERE name IS NULL AND metric_name IS NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_background_jobs_scheduled_for ON public.background_jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_name ON public.system_health_metrics(name);