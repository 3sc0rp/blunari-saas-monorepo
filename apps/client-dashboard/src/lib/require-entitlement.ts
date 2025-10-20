import type { VercelRequest } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export async function requireEntitlement(req: VercelRequest, key: 'three_d_floor') {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Response('Forbidden', { status: 403 });
  }
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Resolve tenant from auth or query. Prefer authenticated user metadata.
  // For dashboard APIs: expect Authorization header with user, and tenant_id in user metadata.
  // For public requests: allow `tenant` query param (UUID) or `slug`.
  const authHeader = req.headers.authorization || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  let tenantId: string | null = null;
  try {
    if (bearer) {
      const { data } = await supabase.auth.getUser(bearer);
      const user = (data as any)?.user;
      tenantId = user?.user_metadata?.tenant_id || null;
    }
  } catch (error) {
    console.error('Failed to get user from bearer token:', error);
    // Continue without authenticated tenant ID
  }

  const urlObj = new URL(req.url || '', 'http://localhost');
  const searchParams = urlObj.searchParams;
  const slug = searchParams.get('slug');
  if (!tenantId && slug) {
    const { data: t } = await supabase.from('tenants').select('id').eq('slug', slug).maybeSingle();
    tenantId = t?.id || null;
  }
  const qpTenant = searchParams.get('tenant');
  if (!tenantId && qpTenant) tenantId = qpTenant;

  if (!tenantId) {
    throw new Response('Forbidden', { status: 403 });
  }

  // Read entitlements from tenant.settings JSONB or tenant_settings mirror
  let entitled = false;
  try {
    const { data: row } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .maybeSingle();
    const settings = (row as any)?.settings || {};
    entitled = settings?.entitlements?.[key] === true;
  } catch (error) {
    console.error('Failed to fetch entitlements from tenants table:', error);
    // Try fallback method
  }

  if (!entitled) {
    try {
      const { data: ts } = await supabase
        .from('tenant_settings')
        .select('setting_value')
        .eq('tenant_id', tenantId)
        .eq('setting_key', 'entitlements')
        .maybeSingle();
      const ent = (ts as any)?.setting_value || {};
      entitled = ent?.[key] === true;
    } catch (error) {
      console.error('Failed to fetch entitlements from tenant_settings table:', error);
      // entitled remains false
    }
  }

  if (!entitled) {
    throw new Response('Forbidden', { status: 403 });
  }

  return { tenantId };
}


