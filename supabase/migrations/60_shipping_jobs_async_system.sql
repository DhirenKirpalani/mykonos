-- Async Shipping Jobs System
-- Enterprise-grade job queue for courier API integration with static IP requirement
-- Supports idempotency, retry logic, exponential backoff, and concurrent worker safety

-- Add label_url field to orders table for storing shipping label
ALTER TABLE orders ADD COLUMN IF NOT EXISTS label_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_at TIMESTAMP WITH TIME ZONE;

-- Shipping jobs table - core job queue
CREATE TABLE IF NOT EXISTS shipping_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Order reference
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  
  -- Job status and lifecycle
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'success', 'failed'
  
  -- Idempotency key - prevents duplicate job creation for same order
  idempotency_key TEXT NOT NULL UNIQUE,
  
  -- Worker locking mechanism
  locked_at TIMESTAMP WITH TIME ZONE,
  locked_by TEXT, -- Worker instance ID
  lock_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Retry logic
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  
  -- Error tracking
  last_error TEXT,
  error_details JSONB,
  
  -- Courier details
  courier_provider_id UUID REFERENCES courier_api_providers(id),
  shipping_method_id UUID REFERENCES shipping_methods(id),
  
  -- Job payload (shipping details)
  job_payload JSONB NOT NULL,
  
  -- Result data from courier API
  courier_response JSONB,
  tracking_number TEXT,
  label_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_job_status CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  CONSTRAINT retry_count_valid CHECK (retry_count >= 0),
  CONSTRAINT max_retries_valid CHECK (max_retries >= 0)
);

-- Indexes for efficient job processing
CREATE INDEX IF NOT EXISTS idx_shipping_jobs_status ON shipping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_shipping_jobs_order ON shipping_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_jobs_idempotency ON shipping_jobs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_shipping_jobs_next_retry ON shipping_jobs(next_retry_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_shipping_jobs_locked ON shipping_jobs(locked_at, lock_expires_at) WHERE status = 'processing';
CREATE INDEX IF NOT EXISTS idx_shipping_jobs_created ON shipping_jobs(created_at DESC);

-- Composite index for job polling query optimization
CREATE INDEX IF NOT EXISTS idx_shipping_jobs_poll ON shipping_jobs(status, next_retry_at, locked_at) 
  WHERE status IN ('pending', 'processing');

-- Row Level Security
ALTER TABLE shipping_jobs ENABLE ROW LEVEL SECURITY;

-- Admin and inventory managers can view all jobs
CREATE POLICY "Staff can view shipping jobs" 
  ON shipping_jobs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('inventory_manager', 'admin')
    )
  );

-- Only admin and inventory managers can insert jobs
CREATE POLICY "Staff can create shipping jobs" 
  ON shipping_jobs FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('inventory_manager', 'admin')
    )
  );

-- Function to generate idempotency key for order
CREATE OR REPLACE FUNCTION generate_shipping_job_idempotency_key(
  p_order_id UUID
) RETURNS TEXT AS $$
BEGIN
  RETURN 'ship_' || p_order_id::TEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to create shipping job with idempotency protection
CREATE OR REPLACE FUNCTION create_shipping_job(
  p_order_id UUID,
  p_courier_provider_id UUID DEFAULT NULL,
  p_shipping_method_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_job_id UUID;
  v_order_number TEXT;
  v_idempotency_key TEXT;
  v_existing_job_id UUID;
  v_job_payload JSONB;
  v_order RECORD;
  v_shipping_address JSONB;
BEGIN
  -- Generate idempotency key
  v_idempotency_key := generate_shipping_job_idempotency_key(p_order_id);
  
  -- Check if job already exists (idempotency check)
  SELECT id INTO v_existing_job_id 
  FROM shipping_jobs 
  WHERE idempotency_key = v_idempotency_key;
  
  IF v_existing_job_id IS NOT NULL THEN
    -- Job already exists, return existing job ID
    RETURN v_existing_job_id;
  END IF;
  
  -- Get order details
  SELECT 
    o.order_number,
    o.shipping_address,
    o.shipping_method_id,
    o.total_amount,
    o.currency_code,
    o.user_id
  INTO v_order
  FROM orders o
  WHERE o.id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;
  
  -- Validate order is in correct state for shipping
  IF NOT EXISTS (
    SELECT 1 FROM orders 
    WHERE id = p_order_id 
    AND payment_status = 'completed'
    AND status NOT IN ('cancelled', 'refunded', 'shipped', 'delivered')
  ) THEN
    RAISE EXCEPTION 'Order % is not in a valid state for shipping', v_order.order_number;
  END IF;
  
  -- Build job payload
  v_job_payload := jsonb_build_object(
    'order_id', p_order_id,
    'order_number', v_order.order_number,
    'shipping_address', v_order.shipping_address,
    'shipping_method_id', COALESCE(p_shipping_method_id, v_order.shipping_method_id),
    'total_amount', v_order.total_amount,
    'currency_code', v_order.currency_code,
    'created_by', auth.uid()
  );
  
  -- Create shipping job
  INSERT INTO shipping_jobs (
    order_id,
    order_number,
    status,
    idempotency_key,
    courier_provider_id,
    shipping_method_id,
    job_payload,
    retry_count,
    max_retries,
    next_retry_at
  ) VALUES (
    p_order_id,
    v_order.order_number,
    'pending',
    v_idempotency_key,
    p_courier_provider_id,
    COALESCE(p_shipping_method_id, v_order.shipping_method_id),
    v_job_payload,
    0,
    5,
    NOW() -- Available immediately
  ) RETURNING id INTO v_job_id;
  
  -- Update order status to processing
  UPDATE orders 
  SET status = 'processing',
      updated_at = NOW()
  WHERE id = p_order_id;
  
  -- Add to order status history
  INSERT INTO order_status_history (order_id, status, notes, changed_by)
  VALUES (p_order_id, 'processing', 'Shipping job created', auth.uid());
  
  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to acquire next available job (with locking)
-- This implements SELECT FOR UPDATE SKIP LOCKED pattern for safe concurrent processing
CREATE OR REPLACE FUNCTION acquire_next_shipping_job(
  p_worker_id TEXT,
  p_lock_duration_seconds INTEGER DEFAULT 300
) RETURNS TABLE (
  job_id UUID,
  order_id UUID,
  order_number TEXT,
  job_payload JSONB,
  retry_count INTEGER,
  courier_provider_id UUID,
  shipping_method_id UUID
) AS $$
DECLARE
  v_lock_expires_at TIMESTAMP WITH TIME ZONE;
  v_job RECORD;
BEGIN
  v_lock_expires_at := NOW() + (p_lock_duration_seconds || ' seconds')::INTERVAL;
  
  -- Find and lock next available job
  -- Priority: pending jobs that are ready for retry
  SELECT sj.* INTO v_job
  FROM shipping_jobs sj
  WHERE sj.status = 'pending'
    AND (sj.next_retry_at IS NULL OR sj.next_retry_at <= NOW())
    AND (sj.locked_at IS NULL OR sj.lock_expires_at < NOW()) -- Not locked or lock expired
  ORDER BY sj.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED; -- Critical: prevents race conditions between workers
  
  IF NOT FOUND THEN
    RETURN; -- No jobs available
  END IF;
  
  -- Acquire lock
  UPDATE shipping_jobs
  SET 
    status = 'processing',
    locked_at = NOW(),
    locked_by = p_worker_id,
    lock_expires_at = v_lock_expires_at,
    started_at = COALESCE(started_at, NOW()),
    updated_at = NOW()
  WHERE id = v_job.id;
  
  -- Return job details
  RETURN QUERY
  SELECT 
    v_job.id,
    v_job.order_id,
    v_job.order_number,
    v_job.job_payload,
    v_job.retry_count,
    v_job.courier_provider_id,
    v_job.shipping_method_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark job as successful
CREATE OR REPLACE FUNCTION complete_shipping_job(
  p_job_id UUID,
  p_tracking_number TEXT,
  p_label_url TEXT,
  p_courier_name TEXT,
  p_estimated_delivery_at TIMESTAMP WITH TIME ZONE,
  p_courier_response JSONB
) RETURNS void AS $$
DECLARE
  v_order_id UUID;
BEGIN
  -- Get order ID
  SELECT order_id INTO v_order_id FROM shipping_jobs WHERE id = p_job_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shipping job not found: %', p_job_id;
  END IF;
  
  -- Update job status
  UPDATE shipping_jobs
  SET 
    status = 'success',
    tracking_number = p_tracking_number,
    label_url = p_label_url,
    courier_response = p_courier_response,
    completed_at = NOW(),
    updated_at = NOW(),
    locked_at = NULL,
    locked_by = NULL,
    lock_expires_at = NULL
  WHERE id = p_job_id;
  
  -- Update order with shipping details
  UPDATE orders
  SET 
    status = 'shipped',
    tracking_number = p_tracking_number,
    label_url = p_label_url,
    courier_name = p_courier_name,
    estimated_delivery_at = p_estimated_delivery_at,
    shipped_at = NOW(),
    updated_at = NOW()
  WHERE id = v_order_id;
  
  -- Add tracking event
  INSERT INTO shipment_tracking_events (
    order_id,
    event_type,
    event_status,
    event_description,
    event_timestamp
  ) VALUES (
    v_order_id,
    'label_created',
    'shipped',
    'Shipping label created and order shipped',
    NOW()
  );
  
  -- Add to order status history
  INSERT INTO order_status_history (order_id, status, notes)
  VALUES (v_order_id, 'shipped', 'Shipment processed successfully. Tracking: ' || p_tracking_number);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark job as failed with retry logic
CREATE OR REPLACE FUNCTION fail_shipping_job(
  p_job_id UUID,
  p_error_message TEXT,
  p_error_details JSONB DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_retry_count INTEGER;
  v_max_retries INTEGER;
  v_next_retry_at TIMESTAMP WITH TIME ZONE;
  v_backoff_seconds INTEGER;
  v_order_id UUID;
BEGIN
  -- Get current retry count and order ID
  SELECT retry_count, max_retries, order_id 
  INTO v_retry_count, v_max_retries, v_order_id
  FROM shipping_jobs 
  WHERE id = p_job_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shipping job not found: %', p_job_id;
  END IF;
  
  -- Increment retry count
  v_retry_count := v_retry_count + 1;
  
  -- Calculate exponential backoff: 2^retry_count minutes (capped at 60 minutes)
  v_backoff_seconds := LEAST(POWER(2, v_retry_count) * 60, 3600);
  v_next_retry_at := NOW() + (v_backoff_seconds || ' seconds')::INTERVAL;
  
  -- Check if we've exceeded max retries
  IF v_retry_count >= v_max_retries THEN
    -- Mark as permanently failed
    UPDATE shipping_jobs
    SET 
      status = 'failed',
      retry_count = v_retry_count,
      last_error = p_error_message,
      error_details = p_error_details,
      failed_at = NOW(),
      updated_at = NOW(),
      locked_at = NULL,
      locked_by = NULL,
      lock_expires_at = NULL
    WHERE id = p_job_id;
    
    -- Update order status
    UPDATE orders
    SET 
      status = 'processing',
      internal_notes = COALESCE(internal_notes || E'\n\n', '') || 
        'Shipping failed after ' || v_retry_count || ' attempts: ' || p_error_message,
      updated_at = NOW()
    WHERE id = v_order_id;
    
    -- Add note to order
    INSERT INTO order_notes (order_id, note, created_by)
    VALUES (
      v_order_id, 
      'Shipping job failed permanently: ' || p_error_message,
      (SELECT created_by FROM (SELECT (job_payload->>'created_by')::UUID as created_by FROM shipping_jobs WHERE id = p_job_id) sub)
    );
  ELSE
    -- Mark for retry
    UPDATE shipping_jobs
    SET 
      status = 'pending',
      retry_count = v_retry_count,
      last_error = p_error_message,
      error_details = p_error_details,
      next_retry_at = v_next_retry_at,
      updated_at = NOW(),
      locked_at = NULL,
      locked_by = NULL,
      lock_expires_at = NULL
    WHERE id = p_job_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually retry a failed job
CREATE OR REPLACE FUNCTION retry_shipping_job(
  p_job_id UUID
) RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Check permission
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_user_id 
    AND role IN ('inventory_manager', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only inventory managers can retry shipping jobs';
  END IF;
  
  -- Reset job to pending
  UPDATE shipping_jobs
  SET 
    status = 'pending',
    next_retry_at = NOW(),
    locked_at = NULL,
    locked_by = NULL,
    lock_expires_at = NULL,
    updated_at = NOW()
  WHERE id = p_job_id
    AND status IN ('failed', 'processing');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found or cannot be retried';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release stuck jobs (locks that have expired)
CREATE OR REPLACE FUNCTION release_expired_job_locks() RETURNS INTEGER AS $$
DECLARE
  v_released_count INTEGER;
BEGIN
  UPDATE shipping_jobs
  SET 
    status = 'pending',
    locked_at = NULL,
    locked_by = NULL,
    lock_expires_at = NULL,
    updated_at = NOW()
  WHERE status = 'processing'
    AND lock_expires_at < NOW();
  
  GET DIAGNOSTICS v_released_count = ROW_COUNT;
  
  RETURN v_released_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for job monitoring dashboard
CREATE OR REPLACE VIEW shipping_jobs_dashboard AS
SELECT 
  sj.id,
  sj.order_id,
  sj.order_number,
  sj.status,
  sj.retry_count,
  sj.max_retries,
  sj.last_error,
  sj.tracking_number,
  sj.locked_by,
  sj.locked_at,
  sj.lock_expires_at,
  sj.next_retry_at,
  sj.created_at,
  sj.started_at,
  sj.completed_at,
  sj.failed_at,
  o.user_id,
  o.total_amount,
  u.email as customer_email,
  cap.provider_name as courier_provider
FROM shipping_jobs sj
JOIN orders o ON o.id = sj.order_id
JOIN users u ON u.id = o.user_id
LEFT JOIN courier_api_providers cap ON cap.id = sj.courier_provider_id
ORDER BY sj.created_at DESC;

-- Comments for documentation
COMMENT ON TABLE shipping_jobs IS 'Async job queue for shipping label creation via courier APIs. Supports idempotency, retries, and concurrent worker processing.';
COMMENT ON COLUMN shipping_jobs.idempotency_key IS 'Unique key per order to prevent duplicate job creation';
COMMENT ON COLUMN shipping_jobs.locked_at IS 'Timestamp when job was locked by a worker';
COMMENT ON COLUMN shipping_jobs.locked_by IS 'Worker instance ID that locked this job';
COMMENT ON COLUMN shipping_jobs.lock_expires_at IS 'When the lock expires, allowing other workers to pick it up';
COMMENT ON COLUMN shipping_jobs.next_retry_at IS 'Earliest time this job can be retried (implements exponential backoff)';
