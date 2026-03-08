import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  AcquireJobResult,
  WorkerConfig,
  JobProcessingResult,
  CourierResponse,
  ShippingJobPayload,
} from '../lib/types/shipping';

class ShippingWorker {
  private supabase: SupabaseClient;
  private config: WorkerConfig;
  private isRunning: boolean = false;
  private currentJobs: Set<string> = new Set();

  constructor(config: WorkerConfig) {
    this.config = config;
    this.supabase = createClient(
      config.supabase_url,
      config.supabase_service_key,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  async start(): Promise<void> {
    console.log(`[Worker ${this.config.worker_id}] Starting shipping worker...`);
    console.log(`[Worker ${this.config.worker_id}] Poll interval: ${this.config.poll_interval_ms}ms`);
    console.log(`[Worker ${this.config.worker_id}] Max concurrent jobs: ${this.config.max_concurrent_jobs}`);
    
    this.isRunning = true;

    this.releaseExpiredLocks();

    while (this.isRunning) {
      try {
        if (this.currentJobs.size < this.config.max_concurrent_jobs) {
          await this.processNextJob();
        }
        
        await this.sleep(this.config.poll_interval_ms);
      } catch (error) {
        console.error(`[Worker ${this.config.worker_id}] Error in main loop:`, error);
        await this.sleep(this.config.poll_interval_ms);
      }
    }
  }

  stop(): void {
    console.log(`[Worker ${this.config.worker_id}] Stopping worker...`);
    this.isRunning = false;
  }

  private async processNextJob(): Promise<void> {
    const job = await this.acquireJob();
    
    if (!job) {
      return;
    }

    this.currentJobs.add(job.job_id);

    console.log(`[Worker ${this.config.worker_id}] Acquired job ${job.job_id} for order ${job.order_number}`);
    console.log(`[Worker ${this.config.worker_id}] Retry count: ${job.retry_count}`);

    this.processJobAsync(job).finally(() => {
      this.currentJobs.delete(job.job_id);
    });
  }

  private async processJobAsync(job: AcquireJobResult): Promise<void> {
    // Start heartbeat interval to prevent lock expiration
    const heartbeatInterval = setInterval(async () => {
      try {
        await this.sendHeartbeat(job.job_id);
      } catch (error) {
        console.error(`[Worker ${this.config.worker_id}] Heartbeat failed for job ${job.job_id}:`, error);
      }
    }, 60000); // Send heartbeat every 60 seconds

    try {
      const result = await this.callCourierApi(job);

      if (result.success) {
        await this.completeJob(job.job_id, result);
        console.log(`[Worker ${this.config.worker_id}] ✓ Job ${job.job_id} completed successfully`);
      } else {
        await this.failJob(job.job_id, result.error || 'Unknown error', result.error_details);
        console.log(`[Worker ${this.config.worker_id}] ✗ Job ${job.job_id} failed: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.failJob(job.job_id, errorMessage, { error: String(error) });
      console.error(`[Worker ${this.config.worker_id}] ✗ Job ${job.job_id} threw exception:`, error);
    } finally {
      // Stop heartbeat
      clearInterval(heartbeatInterval);
    }
  }

  private async acquireJob(): Promise<AcquireJobResult | null> {
    try {
      // Use direct SQL query instead of RPC to bypass PostgREST cache issues
      const { data, error } = await this.supabase
        .from('shipping_jobs')
        .select('*')
        .or('status.eq.pending,and(status.eq.processing,lock_expires_at.lt.now())')
        .or('next_retry_at.is.null,next_retry_at.lte.now()')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found - this is normal when queue is empty
          return null;
        }
        console.error(`[Worker ${this.config.worker_id}] Error acquiring job:`, error);
        return null;
      }

      if (!data) {
        return null;
      }

      // Manually acquire the lock
      const lockExpiresAt = new Date(Date.now() + this.config.lock_duration_seconds * 1000).toISOString();
      
      const { error: updateError } = await this.supabase
        .from('shipping_jobs')
        .update({
          status: 'processing',
          locked_at: new Date().toISOString(),
          locked_by: this.config.worker_id,
          lock_expires_at: lockExpiresAt,
          started_at: data.started_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id)
        .eq('status', data.status); // Optimistic locking

      if (updateError) {
        console.error(`[Worker ${this.config.worker_id}] Error locking job:`, updateError);
        return null;
      }

      return {
        job_id: data.id,
        order_id: data.order_id,
        order_number: data.order_number,
        job_payload: data.job_payload,
        retry_count: data.retry_count,
        courier_provider_id: data.courier_provider_id,
        shipping_method_id: data.shipping_method_id,
        courier_request_id: data.courier_request_id,
      } as AcquireJobResult;
    } catch (error) {
      console.error(`[Worker ${this.config.worker_id}] Exception acquiring job:`, error);
      return null;
    }
  }

  private async sendHeartbeat(jobId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase.rpc('update_job_heartbeat', {
        p_job_id: jobId,
        p_worker_id: this.config.worker_id,
        p_lock_duration_seconds: this.config.lock_duration_seconds,
      });

      if (error) {
        console.error(`[Worker ${this.config.worker_id}] Heartbeat error:`, error);
      } else if (data) {
        console.log(`[Worker ${this.config.worker_id}] Heartbeat sent for job ${jobId}`);
      }
    } catch (error) {
      console.error(`[Worker ${this.config.worker_id}] Heartbeat exception:`, error);
    }
  }

  private async callCourierApi(job: AcquireJobResult): Promise<JobProcessingResult> {
    console.log(`[Worker ${this.config.worker_id}] Calling courier API for job ${job.job_id}...`);

    const payload = job.job_payload;

    try {
      // Generate or use existing courier request ID for idempotency
      const courierRequestId = job.courier_request_id || `req_${job.job_id}_${Date.now()}`;
      
      // If courier_request_id exists, this might be a retry - check if shipment already exists
      if (job.courier_request_id) {
        console.log(`[Worker ${this.config.worker_id}] Retry detected, using existing request ID: ${courierRequestId}`);
      }

      // Add timeout to prevent hanging
      const result = await Promise.race([
        this.mockCourierApiCall(payload, courierRequestId),
        this.timeout(10000, 'Courier API timeout after 10 seconds')
      ]);
      
      return {
        success: true,
        tracking_number: result.tracking_number,
        label_url: result.label_url,
        courier_name: result.courier_name,
        estimated_delivery_at: result.estimated_delivery_at,
        courier_request_id: courierRequestId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Courier API call failed',
        error_details: {
          error: String(error),
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  private timeout(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  private async mockCourierApiCall(payload: ShippingJobPayload, courierRequestId: string): Promise<CourierResponse> {
    console.log(`[Worker ${this.config.worker_id}] [MOCK] Creating shipment for order ${payload.order_number}`);
    console.log(`[Worker ${this.config.worker_id}] [MOCK] Courier request ID: ${courierRequestId}`);
    
    await this.sleep(2000);

    const shouldFail = Math.random() < 0.1;
    
    if (shouldFail) {
      throw new Error('Mock courier API error: Service temporarily unavailable');
    }

    const trackingNumber = `TRACK-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const labelUrl = `https://mock-courier.example.com/labels/${trackingNumber}.pdf`;
    const estimatedDeliveryAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    return {
      tracking_number: trackingNumber,
      label_url: labelUrl,
      courier_name: 'Mock Courier Service',
      estimated_delivery_at: estimatedDeliveryAt,
      service_type: 'standard',
      cost: 15.00,
      raw_response: {
        mock: true,
        order_number: payload.order_number,
        courier_request_id: courierRequestId,
        created_at: new Date().toISOString(),
      },
    };
  }

  private async completeJob(jobId: string, result: JobProcessingResult): Promise<void> {
    try {
      // First update courier_request_id if we have it
      if (result.courier_request_id) {
        await this.supabase
          .from('shipping_jobs')
          .update({ courier_request_id: result.courier_request_id })
          .eq('id', jobId);
      }

      const { error } = await this.supabase.rpc('complete_shipping_job', {
        p_job_id: jobId,
        p_tracking_number: result.tracking_number!,
        p_label_url: result.label_url!,
        p_courier_name: result.courier_name!,
        p_estimated_delivery_at: result.estimated_delivery_at!,
        p_courier_response: {
          tracking_number: result.tracking_number,
          label_url: result.label_url,
          courier_name: result.courier_name,
          estimated_delivery_at: result.estimated_delivery_at,
          courier_request_id: result.courier_request_id,
          timestamp: new Date().toISOString(),
        },
      });

      if (error) {
        console.error(`[Worker ${this.config.worker_id}] Error completing job:`, error);
      }
    } catch (error) {
      console.error(`[Worker ${this.config.worker_id}] Exception completing job:`, error);
    }
  }

  private async failJob(
    jobId: string,
    errorMessage: string,
    errorDetails?: Record<string, any>
  ): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('fail_shipping_job', {
        p_job_id: jobId,
        p_error_message: errorMessage,
        p_error_details: errorDetails || null,
      });

      if (error) {
        console.error(`[Worker ${this.config.worker_id}] Error failing job:`, error);
      }
    } catch (error) {
      console.error(`[Worker ${this.config.worker_id}] Exception failing job:`, error);
    }
  }

  private async releaseExpiredLocks(): Promise<void> {
    try {
      const { data, error } = await this.supabase.rpc('release_expired_job_locks');

      if (error) {
        console.error(`[Worker ${this.config.worker_id}] Error releasing expired locks:`, error);
      } else if (data > 0) {
        console.log(`[Worker ${this.config.worker_id}] Released ${data} expired job locks`);
      }
    } catch (error) {
      console.error(`[Worker ${this.config.worker_id}] Exception releasing expired locks:`, error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

async function main() {
  const config: WorkerConfig = {
    worker_id: process.env.WORKER_ID || `worker-${process.pid}`,
    poll_interval_ms: parseInt(process.env.POLL_INTERVAL_MS || '5000', 10),
    lock_duration_seconds: parseInt(process.env.LOCK_DURATION_SECONDS || '300', 10),
    max_concurrent_jobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '3', 10),
    supabase_url: process.env.SUPABASE_URL!,
    supabase_service_key: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  };

  if (!config.supabase_url || !config.supabase_service_key) {
    console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
  }

  const worker = new ShippingWorker(config);

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    worker.stop();
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    worker.stop();
  });

  await worker.start();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { ShippingWorker };
