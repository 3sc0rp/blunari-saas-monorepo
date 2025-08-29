import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000'),
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/background_ops',
  
  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Security
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  API_KEY: process.env.API_KEY || 'your-api-key',
  
  // CORS
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:8080',
    'https://blunari.com'
  ],
  
  // External APIs
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'webhook-secret',
  
  // Monitoring
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  METRICS_ENABLED: process.env.METRICS_ENABLED === 'true',
  
  // Workers
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '5'),
  JOB_RETRY_ATTEMPTS: parseInt(process.env.JOB_RETRY_ATTEMPTS || '3'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000')
} as const;