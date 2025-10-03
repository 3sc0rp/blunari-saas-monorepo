-- Create notification_reads table for persisting notification read state
-- This enables multi-device sync and better notification management

CREATE TABLE IF NOT EXISTS public.notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT notification_reads_unique UNIQUE (user_id, notification_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id ON public.notification_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_tenant_id ON public.notification_reads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_notification_id ON public.notification_reads(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_created_at ON public.notification_reads(created_at);

-- Enable RLS
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see and manage their own read state
CREATE POLICY "Users can view their own notification reads"
ON public.notification_reads
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can mark their own notifications as read"
ON public.notification_reads
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE tenant_users.user_id = auth.uid() 
    AND tenant_users.tenant_id = notification_reads.tenant_id 
    AND tenant_users.status = 'active'
  )
);

CREATE POLICY "Users can delete their own notification reads"
ON public.notification_reads
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Helper function: Mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_notification_id UUID,
  p_tenant_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  read_id UUID;
BEGIN
  -- Verify user has access to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = auth.uid()
    AND tenant_id = p_tenant_id
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to tenant';
  END IF;

  -- Insert or get existing read record
  INSERT INTO public.notification_reads (tenant_id, user_id, notification_id)
  VALUES (p_tenant_id, auth.uid(), p_notification_id)
  ON CONFLICT (user_id, notification_id) 
  DO UPDATE SET read_at = now()
  RETURNING id INTO read_id;

  RETURN read_id;
END;
$$;

-- Helper function: Mark multiple notifications as read
CREATE OR REPLACE FUNCTION public.mark_notifications_read(
  p_notification_ids UUID[],
  p_tenant_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inserted_count INTEGER := 0;
  notification_id UUID;
BEGIN
  -- Verify user has access to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = auth.uid()
    AND tenant_id = p_tenant_id
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to tenant';
  END IF;

  -- Insert all read records
  FOREACH notification_id IN ARRAY p_notification_ids
  LOOP
    INSERT INTO public.notification_reads (tenant_id, user_id, notification_id)
    VALUES (p_tenant_id, auth.uid(), notification_id)
    ON CONFLICT (user_id, notification_id) DO NOTHING;
    
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
  END LOOP;

  RETURN inserted_count;
END;
$$;

-- Helper function: Mark notification as unread (delete read record)
CREATE OR REPLACE FUNCTION public.mark_notification_unread(
  p_notification_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.notification_reads
  WHERE user_id = auth.uid()
  AND notification_id = p_notification_id;

  RETURN FOUND;
END;
$$;

-- Helper function: Get unread notification count for tenant
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(
  p_tenant_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  -- Verify user has access to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = auth.uid()
    AND tenant_id = p_tenant_id
    AND status = 'active'
  ) THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)::INTEGER INTO unread_count
  FROM public.notification_queue nq
  WHERE nq.tenant_id = p_tenant_id
  AND NOT EXISTS (
    SELECT 1 FROM public.notification_reads nr
    WHERE nr.notification_id = nq.id
    AND nr.user_id = auth.uid()
  );

  RETURN unread_count;
END;
$$;

-- Comment documentation
COMMENT ON TABLE public.notification_reads IS 'Tracks which notifications have been read by each user, enabling multi-device sync';
COMMENT ON FUNCTION public.mark_notification_read IS 'Mark a single notification as read for the current user';
COMMENT ON FUNCTION public.mark_notifications_read IS 'Mark multiple notifications as read for the current user';
COMMENT ON FUNCTION public.mark_notification_unread IS 'Mark a notification as unread by deleting the read record';
COMMENT ON FUNCTION public.get_unread_notification_count IS 'Get count of unread notifications for a tenant and current user';

