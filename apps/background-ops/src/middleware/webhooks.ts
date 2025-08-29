import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';

export function validateWebhookSignature(req: any, res: any, next: any) {
  const signature = req.headers['x-webhook-signature'] as string;
  const body = JSON.stringify(req.body);
  
  if (!signature) {
    logger.warn('Webhook received without signature');
    return res.status(401).json({ error: 'Missing webhook signature' });
  }
  
  try {
    const expectedSignature = crypto
      .createHmac('sha256', config.WEBHOOK_SECRET)
      .update(body, 'utf8')
      .digest('hex');
    
    const providedSignature = signature.replace('sha256=', '');
    
    if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature))) {
      logger.warn('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
    
    next();
  } catch (error) {
    logger.error('Webhook signature validation error:', error);
    return res.status(500).json({ error: 'Signature validation failed' });
  }
}