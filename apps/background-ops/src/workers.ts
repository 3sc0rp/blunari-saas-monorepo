import { logger } from './utils/logger';
import { jobsService } from './services/jobs';
import { metricsService } from './services/metrics';
import { config } from './config';

let isWorkerRunning = false;
let metricsInterval: NodeJS.Timeout;

export async function startBackgroundWorkers() {
  if (isWorkerRunning) {
    logger.warn('Background workers already running');
    return;
  }
  
  isWorkerRunning = true;
  logger.info('🔄 Starting background workers...');
  
  // Start job processor
  startJobProcessor();
  
  // Start system metrics collection
  startMetricsCollection();
  
  logger.info('✅ Background workers started');
}

function startJobProcessor() {
  const processJobs = async () => {
    if (!isWorkerRunning) return;
    
    try {
      const job = await jobsService.getNextJob();
      
      if (job) {
        logger.info(`Processing job: ${job.job_type} (${job.id})`);
        await processJob(job);
      }
      
      // Continue processing
      setTimeout(processJobs, 1000); // Check for jobs every second
    } catch (error) {
      logger.error('Job processor error:', error);
      setTimeout(processJobs, 5000); // Wait 5 seconds on error
    }
  };
  
  // Start multiple workers for concurrency
  for (let i = 0; i < config.WORKER_CONCURRENCY; i++) {
    processJobs();
    logger.info(`Worker ${i + 1} started`);
  }
}

function startMetricsCollection() {
  // Record system metrics every 30 seconds
  metricsInterval = setInterval(async () => {
    try {
      await metricsService.recordSystemSnapshot();
    } catch (error) {
      logger.error('Error recording system metrics:', error);
    }
  }, 30000); // 30 seconds
  
  logger.info('📊 System metrics collection started (30s interval)');
}

async function processJob(job: any) {
  try {
    let result: any;
    let parsedPayload: any = {};
    
    // Safely parse the payload
    if (job.payload) {
      try {
        if (typeof job.payload === 'string') {
          parsedPayload = JSON.parse(job.payload);
        } else if (typeof job.payload === 'object') {
          parsedPayload = job.payload;
        }
      } catch (parseError) {
        logger.warn(`Failed to parse job payload for ${job.job_type}:`, parseError);
        parsedPayload = {};
      }
    }
    
    switch (job.job_type) {
      case 'metrics_collection':
        result = await processMetricsCollection(parsedPayload);
        break;
        
      case 'health_check':
        result = await processHealthCheck(parsedPayload);
        break;
        
      case 'email_notification':
        result = await processEmailNotification(parsedPayload);
        break;
        
      case 'data_export':
        result = await processDataExport(parsedPayload);
        break;
        
      case 'cleanup_old_data':
        result = await processCleanupOldData(parsedPayload);
        break;
        
      case 'webhook_delivery':
        result = await processWebhookDelivery(parsedPayload);
        break;
        
      case 'metrics_aggregation':
        result = await processMetricsAggregation(parsedPayload);
        break;
        
      case 'daily_report':
        result = await processDailyReport(parsedPayload);
        break;
        
      case 'cleanup_completed_jobs':
        result = await processCleanupCompletedJobs(parsedPayload);
        break;
        
      default:
        throw new Error(`Unknown job type: ${job.job_type}`);
    }
    
    await jobsService.updateJobStatus(job.id, 'completed', undefined, result);
    logger.info(`Job completed: ${job.job_type} (${job.id})`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (job.retry_count < job.max_retries) {
      // Retry the job
      await jobsService.updateJobStatus(job.id, 'pending', errorMessage);
      logger.warn(`Job failed, will retry: ${job.job_type} (${job.id}) - ${errorMessage}`);
    } else {
      // Mark as failed
      await jobsService.updateJobStatus(job.id, 'failed', errorMessage);
      logger.error(`Job failed permanently: ${job.job_type} (${job.id}) - ${errorMessage}`);
    }
  }
}

async function processMetricsCollection(data: any) {
  // Simulate metrics collection
  const metrics = [
    { name: 'cpu_usage', value: Math.random() * 100, unit: 'percent' },
    { name: 'memory_usage', value: Math.random() * 8192, unit: 'mb' },
    { name: 'disk_usage', value: Math.random() * 100, unit: 'percent' },
    { name: 'network_io', value: Math.random() * 1000, unit: 'mbps' }
  ];
  
  // In real implementation, this would collect actual system metrics
  logger.info('Collected system metrics', { count: metrics.length });
  
  return { metrics_collected: metrics.length };
}

async function processHealthCheck(data: any) {
  const { service_id, url, check_all_services } = data;
  
  try {
    if (check_all_services) {
      // This is a general health check job - simulate checking system health
      const systemHealth = {
        service_id: 'background-ops',
        status: 'healthy',
        response_time: Math.floor(Math.random() * 100) + 10,
        checks: {
          database: 'healthy',
          redis: 'healthy',
          workers: 'healthy'
        }
      };
      
      logger.info('System health check completed', systemHealth);
      return systemHealth;
    } else if (service_id || url) {
      // This is a specific service health check
      const startTime = Date.now();
      
      if (url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, { 
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const responseTime = Date.now() - startTime;
        const isHealthy = response.ok;
        
        return {
          service_id,
          status: isHealthy ? 'healthy' : 'unhealthy',
          response_time: responseTime,
          status_code: response.status
        };
      } else {
        // Simulate for services without URL
        return {
          service_id,
          status: Math.random() > 0.1 ? 'healthy' : 'unhealthy',
          response_time: Math.floor(Math.random() * 200) + 50
        };
      }
    } else {
      // Default case - just return healthy
      return {
        status: 'healthy',
        response_time: Math.floor(Math.random() * 50) + 10
      };
    }
  } catch (error) {
    return {
      service_id,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function processEmailNotification(data: any) {
  const { to, subject, body, template } = data;
  
  // Simulate email sending
  logger.info(`Sending email to ${to}: ${subject}`);
  
  // In real implementation, integrate with email service (SendGrid, SES, etc.)
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    delivered: true,
    message_id: `msg_${Date.now()}`,
    recipient: to
  };
}

async function processDataExport(data: any) {
  const { export_type, date_range, format } = data;
  
  logger.info(`Processing data export: ${export_type} (${format})`);
  
  // Simulate data export processing
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  return {
    export_type,
    format,
    file_size: Math.floor(Math.random() * 10000000), // Random file size
    download_url: `https://exports.example.com/export_${Date.now()}.${format}`
  };
}

async function processCleanupOldData(data: any) {
  const { table_name, retention_days } = data;
  
  logger.info(`Cleaning up old data from ${table_name} (${retention_days} days)`);
  
  // Simulate cleanup
  const deletedRecords = Math.floor(Math.random() * 1000);
  
  return {
    table_name,
    deleted_records: deletedRecords,
    retention_days
  };
}

async function processWebhookDelivery(data: any) {
  const { url, payload, retry_count = 0 } = data;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Background-Ops-Webhook/1.0'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    return {
      delivered: response.ok,
      status_code: response.status,
      retry_count,
      url
    };
  } catch (error) {
    throw new Error(`Webhook delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function processMetricsAggregation(data: any) {
  const { interval } = data;
  
  logger.info(`Processing metrics aggregation for ${interval} interval`);
  
  // Simulate metrics aggregation
  const aggregated = {
    interval,
    metrics_processed: Math.floor(Math.random() * 1000),
    aggregation_time: Math.floor(Math.random() * 5000),
    timestamp: new Date().toISOString()
  };
  
  return aggregated;
}

async function processDailyReport(data: any) {
  const { date, include_metrics, include_uptime, include_activity } = data;
  
  logger.info(`Generating daily report for ${date}`);
  
  // Simulate report generation
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const report = {
    date,
    includes: { include_metrics, include_uptime, include_activity },
    generated_at: new Date().toISOString(),
    report_size: Math.floor(Math.random() * 100000),
    sections: ['summary', 'metrics', 'uptime', 'activity'].filter(Boolean)
  };
  
  return report;
}

async function processCleanupCompletedJobs(data: any) {
  const { retention_hours } = data;
  
  logger.info(`Cleaning up completed jobs older than ${retention_hours} hours`);
  
  // Simulate cleanup - in real implementation this would clean the database
  const deletedCount = Math.floor(Math.random() * 100);
  
  return {
    retention_hours,
    deleted_jobs: deletedCount,
    cleanup_time: new Date().toISOString()
  };
}

export function stopBackgroundWorkers() {
  isWorkerRunning = false;
  
  if (metricsInterval) {
    clearInterval(metricsInterval);
  }
  
  logger.info('🛑 Background workers stopped');
}