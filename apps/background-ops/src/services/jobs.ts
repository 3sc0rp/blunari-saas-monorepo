import { logger } from '../utils/logger';
import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface JobData {
  type: string;
  data?: Record<string, any>;
  priority?: number;
  delay?: number;
  attempts?: number;
}

export interface JobFilter {
  status?: string;
  type?: string;
  search?: string;
  priority?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class JobsService {
  async getJobs(filter: JobFilter = {}) {
    try {
      let query = `
        SELECT 
          id,
          job_name,
          job_type,
          status,
          priority,
          CASE 
            WHEN payload IS NULL THEN '{}'::jsonb
            ELSE payload::jsonb
          END as data,
          retry_count as attempts,
          max_retries as max_attempts,
          created_at,
          started_at,
          completed_at,
          failed_at,
          error_message
        FROM background_jobs
      `;
      
      const conditions: string[] = [];
      const values: any[] = [];
      
      if (filter.status) {
        conditions.push(`status = $${values.length + 1}`);
        values.push(filter.status);
      }
      
      if (filter.type) {
        conditions.push(`job_type = $${values.length + 1}`);
        values.push(filter.type);
      }

      if (filter.search) {
        conditions.push(`(job_name ILIKE $${values.length + 1} OR job_type ILIKE $${values.length + 1} OR error_message ILIKE $${values.length + 1})`);
        values.push(`%${filter.search}%`);
      }

      if (filter.priority !== undefined) {
        conditions.push(`priority = $${values.length + 1}`);
        values.push(filter.priority);
      }

      if (filter.startDate) {
        conditions.push(`created_at >= $${values.length + 1}`);
        values.push(filter.startDate);
      }

      if (filter.endDate) {
        conditions.push(`created_at <= $${values.length + 1}`);
        values.push(filter.endDate);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      const sortBy = filter.sortBy || 'created_at';
      const sortOrder = filter.sortOrder || 'desc';
      const allowedSortFields = ['created_at', 'priority', 'status', 'job_type', 'completed_at'];
      const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
      const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';
      
      query += ` ORDER BY ${safeSortBy} ${safeSortOrder}`;
      
      if (filter.limit) {
        query += ` LIMIT $${values.length + 1}`;
        values.push(filter.limit);
      }
      
      if (filter.offset) {
        query += ` OFFSET $${values.length + 1}`;
        values.push(filter.offset);
      }
      
      const result = await db.query(query, values);
      
      return {
        jobs: result.rows,
        total: result.rowCount
      };
    } catch (error) {
      logger.error('Error fetching jobs:', error);
      // If there's a JSON parsing error, let's try to get basic job info without the payload
      try {
        logger.warn('Falling back to basic job query without payload parsing');
        let fallbackQuery = `
          SELECT 
            id,
            job_name,
            job_type,
            status,
            priority,
            '{}' as data,
            retry_count as attempts,
            max_retries,
            created_at,
            started_at,
            completed_at,
            failed_at,
            error_message,
            result
          FROM background_jobs
        `;
        
        const conditions: string[] = [];
        const values: any[] = [];
        
        if (filter.status) {
          conditions.push(`status = $${values.length + 1}`);
          values.push(filter.status);
        }
        
        if (filter.type) {
          conditions.push(`job_type = $${values.length + 1}`);
          values.push(filter.type);
        }

        if (filter.search) {
          conditions.push(`(job_name ILIKE $${values.length + 1} OR job_type ILIKE $${values.length + 1} OR error_message ILIKE $${values.length + 1})`);
          values.push(`%${filter.search}%`);
        }

        if (filter.priority !== undefined) {
          conditions.push(`priority = $${values.length + 1}`);
          values.push(filter.priority);
        }

        if (filter.startDate) {
          conditions.push(`created_at >= $${values.length + 1}`);
          values.push(filter.startDate);
        }

        if (filter.endDate) {
          conditions.push(`created_at <= $${values.length + 1}`);
          values.push(filter.endDate);
        }
        
        if (conditions.length > 0) {
          fallbackQuery += ` WHERE ${conditions.join(' AND ')}`;
        }
        
        const sortBy = filter.sortBy || 'created_at';
        const sortOrder = filter.sortOrder || 'desc';
        const allowedSortFields = ['created_at', 'priority', 'status', 'job_type', 'completed_at'];
        const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';
        
        fallbackQuery += ` ORDER BY ${safeSortBy} ${safeSortOrder}`;
        
        if (filter.limit) {
          fallbackQuery += ` LIMIT $${values.length + 1}`;
          values.push(filter.limit);
        }
        
        if (filter.offset) {
          fallbackQuery += ` OFFSET $${values.length + 1}`;
          values.push(filter.offset);
        }
        
        const fallbackResult = await db.query(fallbackQuery, values);
        
        return {
          jobs: fallbackResult.rows,
          total: fallbackResult.rowCount
        };
      } catch (fallbackError) {
        logger.error('Fallback query also failed:', fallbackError);
        throw error;
      }
    }
  }

  async getJobById(jobId: string) {
    try {
      const query = `
        SELECT 
          id,
          job_name,
          job_type,
          status,
          priority,
          CASE 
            WHEN payload IS NULL THEN '{}'::jsonb
            ELSE payload::jsonb
          END as data,
          retry_count as attempts,
          max_retries as max_attempts,
          created_at,
          started_at,
          completed_at,
          failed_at,
          error_message,
          result
        FROM background_jobs
        WHERE id = $1
      `;
      
      const result = await db.query(query, [jobId]);
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching job by ID:', error);
      // Fallback query without payload parsing
      try {
        logger.warn('Falling back to basic job query for single job');
        const fallbackQuery = `
          SELECT 
            id,
            job_name,
            job_type,
            status,
            priority,
            '{}' as data,
            retry_count as attempts,
            max_retries as max_attempts,
            created_at,
            started_at,
            completed_at,
            failed_at,
            error_message,
            result
          FROM background_jobs
          WHERE id = $1
        `;
        
        const fallbackResult = await db.query(fallbackQuery, [jobId]);
        return fallbackResult.rows[0] || null;
      } catch (fallbackError) {
        logger.error('Fallback query for single job also failed:', fallbackError);
        throw error;
      }
    }
  }

  async createJob(jobData: JobData) {
    try {
      const id = uuidv4();
      const scheduledFor = jobData.delay 
        ? new Date(Date.now() + jobData.delay * 1000)
        : new Date();
      
      const query = `
        INSERT INTO background_jobs (
          id, job_name, job_type, payload, priority, max_retries, scheduled_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const result = await db.query(query, [
        id,
        jobData.type, // job_name - use the type as the name
        jobData.type, // job_type - also use type
        JSON.stringify(jobData.data || {}),
        jobData.priority || 5,
        jobData.attempts || 3,
        scheduledFor,
        jobData.delay ? 'scheduled' : 'pending'
      ]);
      
      logger.info(`Created job: ${jobData.type} (${id})`);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating job:', error);
      throw error;
    }
  }

  async retryJob(jobId: string) {
    try {
      const query = `
        UPDATE background_jobs
        SET 
          status = 'pending',
          retry_count = 0,
          error_message = NULL,
          failed_at = NULL,
          scheduled_at = NOW()
        WHERE id = $1 AND status = 'failed'
        RETURNING *
      `;
      
      const result = await db.query(query, [jobId]);
      
      if (result.rows.length > 0) {
        logger.info(`Retrying job: ${jobId}`);
      }
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error retrying job:', error);
      throw error;
    }
  }

  async cancelJob(jobId: string) {
    try {
      const query = `
        UPDATE background_jobs
        SET 
          status = 'cancelled',
          completed_at = NOW()
        WHERE id = $1 AND status IN ('pending', 'scheduled', 'running')
        RETURNING id
      `;
      
      const result = await db.query(query, [jobId]);
      
      if (result.rows.length > 0) {
        logger.info(`Cancelled job: ${jobId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Error cancelling job:', error);
      throw error;
    }
  }

  async getJobStats() {
    try {
      const query = `
        SELECT 
          status,
          COUNT(*) as count
        FROM background_jobs
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY status
      `;
      
      const result = await db.query(query);
      
      const stats = {
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        scheduled: 0
      };
      
      result.rows.forEach(row => {
        stats[row.status as keyof typeof stats] = parseInt(row.count);
        stats.total += parseInt(row.count);
      });
      
      return stats;
    } catch (error) {
      logger.error('Error fetching job stats:', error);
      throw error;
    }
  }

  async updateJobStatus(jobId: string, status: string, error?: string, jobResult?: any) {
    try {
      let query = `
        UPDATE background_jobs
        SET status = $2
      `;
      const values = [jobId, status];
      
      if (status === 'running') {
        query += `, started_at = NOW()`;
      } else if (status === 'completed') {
        query += `, completed_at = NOW()`;
        if (jobResult !== undefined) {
          query += `, result = $${values.length + 1}`;
          values.push(JSON.stringify(jobResult));
        }
      } else if (status === 'failed') {
        query += `, completed_at = NOW(), retry_count = retry_count + 1`;
        if (error) {
          query += `, error_message = $${values.length + 1}`;
          values.push(error);
        }
      }
      
      query += ` WHERE id = $1 RETURNING *`;
      
      const result = await db.query(query, values);
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating job status:', error);
      throw error;
    }
  }

  async getNextJob() {
    try {
      const query = `
        UPDATE background_jobs
        SET status = 'running', started_at = NOW()
        WHERE id = (
          SELECT id FROM background_jobs
          WHERE status = 'pending'
          AND scheduled_at <= NOW()
          ORDER BY priority DESC, created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *
      `;
      
      const result = await db.query(query);
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting next job:', error);
      throw error;
    }
  }
}

export const jobsService = new JobsService();