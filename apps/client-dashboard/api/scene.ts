import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireEntitlement } from '@/lib/require-entitlement';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  try {
    const { tenantId } = await requireEntitlement(req as any, 'three_d_floor');

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return res.status(200).json({ glbUrl: '', map: [] });
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const urlObj = new URL(req.url || 'http://localhost');
    const area = urlObj.searchParams.get('area') || 'main-dining';
    const slug = urlObj.searchParams.get('slug');

    // Minimal MVP: read from tenant_settings where setting_key='scene:{area}'
    let resolvedTenantId = tenantId;
    if (!resolvedTenantId && slug) {
      const { data: t } = await supabase.from('tenants').select('id').eq('slug', slug).maybeSingle();
      resolvedTenantId = t?.id || tenantId;
    }

    const { data: settingsRow } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', resolvedTenantId)
      .eq('setting_key', `scene:${area}`)
      .maybeSingle();

    const scene = (settingsRow as any)?.setting_value || { glbUrl: '', map: [] };
    return res.status(200).json(scene);
  } catch (e: any) {
    if (e instanceof Response) {
      return res.status(e.status || 403).end();
    }
    return res.status(200).json({ glbUrl: '', map: [] });
  }
}


