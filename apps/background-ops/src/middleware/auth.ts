import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

export function validateApiKey(req: Request, res: Response, next: NextFunction): void {
  logger.info('API key validation started', {
    path: req.path,
    method: req.method,
    hasAuthHeader: !!req.headers.authorization,
    hasApiKeyHeader: !!req.headers['x-api-key']
  });
  
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string;
  
  let providedKey: string | null = null;
  
  // Check for Bearer token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7);
    logger.info('Using Bearer token for authentication');
  }
  // Check for X-API-Key header
  else if (apiKey) {
    providedKey = apiKey;
    logger.info('Using X-API-Key header for authentication');
  }
  
  if (!providedKey) {
    logger.warn('API request without authentication', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'API key required. Provide via Authorization: Bearer <key> or X-API-Key header' 
    });
    return;
  }
  
  logger.info('Comparing API keys', {
    providedKeyLength: providedKey.length,
    configKeyLength: config.API_KEY.length,
    matches: providedKey === config.API_KEY
  });
  
  if (providedKey !== config.API_KEY) {
    logger.warn('Invalid API key provided', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      providedKey: providedKey.substring(0, 8) + '...'
    });
    res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Invalid API key' 
    });
    return;
  }
  
  logger.info('API key validation successful', {
    path: req.path,
    method: req.method
  });
  
  next();
}

export function optionalApiKey(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string;
  
  let providedKey: string | null = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7);
  } else if (apiKey) {
    providedKey = apiKey;
  }
  
  if (providedKey && providedKey !== config.API_KEY) {
    res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Invalid API key' 
    });
    return;
  }
  
  // Mark request as authenticated if valid key provided
  if (providedKey === config.API_KEY) {
    (req as any).authenticated = true;
  }
  
  next();
}
