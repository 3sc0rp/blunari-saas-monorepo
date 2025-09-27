-- Fix the add_domain function to use gen_random_uuid instead of gen_random_bytes
CREATE OR REPLACE FUNCTION public.add_domain(p_tenant_id uuid, p_domain text, p_domain_type domain_type DEFAULT 'custom'::domain_type)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  domain_id UUID;
  verification_txt TEXT;
BEGIN
  -- Generate verification TXT record using gen_random_uuid
  verification_txt := 'blunari-verify=' || replace(gen_random_uuid()::text, '-', '');
  
  -- Insert domain
  INSERT INTO public.domains (
    tenant_id, domain, domain_type, verification_record
  ) VALUES (
    p_tenant_id, p_domain, p_domain_type, verification_txt
  ) RETURNING id INTO domain_id;
  
  -- Log event
  INSERT INTO public.domain_events (
    domain_id, tenant_id, event_type, event_data
  ) VALUES (
    domain_id, p_tenant_id, 'created', 
    jsonb_build_object('domain', p_domain, 'type', p_domain_type)
  );
  
  RETURN domain_id;
END;
$function$;