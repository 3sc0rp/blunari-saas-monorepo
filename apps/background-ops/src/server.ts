import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config, validateSecurityConfig } from './config';
import { logger } from './utils/logger';
import { setupRoutes } from './routes';
import { setupWebSocket } from './websocket';
import { startBackgroundWorkers } from './workers';
import { startScheduledJobs } from './jobs';
import { setupDatabase } from './database';
import { performanceMiddleware, performanceHeadersMiddleware } from './middleware/performance';
import { adminAuditMiddleware } from './middleware/adminAudit';
import { initializeIdempotencyRedis } from './middleware/idempotency';
import { initializeJobService } from './services/jobs';
import { schedulerService } from './services/scheduler';

async function startServer() {
  try {
    // CRITICAL: Validate security configuration first
    validateSecurityConfig();
    
    // Initialize database
    await setupDatabase();
    
    // Initialize Redis for idempotency (optional)
    try {
      await initializeIdempotencyRedis();
    } catch (error) {
      logger.warn('Skipping idempotency Redis - not available');
    }
    
    // Initialize job service (optional)
    try {
      await initializeJobService();
    } catch (error) {
      logger.warn('Skipping job service - Redis not available');
    }
    
    // Create Express app
    const app = express();
    const server = createServer(app);
    
    // Security middleware - ENHANCED
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      xssFilter: true,
      noSniff: true,
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    }));
    
    // HTTPS enforcement in production
    if (config.NODE_ENV === 'production') {
      app.use((req, res, next) => {
        // Allow health/readiness/metrics endpoints without redirect (used by Fly checks)
        const reqPath = req.path || req.url;
        if (
          reqPath.startsWith('/health') ||
          reqPath.startsWith('/ready') ||
          reqPath.startsWith('/live') ||
          reqPath === '/metrics'
        ) {
          return next();
        }
        if (req.header('x-forwarded-proto') !== 'https') {
          return res.redirect(`https://${req.header('host')}${req.url}`);
        }
        next();
      });
    }
    
    app.use(cors({
      origin: config.ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-signature', 'x-timestamp', 'x-tenant-id', 'x-request-id', 'x-idempotency-key'],
      exposedHeaders: ['x-rate-limit-remaining', 'x-rate-limit-reset']
    }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX_REQUESTS,
      message: 'Too many requests from this IP'
    });
    app.use(limiter);
    
    // Early request logging - catch everything
    app.use((req, res, next) => {
      logger.info(`🔥 INCOMING REQUEST: ${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        headers: Object.keys(req.headers)
      });
      next();
    });
    
    // General middleware
    app.use(compression());
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    
    // Performance monitoring middleware
    app.use(performanceHeadersMiddleware);
    app.use(performanceMiddleware);
    
    // Admin audit logging middleware
    app.use(adminAuditMiddleware);
    
    // Request logging with context
    app.use((req, res, next) => {
      const requestId = req.headers['x-request-id'] as string || 'unknown';
      const tenantId = req.headers['x-tenant-id'] as string;
      
      const contextLogger = logger.child({ requestId, tenantId });
      contextLogger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
    
    // Setup routes
    setupRoutes(app);
    
    // Setup WebSocket server
    const wss = new WebSocketServer({ server });
    setupWebSocket(wss);
    
    // Start background workers
    await startBackgroundWorkers();
    
    // Initialize and start scheduler
    await schedulerService.initializeScheduler();
    
    // Start scheduled jobs
    startScheduledJobs();
    
    // Error handling
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('🔥 SERVER ERROR CAUGHT:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        headers: req.headers
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
      });
    });
    
    // Start server
    const port = config.PORT;
    const host = '0.0.0.0'; // Required for Fly.io deployment
    server.listen(port, host, () => {
      logger.info(`🚀 Background-Ops server running on ${host}:${port}`);
      logger.info(`📊 Environment: ${config.NODE_ENV}`);
      logger.info(`🔗 WebSocket server ready`);
      logger.info(`📈 Metrics endpoint: http://localhost:${port}/metrics`);
      logger.info(`🔐 API v1 endpoints: http://localhost:${port}/api/v1/`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        process.exit(0);
      });
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();