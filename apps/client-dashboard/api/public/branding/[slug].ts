import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Lightweight public branding endpoint used by the widget runtime
// Returns: { name, primaryColor?, accentColor?, logoUrl? }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS for public access, including sandboxed iframes (Origin: null)
  const origin = (req.headers.origin as string | undefined) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin === 'null' ? 'null' : origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const slug = (req.query.slug as string) || '';
  if (!slug) {
    return res.status(400).json({ error: 'Missing slug' });
  }

  try {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      // Fallback: respond with slug only to avoid failing the widget
      return res.status(200).json({ name: slug });
    }

    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Fetch minimal branding fields from tenant + optional settings
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, logo_url, primary_color, secondary_color, slug')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !tenant) {
      return res.status(200).json({ name: slug });
    }

    // Try to get accent from settings if present
    let accent: string | undefined;
    try {
      const { data: settingsRow } = await supabase
        .from('tenant_settings')
        .select('setting_value')
        .eq('tenant_id', tenant.id)
        .eq('setting_key', 'branding')
        .maybeSingle();
      const branding = settingsRow?.setting_value || null;
      if (branding && typeof branding.accentColor === 'string') {
        accent = branding.accentColor;
      }
    } catch {}

    return res.status(200).json({
      name: tenant.name || slug,
      primaryColor: tenant.primary_color || undefined,
      accentColor: accent,
      logoUrl: tenant.logo_url || undefined,
    });
  } catch (e: any) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple public branding endpoint with permissive CORS for GET
export default function handler(req: VercelRequest, res: VercelResponse) {
  const { slug } = req.query as { slug?: string };
  const origin = req.headers.origin || '*';
  const headers = {
    'Access-Control-Allow-Origin': origin || '*',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=300',
  } as Record<string, string>;

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(200).setHeader('Access-Control-Allow-Origin', headers['Access-Control-Allow-Origin']).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).setHeader('Allow', 'GET, OPTIONS').json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const s = (slug || 'demo').toString().toLowerCase();
  // Minimal demo data; replace with DB lookup as needed
  const data = {
    name: s === 'demo' ? 'Demo Restaurant' : s,
    primaryColor: '#3b82f6',
    accentColor: '#10b981',
    logoUrl: `https://app.blunari.ai/images/logo.png`,
  };
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
  return res.status(200).json(data);
}


