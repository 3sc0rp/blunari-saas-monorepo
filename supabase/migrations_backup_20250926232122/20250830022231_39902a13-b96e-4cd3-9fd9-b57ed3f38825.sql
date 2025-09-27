-- Enable RLS on tables that don't have it yet
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for webhook_logs
CREATE POLICY "Admins can view webhook logs" 
ON public.webhook_logs 
FOR SELECT 
USING (has_employee_role('SUPPORT'::employee_role));

CREATE POLICY "System can insert webhook logs" 
ON public.webhook_logs 
FOR INSERT 
WITH CHECK (true);

-- Create RLS policies for service_health_checks
CREATE POLICY "Admins can view health checks" 
ON public.service_health_checks 
FOR SELECT 
USING (has_employee_role('SUPPORT'::employee_role));

CREATE POLICY "System can insert health checks" 
ON public.service_health_checks 
FOR INSERT 
WITH CHECK (true);

-- Create RLS policies for job_schedules
CREATE POLICY "Admins can manage job schedules" 
ON public.job_schedules 
FOR ALL 
USING (has_employee_role('ADMIN'::employee_role))
WITH CHECK (has_employee_role('ADMIN'::employee_role));