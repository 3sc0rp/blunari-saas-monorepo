import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Public branding endpoint used by the widget runtime
// Returns: { name, primaryColor?, accentColor?, logoUrl? }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string | undefined) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin === 'null' ? 'null' : origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=300');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const slug = (req.query.slug as string) || '';
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // If env not configured, return minimal safe payload instead of 500
    if (!url || !serviceKey) {
      return res.status(200).json({ name: slug });
    }

    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, logo_url, primary_color, secondary_color, slug')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle();

    if (!tenant) return res.status(200).json({ name: slug });

    let accent: string | undefined;
    try {
      const { data: settingsRow } = await supabase
        .from('tenant_settings')
        .select('setting_value')
        .eq('tenant_id', tenant.id)
        .eq('setting_key', 'branding')
        .maybeSingle();
      const branding = settingsRow?.setting_value || null;
      if (branding && typeof branding.accentColor === 'string') accent = branding.accentColor;
    } catch {}

    return res.status(200).json({
      name: tenant.name || slug,
      primaryColor: tenant.primary_color || undefined,
      accentColor: accent,
      logoUrl: tenant.logo_url || undefined,
    });
  } catch (e) {
    // Never fail the widget; return a minimal response
    return res.status(200).json({ name: slug });
  }
}


