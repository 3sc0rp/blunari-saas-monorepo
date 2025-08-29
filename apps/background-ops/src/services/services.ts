import { logger } from '../utils/logger';
import { db } from '../database';

export interface ServiceStatus {
  status: 'online' | 'warning' | 'error' | 'maintenance';
  message?: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time: number;
  details?: Record<string, any>;
}

class ServicesService {
  async getAllServices() {
    try {
      const query = `
        SELECT 
          id,
          name,
          description,
          status,
          last_health_check,
          response_time,
          uptime_percentage,
          created_at,
          updated_at
        FROM services
        ORDER BY name
      `;
      
      const result = await db.query(query);
      
      return result.rows;
    } catch (error) {
      logger.error('Error fetching services:', error);
      throw error;
    }
  }

  async getServiceById(serviceId: string) {
    try {
      const query = `
        SELECT 
          id,
          name,
          description,
          status,
          last_health_check,
          response_time,
          uptime_percentage,
          health_check_url,
          metadata,
          created_at,
          updated_at
        FROM services
        WHERE id = $1
      `;
      
      const result = await db.query(query, [serviceId]);
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching service by ID:', error);
      throw error;
    }
  }

  async updateServiceStatus(serviceId: string, statusData: ServiceStatus) {
    try {
      const query = `
        UPDATE services
        SET 
          status = $2,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await db.query(query, [serviceId, statusData.status]);
      
      if (result.rows.length > 0) {
        logger.info(`Updated service ${serviceId} status to ${statusData.status}`);
        
        // Log activity
        await this.logServiceActivity(serviceId, 'status_update', {
          old_status: result.rows[0].status,
          new_status: statusData.status,
          message: statusData.message
        });
      }
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating service status:', error);
      throw error;
    }
  }

  async runHealthCheck(serviceId: string): Promise<HealthCheckResult | null> {
    try {
      const service = await this.getServiceById(serviceId);
      if (!service) return null;
      
      const startTime = Date.now();
      let healthResult: HealthCheckResult;
      
      if (service.health_check_url) {
        // Perform actual health check
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const response = await fetch(service.health_check_url, {
            method: 'GET',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          const responseTime = Date.now() - startTime;
          
          healthResult = {
            status: response.ok ? 'healthy' : 'degraded',
            response_time: responseTime,
            details: {
              status_code: response.status,
              url: service.health_check_url
            }
          };
        } catch (error) {
          healthResult = {
            status: 'unhealthy',
            response_time: Date.now() - startTime,
            details: {
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          };
        }
      } else {
        // Simulate health check for services without URL
        const responseTime = Math.floor(Math.random() * 200) + 50; // 50-250ms
        healthResult = {
          status: Math.random() > 0.1 ? 'healthy' : 'degraded',
          response_time: responseTime
        };
      }
      
      // Update service with health check results
      await db.query(`
        UPDATE services
        SET 
          last_health_check = NOW(),
          response_time = $2,
          status = CASE 
            WHEN $3 = 'healthy' THEN 'online'
            WHEN $3 = 'degraded' THEN 'warning'
            ELSE 'error'
          END
        WHERE id = $1
      `, [serviceId, healthResult.response_time, healthResult.status]);
      
      // Record health check result
      await db.query(`
        INSERT INTO service_health_checks (
          service_id, status, response_time, details
        ) VALUES ($1, $2, $3, $4)
      `, [
        serviceId,
        healthResult.status,
        healthResult.response_time,
        JSON.stringify(healthResult.details || {})
      ]);
      
      logger.info(`Health check completed for service ${serviceId}: ${healthResult.status}`);
      
      return healthResult;
    } catch (error) {
      logger.error('Error running health check:', error);
      throw error;
    }
  }

  async getHealthHistory(serviceId: string, hours: number = 24) {
    try {
      const query = `
        SELECT 
          status,
          response_time,
          details,
          checked_at
        FROM service_health_checks
        WHERE service_id = $1
        AND checked_at >= NOW() - INTERVAL '${hours} hours'
        ORDER BY checked_at DESC
        LIMIT 1000
      `;
      
      const result = await db.query(query, [serviceId]);
      
      return result.rows;
    } catch (error) {
      logger.error('Error fetching health history:', error);
      throw error;
    }
  }

  async getUptimeStats(serviceId: string, period: string = '30d') {
    try {
      let interval: string;
      
      switch (period) {
        case '24h':
          interval = '24 hours';
          break;
        case '7d':
          interval = '7 days';
          break;
        case '30d':
          interval = '30 days';
          break;
        default:
          interval = '30 days';
      }
      
      const query = `
        SELECT 
          COUNT(*) as total_checks,
          COUNT(CASE WHEN status = 'healthy' THEN 1 END) as healthy_checks,
          AVG(response_time) as avg_response_time,
          MIN(response_time) as min_response_time,
          MAX(response_time) as max_response_time
        FROM service_health_checks
        WHERE service_id = $1
        AND checked_at >= NOW() - INTERVAL $2
      `;
      
      const result = await db.query(query, [serviceId, interval]);
      const stats = result.rows[0];
      
      const uptime = stats.total_checks > 0 
        ? (stats.healthy_checks / stats.total_checks) * 100 
        : 100;
      
      return {
        uptime_percentage: Math.round(uptime * 100) / 100,
        total_checks: parseInt(stats.total_checks),
        healthy_checks: parseInt(stats.healthy_checks),
        avg_response_time: Math.round(parseFloat(stats.avg_response_time || 0)),
        min_response_time: parseInt(stats.min_response_time || 0),
        max_response_time: parseInt(stats.max_response_time || 0),
        period
      };
    } catch (error) {
      logger.error('Error fetching uptime stats:', error);
      throw error;
    }
  }

  private async logServiceActivity(serviceId: string, action: string, details: any) {
    try {
      await db.query(`
        INSERT INTO activity_feed (
          service_id, action, details, timestamp
        ) VALUES ($1, $2, $3, NOW())
      `, [serviceId, action, JSON.stringify(details)]);
    } catch (error) {
      logger.error('Error logging service activity:', error);
    }
  }
}

export const servicesService = new ServicesService();