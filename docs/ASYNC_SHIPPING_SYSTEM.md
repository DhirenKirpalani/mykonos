# Async Shipping System Documentation

## Overview

This is an enterprise-grade async shipping job queue system designed to handle courier API integrations that require static IP whitelisting. The system ensures that shipping label creation happens asynchronously, outside of the Vercel serverless environment, on a dedicated server with a static IP address.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PUBLIC WEBSITE                          │
│                        (Vercel - Next.js)                       │
│                                                                 │
│  Customer → Checkout → Payment → Order Created (status: paid)  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                          ADMIN CMS                              │
│                        (Vercel - Next.js)                       │
│                                                                 │
│  Admin → "Fulfill Order" → Create Shipping Job → Return        │
│                              ↓                                  │
│                    shipping_jobs table                          │
│                    (status: pending)                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      SHIPPING WORKER                            │
│              (DigitalOcean/Railway - Static IP)                 │
│                                                                 │
│  1. Poll shipping_jobs table                                   │
│  2. Lock job (SELECT FOR UPDATE SKIP LOCKED)                   │
│  3. Call Courier API (with static IP)                          │
│  4. On Success:                                                │
│     - Update order (tracking, label_url, status: shipped)      │
│     - Mark job as success                                      │
│  5. On Failure:                                                │
│     - Increment retry_count                                    │
│     - Apply exponential backoff                                │
│     - Retry or mark as failed                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

### ✅ Idempotency Protection
- Each order can only have ONE shipping job (enforced by unique `idempotency_key`)
- Prevents duplicate shipments even if "Fulfill" is clicked multiple times
- Uses `ship_{order_id}` as the idempotency key

### ✅ Safe Concurrent Processing
- Uses PostgreSQL `SELECT FOR UPDATE SKIP LOCKED` pattern
- Multiple workers can run simultaneously without conflicts
- Jobs are locked during processing with expiration timestamps

### ✅ Exponential Backoff Retry Logic
- Failed jobs automatically retry with increasing delays
- Backoff formula: `2^retry_count * 60 seconds` (capped at 60 minutes)
- Configurable max retries (default: 5)

### ✅ Job Persistence
- Jobs survive server restarts
- Lock expiration ensures stuck jobs are released
- Complete audit trail of all attempts

### ✅ Manual Retry Capability
- Admin can manually retry failed jobs from CMS
- Useful for transient API failures or configuration issues

### ✅ No Public Endpoints
- Worker service has no HTTP server
- Only polls database and calls courier API
- Secure by design

## Database Schema

### shipping_jobs Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `order_id` | UUID | Reference to orders table |
| `order_number` | TEXT | Denormalized for quick lookup |
| `status` | TEXT | `pending`, `processing`, `success`, `failed` |
| `idempotency_key` | TEXT | Unique key: `ship_{order_id}` |
| `locked_at` | TIMESTAMP | When job was locked by worker |
| `locked_by` | TEXT | Worker instance ID |
| `lock_expires_at` | TIMESTAMP | When lock expires |
| `retry_count` | INTEGER | Current retry attempt |
| `max_retries` | INTEGER | Maximum retry attempts (default: 5) |
| `next_retry_at` | TIMESTAMP | Earliest time for next retry |
| `last_error` | TEXT | Last error message |
| `error_details` | JSONB | Detailed error information |
| `courier_provider_id` | UUID | Courier API provider |
| `shipping_method_id` | UUID | Shipping method |
| `job_payload` | JSONB | Complete shipping details |
| `courier_response` | JSONB | Response from courier API |
| `tracking_number` | TEXT | Tracking number from courier |
| `label_url` | TEXT | Shipping label PDF URL |
| `created_at` | TIMESTAMP | Job creation time |
| `updated_at` | TIMESTAMP | Last update time |
| `started_at` | TIMESTAMP | First processing attempt |
| `completed_at` | TIMESTAMP | Successful completion time |
| `failed_at` | TIMESTAMP | Permanent failure time |

### Key Indexes

```sql
-- Efficient job polling
CREATE INDEX idx_shipping_jobs_poll ON shipping_jobs(status, next_retry_at, locked_at);

-- Idempotency lookup
CREATE INDEX idx_shipping_jobs_idempotency ON shipping_jobs(idempotency_key);

-- Order lookup
CREATE INDEX idx_shipping_jobs_order ON shipping_jobs(order_id);
```

## API Endpoints

### POST /api/admin/shipping/fulfill
Create a shipping job for an order.

**Request:**
```json
{
  "order_id": "uuid",
  "courier_provider_id": "uuid (optional)",
  "shipping_method_id": "uuid (optional)"
}
```

**Response:**
```json
{
  "job_id": "uuid",
  "order_id": "uuid",
  "order_number": "ORD-123",
  "status": "pending",
  "message": "Shipping job created successfully"
}
```

### POST /api/admin/shipping/retry
Manually retry a failed or stuck job.

**Request:**
```json
{
  "job_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Job queued for retry"
}
```

## Worker Service Deployment

### Prerequisites
- Node.js 18+
- Server with static IP (DigitalOcean, Railway, AWS EC2, etc.)
- Supabase service role key

### Environment Variables

Create `/worker/.env`:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Worker Configuration
WORKER_ID=shipping-worker-1
POLL_INTERVAL_MS=5000
LOCK_DURATION_SECONDS=300
MAX_CONCURRENT_JOBS=3

# Courier API Configuration
COURIER_API_KEY=your-courier-api-key
COURIER_API_SECRET=your-courier-api-secret
COURIER_API_BASE_URL=https://api.courier.com/v1
```

### Installation

```bash
cd worker
npm install
npm run build
```

### Running the Worker

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

**With PM2 (recommended):**
```bash
npm install -g pm2
pm2 start dist/shipping-worker.js --name shipping-worker
pm2 save
pm2 startup
```

### Docker Deployment

Create `worker/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

CMD ["node", "dist/shipping-worker.js"]
```

Build and run:
```bash
docker build -t shipping-worker .
docker run -d --env-file .env --restart unless-stopped shipping-worker
```

### Railway Deployment

1. Create new project in Railway
2. Connect your GitHub repository
3. Set root directory to `/worker`
4. Add environment variables
5. Deploy

Railway will automatically assign a static IP that you can whitelist with your courier.

### DigitalOcean Deployment

1. Create a Droplet (Ubuntu 22.04)
2. Install Node.js 18+
3. Clone repository
4. Install dependencies
5. Configure PM2
6. Note the Droplet's static IP
7. Whitelist IP with courier provider

## Monitoring & Observability

### Admin Dashboard

Access the shipping jobs dashboard at:
```
/cms/shipping-jobs
```

Features:
- Real-time job status overview
- Success/failure statistics
- Manual retry capability
- Error message display
- Job history

### Database Queries

**Check pending jobs:**
```sql
SELECT * FROM shipping_jobs 
WHERE status = 'pending' 
ORDER BY created_at ASC;
```

**Check failed jobs:**
```sql
SELECT order_number, last_error, retry_count, failed_at 
FROM shipping_jobs 
WHERE status = 'failed' 
ORDER BY failed_at DESC;
```

**Check stuck jobs (expired locks):**
```sql
SELECT * FROM shipping_jobs 
WHERE status = 'processing' 
AND lock_expires_at < NOW();
```

**Release stuck jobs:**
```sql
SELECT release_expired_job_locks();
```

### Logs

Worker logs include:
- Job acquisition
- Courier API calls
- Success/failure outcomes
- Retry attempts
- Error details

Example log output:
```
[Worker shipping-worker-1] Starting shipping worker...
[Worker shipping-worker-1] Poll interval: 5000ms
[Worker shipping-worker-1] Max concurrent jobs: 3
[Worker shipping-worker-1] Acquired job abc-123 for order ORD-20260303-A1B2
[Worker shipping-worker-1] Retry count: 0
[Worker shipping-worker-1] Calling courier API for job abc-123...
[Worker shipping-worker-1] ✓ Job abc-123 completed successfully
```

## Courier Integration

### Mock Implementation

The worker includes a mock courier API implementation for testing:

```typescript
private async mockCourierApiCall(payload: ShippingJobPayload): Promise<CourierResponse> {
  // Simulates 2-second API call
  await this.sleep(2000);
  
  // 10% random failure for testing retry logic
  const shouldFail = Math.random() < 0.1;
  if (shouldFail) {
    throw new Error('Mock courier API error: Service temporarily unavailable');
  }
  
  return {
    tracking_number: `TRACK-${Date.now()}-${randomString}`,
    label_url: `https://mock-courier.example.com/labels/${trackingNumber}.pdf`,
    courier_name: 'Mock Courier Service',
    estimated_delivery_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
```

### Real Courier Integration

Replace the mock implementation with actual courier API calls:

```typescript
private async callCourierApi(job: AcquireJobResult): Promise<JobProcessingResult> {
  const payload = job.job_payload;
  
  try {
    // Example: Biteship API integration
    const response = await fetch(`${COURIER_API_BASE_URL}/shipments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COURIER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        origin_contact_name: 'Your Store',
        origin_address: 'Your warehouse address',
        destination_contact_name: payload.shipping_address.full_name,
        destination_address: payload.shipping_address.address_line1,
        destination_city: payload.shipping_address.city,
        destination_postal_code: payload.shipping_address.postal_code,
        destination_country: payload.shipping_address.country,
        destination_phone: payload.shipping_address.phone,
        courier_code: 'jne',
        courier_service_code: 'reg',
        items: [{
          name: `Order ${payload.order_number}`,
          value: payload.total_amount,
        }],
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Courier API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      tracking_number: data.tracking_number,
      label_url: data.label_url,
      courier_name: data.courier_name,
      estimated_delivery_at: data.estimated_delivery_at,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Courier API call failed',
      error_details: { error: String(error) },
    };
  }
}
```

## Scaling Considerations

### Current Architecture (Good for 0-10K orders/day)
- Single worker instance
- Database polling
- Simple and reliable

### Future Enhancements (10K+ orders/day)

**Option 1: Multiple Workers**
- Deploy 2-5 worker instances
- Each with unique `WORKER_ID`
- Database locking prevents conflicts
- Linear scaling

**Option 2: Message Queue (BullMQ/SQS)**
- Replace database polling with message queue
- Better for high-volume scenarios
- More complex infrastructure

**Option 3: Hybrid Approach**
- Keep database as source of truth
- Add Redis/BullMQ for job distribution
- Best of both worlds

## Troubleshooting

### Jobs stuck in "processing"
**Cause:** Worker crashed while processing job  
**Solution:** Run `SELECT release_expired_job_locks();` or wait for lock expiration

### Jobs failing repeatedly
**Cause:** Courier API issues or invalid data  
**Solution:** Check `last_error` in dashboard, verify courier credentials, manually retry

### No jobs being processed
**Cause:** Worker not running or database connection issue  
**Solution:** Check worker logs, verify environment variables, test database connection

### Duplicate shipments
**Should not happen:** Idempotency key prevents this  
**If it happens:** Check for bugs in courier API integration, verify idempotency key generation

## Security Best Practices

1. **Never expose service role key in frontend**
2. **Use RLS policies to restrict job access to admin users**
3. **Rotate courier API credentials regularly**
4. **Monitor worker logs for suspicious activity**
5. **Use HTTPS for all courier API calls**
6. **Encrypt sensitive data in job_payload if needed**

## Testing

### Test Job Creation
```bash
curl -X POST http://localhost:3000/api/admin/shipping/fulfill \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"order_id": "order-uuid"}'
```

### Test Worker Locally
```bash
cd worker
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### Test Idempotency
1. Click "Fulfill" on same order twice
2. Verify only one job created
3. Check `shipping_jobs` table

### Test Retry Logic
1. Modify mock to always fail
2. Watch job retry with exponential backoff
3. Verify job marked as failed after max retries

## Migration Checklist

- [ ] Run migration: `60_shipping_jobs_async_system.sql`
- [ ] Verify tables created: `shipping_jobs`, `shipping_jobs_dashboard`
- [ ] Add worker environment variables
- [ ] Deploy worker to server with static IP
- [ ] Whitelist worker IP with courier provider
- [ ] Test job creation from admin CMS
- [ ] Verify worker processes jobs
- [ ] Test manual retry functionality
- [ ] Monitor for 24 hours
- [ ] Set up alerting for failed jobs

## Support

For issues or questions:
1. Check worker logs
2. Check database for job status
3. Review courier API documentation
4. Check this documentation
