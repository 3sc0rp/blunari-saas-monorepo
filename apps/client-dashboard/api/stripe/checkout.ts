import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  const secret = process.env.STRIPE_SECRET_KEY;
  const priceFromEnv = process.env.STRIPE_PRICE_3D_FLOOR;
  if (!secret) return res.status(400).json({ error: 'STRIPE_NOT_CONFIGURED' });

  const feature = (req.query.feature as string) || 'three_d_floor';
  const price = (req.query.price as string) || (feature === 'three_d_floor' ? priceFromEnv : undefined);
  if (!price) return res.status(400).json({ error: 'MISSING_PRICE' });

  const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });
  try {
    // For MVP: use a generic success/cancel redirect to app home
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      success_url: `${req.headers.origin || 'https://app.blunari.ai'}/dashboard/settings?billing=success`,
      cancel_url: `${req.headers.origin || 'https://app.blunari.ai'}/dashboard/settings?billing=cancel`,
      metadata: { feature },
    });
    return res.redirect(303, session.url!);
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'CHECKOUT_FAILED' });
  }
}
