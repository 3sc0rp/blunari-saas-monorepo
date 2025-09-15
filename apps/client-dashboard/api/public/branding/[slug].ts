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


