-- Create staff invitations table
CREATE TABLE public.staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  employee_id TEXT NOT NULL,
  email TEXT NOT NULL,
  invitation_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view invitations for their tenant" 
ON public.staff_invitations 
FOR SELECT 
USING (user_has_tenant_access(tenant_id));

CREATE POLICY "Users can create invitations for their tenant" 
ON public.staff_invitations 
FOR INSERT 
WITH CHECK (user_has_tenant_access(tenant_id));

CREATE POLICY "Users can update invitations for their tenant" 
ON public.staff_invitations 
FOR UPDATE 
USING (user_has_tenant_access(tenant_id));

-- Add invitation_sent column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS invitation_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE;

-- Create function to generate invitation token
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- Create function to send staff invitation
CREATE OR REPLACE FUNCTION public.create_staff_invitation(
  p_employee_id TEXT,
  p_email TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invitation_id UUID;
  tenant_uuid UUID;
  invitation_token TEXT;
BEGIN
  -- Get current user's tenant
  tenant_uuid := get_current_user_tenant_id();
  
  IF tenant_uuid IS NULL THEN
    RAISE EXCEPTION 'No tenant found for current user';
  END IF;
  
  -- Generate invitation token
  invitation_token := generate_invitation_token();
  
  -- Create invitation record
  INSERT INTO public.staff_invitations (
    tenant_id, employee_id, email, invitation_token, invited_by
  ) VALUES (
    tenant_uuid, p_employee_id, p_email, invitation_token, auth.uid()
  ) RETURNING id INTO invitation_id;
  
  -- Update employee record
  UPDATE public.employees 
  SET invitation_sent = true, invited_at = now()
  WHERE employee_id = p_employee_id;
  
  RETURN invitation_id;
END;
$$;