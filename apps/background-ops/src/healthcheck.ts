import http from 'http';
import { config } from './config';
import { logger } from './utils/logger';

async function healthCheck() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`http://localhost:${config.PORT}/health`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      logger.info('Health check passed');
      process.exit(0);
    } else {
      logger.error('Health check failed - HTTP status:', response.status);
      process.exit(1);
    }
  } catch (error) {
    logger.error('Health check failed:', error);
    process.exit(1);
  }
}

healthCheck();