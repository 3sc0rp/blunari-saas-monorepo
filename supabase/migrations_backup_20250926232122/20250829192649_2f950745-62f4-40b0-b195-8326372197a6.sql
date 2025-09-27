-- Create background_jobs table for real data persistence
CREATE TABLE IF NOT EXISTS public.background_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 1,
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view all background jobs"
  ON public.background_jobs FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create background jobs"
  ON public.background_jobs FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update background jobs"
  ON public.background_jobs FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_background_jobs_updated_at
  BEFORE UPDATE ON public.background_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert some real sample data
INSERT INTO public.background_jobs (job_type, status, payload, priority, progress, created_at, started_at, completed_at)
VALUES 
  ('system_maintenance', 'completed', '{"task": "Database cleanup", "tables_cleaned": 15}', 1, 100, 
   now() - interval '2 hours', now() - interval '2 hours', now() - interval '1 hour'),
  ('data_backup', 'completed', '{"backup_type": "full", "size_mb": 2048}', 2, 100,
   now() - interval '4 hours', now() - interval '4 hours', now() - interval '3 hours'),
  ('email_notifications', 'running', '{"batch_size": 500, "sent": 325}', 3, 65,
   now() - interval '30 minutes', now() - interval '25 minutes', null),
  ('log_rotation', 'pending', '{"retention_days": 30}', 2, 0,
   now() - interval '10 minutes', null, null),
  ('analytics_processing', 'failed', '{"dataset": "user_behavior", "error": "timeout"}', 1, 25,
   now() - interval '1 hour', now() - interval '50 minutes', null)
ON CONFLICT DO NOTHING;