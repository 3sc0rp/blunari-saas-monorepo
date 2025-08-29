import cron from 'node-cron';
import { logger } from './utils/logger';
import { metricsService } from './services/metrics';
import { jobsService } from './services/jobs';
import { activityService } from './services/activity';

export function startScheduledJobs() {
  logger.info('⏰ Starting scheduled jobs...');
  
  // System metrics collection every 1 minute
  cron.schedule('* * * * *', async () => {
    try {
      await metricsService.recordSystemSnapshot();
      logger.debug('System metrics snapshot recorded');
    } catch (error) {
      logger.error('Error recording system snapshot:', error);
    }
  });
  
  // Health checks every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await jobsService.createJob({
        type: 'health_check',
        data: { check_all_services: true },
        priority: 7
      });
      logger.debug('Health check job queued');
    } catch (error) {
      logger.error('Error queuing health check:', error);
    }
  });
  
  // Cleanup old data every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      // Cleanup old activity logs
      await activityService.cleanup(cutoffDate);
      
      // Cleanup old metrics (keep last 24 hours)
      const metricsCleanupDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await jobsService.createJob({
        type: 'cleanup_old_data',
        data: { 
          table_name: 'system_metrics',
          cutoff_date: metricsCleanupDate.toISOString()
        },
        priority: 3
      });
      
      logger.info('Cleanup jobs queued');
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  });
  
  // Aggregate metrics every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      await jobsService.createJob({
        type: 'metrics_aggregation',
        data: { interval: '15m' },
        priority: 5
      });
      logger.debug('Metrics aggregation job queued');
    } catch (error) {
      logger.error('Error queuing metrics aggregation:', error);
    }
  });
  
  // Generate daily reports at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      await jobsService.createJob({
        type: 'daily_report',
        data: { 
          date: new Date().toISOString().split('T')[0],
          include_metrics: true,
          include_uptime: true,
          include_activity: true
        },
        priority: 6
      });
      logger.info('Daily report job queued');
    } catch (error) {
      logger.error('Error queuing daily report:', error);
    }
  });
  
  // Cleanup completed jobs every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      await jobsService.createJob({
        type: 'cleanup_completed_jobs',
        data: { retention_hours: 48 },
        priority: 2
      });
      logger.debug('Job cleanup queued');
    } catch (error) {
      logger.error('Error queuing job cleanup:', error);
    }
  });
  
  // Send status summary every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await activityService.logActivity({
        type: 'system_heartbeat',
        service: 'background-ops',
        message: 'System heartbeat - all scheduled jobs running',
        status: 'info',
        details: {
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory_usage: process.memoryUsage()
        }
      });
    } catch (error) {
      logger.error('Error logging heartbeat:', error);
    }
  });
  
  logger.info('✅ Scheduled jobs started');
  logger.info('📅 Active schedules:');
  logger.info('  - System metrics: Every 1 minute');
  logger.info('  - Health checks: Every 5 minutes');
  logger.info('  - Metrics aggregation: Every 15 minutes');
  logger.info('  - Data cleanup: Every hour');
  logger.info('  - Job cleanup: Every 6 hours');
  logger.info('  - Daily reports: Daily at midnight');
}
