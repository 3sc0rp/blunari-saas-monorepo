import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return res.status(200).json({ entitlements: {} });

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const authHeader = String(req.headers.authorization || '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'NO_AUTH' });

    const { data } = await supabase.auth.getUser(token);
    const user = (data as any)?.user;
    const tenantId = user?.user_metadata?.tenant_id;
    if (!tenantId) return res.status(403).json({ error: 'NO_TENANT' });

    // First from tenants.settings
    try {
      const { data: t } = await supabase.from('tenants').select('settings').eq('id', tenantId).maybeSingle();
      const settings = (t as any)?.settings || {};
      const entitlements = settings?.entitlements || {};
      if (entitlements && Object.keys(entitlements).length > 0) {
        return res.status(200).json({ entitlements });
      }
    } catch {}

    // Fallback to tenant_settings key entitlements
    try {
      const { data: ts } = await supabase
        .from('tenant_settings')
        .select('setting_value')
        .eq('tenant_id', tenantId)
        .eq('setting_key', 'entitlements')
        .maybeSingle();
      const entitlements = (ts as any)?.setting_value || {};
      return res.status(200).json({ entitlements });
    } catch {}

    return res.status(200).json({ entitlements: {} });
  } catch (e) {
    return res.status(200).json({ entitlements: {} });
  }
}


