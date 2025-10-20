import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

interface AuthUser {
  user_metadata?: {
    tenant_id?: string;
  };
}

interface AuthResponse {
  user?: AuthUser;
}

interface TenantSettings {
  entitlements?: Record<string, boolean | string | number>;
  [key: string]: unknown;
}

interface TenantRow {
  settings?: TenantSettings;
}

interface TenantSettingRow {
  setting_value?: Record<string, boolean | string | number>;
}

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
    const user = (data as AuthResponse)?.user;
    const tenantId = user?.user_metadata?.tenant_id;
    if (!tenantId) return res.status(403).json({ error: 'NO_TENANT' });

    // First from tenants.settings
    try {
      const { data: t } = await supabase.from('tenants').select('settings').eq('id', tenantId).maybeSingle();
      const tenantRow = t as TenantRow | null;
      const settings = tenantRow?.settings || {};
      const entitlements = settings?.entitlements || {};
      if (entitlements && Object.keys(entitlements).length > 0) {
        return res.status(200).json({ entitlements });
      }
    } catch (error) {
      console.error('Failed to fetch tenant settings:', error);
      // Continue to fallback
    }

    // Fallback to tenant_settings key entitlements
    try {
      const { data: ts } = await supabase
        .from('tenant_settings')
        .select('setting_value')
        .eq('tenant_id', tenantId)
        .eq('setting_key', 'entitlements')
        .maybeSingle();
      const settingRow = ts as TenantSettingRow | null;
      const entitlements = settingRow?.setting_value || {};
      return res.status(200).json({ entitlements });
    } catch (error) {
      console.error('Failed to fetch tenant_settings entitlements:', error);
      // Return empty entitlements
    }

    return res.status(200).json({ entitlements: {} });
  } catch (e) {
    return res.status(200).json({ entitlements: {} });
  }
}


