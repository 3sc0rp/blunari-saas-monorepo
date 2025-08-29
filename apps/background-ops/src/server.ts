import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { setupRoutes } from './routes';
import { setupWebSocket } from './websocket';
import { startBackgroundWorkers } from './workers';
import { startScheduledJobs } from './jobs';
import { setupDatabase } from './database';
import { performanceMiddleware, performanceHeadersMiddleware } from './middleware/performance';
import { adminAuditMiddleware } from './middleware/adminAudit';
import { schedulerService } from './services/scheduler';

async function startServer() {
  try {
    // Initialize database
    await setupDatabase();
    
    // Create Express app
    const app = express();
    const server = createServer(app);
    
    // Security middleware
    app.use(helmet());
    app.use(cors({
      origin: config.ALLOWED_ORIGINS,
      credentials: true
    }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
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
    
    // Request logging
    app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
    
    // Health check
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      });
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
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
      });
    });
    
    // Start server
    const port = config.PORT;
    server.listen(port, () => {
      logger.info(`🚀 Background-Ops server running on port ${port}`);
      logger.info(`📊 Environment: ${config.NODE_ENV}`);
      logger.info(`🔗 WebSocket server ready`);
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