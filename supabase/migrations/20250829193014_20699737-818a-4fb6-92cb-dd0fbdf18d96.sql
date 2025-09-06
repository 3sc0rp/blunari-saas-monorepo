-- Fix RLS for system_health_metrics table
ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for system_health_metrics
CREATE POLICY "Admins can view system health metrics"
  ON public.system_health_metrics FOR SELECT 
  USING (has_employee_role('SUPPORT'::employee_role));

CREATE POLICY "System can insert health metrics"
  ON public.system_health_metrics FOR INSERT 
  WITH CHECK (true);