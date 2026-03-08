export type ShippingJobStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface ShippingJob {
  id: string;
  order_id: string;
  order_number: string;
  status: ShippingJobStatus;
  idempotency_key: string;
  locked_at: string | null;
  locked_by: string | null;
  lock_expires_at: string | null;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  last_error: string | null;
  error_details: Record<string, any> | null;
  courier_provider_id: string | null;
  shipping_method_id: string | null;
  job_payload: ShippingJobPayload;
  courier_response: CourierResponse | null;
  tracking_number: string | null;
  label_url: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
}

export interface ShippingJobPayload {
  order_id: string;
  order_number: string;
  shipping_address: ShippingAddress;
  shipping_method_id: string | null;
  total_amount: number;
  currency_code: string;
  created_by: string;
}

export interface ShippingAddress {
  full_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  phone: string;
}

export interface CourierResponse {
  tracking_number: string;
  label_url: string;
  courier_name: string;
  estimated_delivery_at: string;
  service_type?: string;
  cost?: number;
  raw_response?: Record<string, any>;
}

export interface CreateShippingJobRequest {
  order_id: string;
  courier_provider_id?: string;
  shipping_method_id?: string;
}

export interface CreateShippingJobResponse {
  job_id: string;
  order_id: string;
  order_number: string;
  status: ShippingJobStatus;
  message: string;
}

export interface AcquireJobResult {
  job_id: string;
  order_id: string;
  order_number: string;
  job_payload: ShippingJobPayload;
  retry_count: number;
  courier_provider_id: string | null;
  shipping_method_id: string | null;
  courier_request_id: string | null;
}

export interface CompleteJobRequest {
  job_id: string;
  tracking_number: string;
  label_url: string;
  courier_name: string;
  estimated_delivery_at: string;
  courier_response: CourierResponse;
}

export interface FailJobRequest {
  job_id: string;
  error_message: string;
  error_details?: Record<string, any>;
}

export interface RetryJobRequest {
  job_id: string;
}

export interface ShippingJobDashboard {
  id: string;
  order_id: string;
  order_number: string;
  status: ShippingJobStatus;
  retry_count: number;
  max_retries: number;
  last_error: string | null;
  tracking_number: string | null;
  locked_by: string | null;
  locked_at: string | null;
  lock_expires_at: string | null;
  next_retry_at: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  user_id: string;
  total_amount: number;
  customer_email: string;
  courier_provider: string | null;
}

export interface CourierApiProvider {
  id: string;
  provider_code: string;
  provider_name: string;
  api_base_url: string;
  is_active: boolean;
  is_sandbox: boolean;
  configuration: Record<string, any> | null;
}

export interface CourierCreateShipmentRequest {
  order_number: string;
  shipping_address: ShippingAddress;
  service_type?: string;
  insurance_value?: number;
  reference?: string;
}

export interface CourierCreateShipmentResponse {
  success: boolean;
  tracking_number: string;
  label_url: string;
  estimated_delivery_at: string;
  cost?: number;
  error?: string;
}

export interface WorkerConfig {
  worker_id: string;
  poll_interval_ms: number;
  lock_duration_seconds: number;
  max_concurrent_jobs: number;
  supabase_url: string;
  supabase_service_key: string;
}

export interface JobProcessingResult {
  success: boolean;
  tracking_number?: string;
  label_url?: string;
  courier_name?: string;
  estimated_delivery_at?: string;
  courier_request_id?: string;
  error?: string;
  error_details?: Record<string, any>;
}
