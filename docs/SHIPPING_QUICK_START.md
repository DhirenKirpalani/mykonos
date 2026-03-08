# Async Shipping System - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Run Database Migration

```bash
# Apply the shipping jobs schema
psql -h your-supabase-host -U postgres -d postgres -f supabase/migrations/60_shipping_jobs_async_system.sql
```

Or use Supabase CLI:
```bash
supabase db push
```

### Step 2: Deploy Worker Service

**Option A: Railway (Easiest)**

1. Go to [Railway](https://railway.app)
2. Create new project
3. Connect your GitHub repository
4. Set root directory: `/worker`
5. Add environment variables:
   ```
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   WORKER_ID=shipping-worker-1
   ```
6. Deploy
7. Note the static IP from Railway dashboard

**Option B: DigitalOcean (5 minutes)**

```bash
# Create droplet (Ubuntu 22.04)
# SSH into droplet
ssh root@your-droplet-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone your-repo.git
cd your-repo/worker
npm install
npm run build

# Create .env file
cat > .env << EOF
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
WORKER_ID=shipping-worker-1
EOF

# Install and start with PM2
sudo npm install -g pm2
pm2 start dist/shipping-worker.js --name shipping-worker
pm2 save
pm2 startup
```

### Step 3: Whitelist Worker IP

1. Get worker's static IP:
   - Railway: Check dashboard
   - DigitalOcean: Your droplet IP
   - AWS: Elastic IP

2. Contact your courier provider
3. Request IP whitelisting for their API
4. Provide the static IP

### Step 4: Test the System

**A. Create a test order** (if you don't have one):
```sql
-- This is just for testing - normally orders come from checkout
INSERT INTO orders (user_id, order_number, payment_status, status, total_amount, shipping_address)
VALUES (
  'your-user-id',
  'TEST-001',
  'completed',
  'paid',
  100.00,
  '{"full_name": "Test User", "address_line1": "123 Test St", "city": "Test City", "state_province": "TS", "postal_code": "12345", "country": "US", "phone": "+1234567890"}'::jsonb
);
```

**B. Fulfill the order:**

From admin CMS:
1. Go to `/cms/orders`
2. Find your test order
3. Click "Fulfill Order"
4. Check `/cms/shipping-jobs` to see the job

Or via API:
```bash
curl -X POST http://localhost:3000/api/admin/shipping/fulfill \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"order_id": "your-order-id"}'
```

**C. Watch the worker process it:**

```bash
# If using PM2
pm2 logs shipping-worker

# If using Docker
docker logs -f shipping-worker

# You should see:
# [Worker shipping-worker-1] Acquired job xxx for order TEST-001
# [Worker shipping-worker-1] Calling courier API...
# [Worker shipping-worker-1] ✓ Job xxx completed successfully
```

**D. Verify the result:**

Check the order was updated:
```sql
SELECT order_number, status, tracking_number, label_url 
FROM orders 
WHERE order_number = 'TEST-001';
```

Should show:
- `status`: `shipped`
- `tracking_number`: `TRACK-xxx`
- `label_url`: URL to label

### Step 5: Monitor Jobs

Access the admin dashboard:
```
https://your-domain.com/cms/shipping-jobs
```

You'll see:
- ✅ Job statistics (pending, processing, success, failed)
- 📊 Real-time job status
- 🔄 Manual retry buttons
- 📝 Error messages for failed jobs

## 🎯 Integration with Existing Orders Page

Add the fulfill button to your orders management page:

```tsx
import { FulfillOrderButton } from '@/components/admin/FulfillOrderButton'

// In your order list/detail component:
<FulfillOrderButton
  orderId={order.id}
  orderNumber={order.order_number}
  orderStatus={order.status}
  paymentStatus={order.payment_status}
  onSuccess={() => {
    // Refresh order data
    fetchOrders()
  }}
/>
```

## 🔧 Configuration

### Recommended Settings

**Low Volume (< 100 orders/day):**
```bash
POLL_INTERVAL_MS=10000
MAX_CONCURRENT_JOBS=1
```

**Medium Volume (100-1000 orders/day):**
```bash
POLL_INTERVAL_MS=5000
MAX_CONCURRENT_JOBS=3
```

**High Volume (1000+ orders/day):**
```bash
POLL_INTERVAL_MS=3000
MAX_CONCURRENT_JOBS=5
# Consider running 2-3 worker instances
```

## 🐛 Troubleshooting

### "Job created but not processing"

**Check worker is running:**
```bash
pm2 status
# or
docker ps
```

**Check worker logs:**
```bash
pm2 logs shipping-worker
# or
docker logs shipping-worker
```

### "Jobs failing repeatedly"

**Check error in dashboard:**
1. Go to `/cms/shipping-jobs`
2. Look at failed jobs
3. Read error message

**Common issues:**
- Invalid courier API credentials
- IP not whitelisted yet
- Invalid shipping address format
- Courier API rate limit

**Solution:**
1. Fix the issue
2. Click "Retry" button in dashboard

### "Duplicate jobs created"

**This should never happen** due to idempotency protection.

**If it does:**
```sql
-- Check for duplicates
SELECT order_id, COUNT(*) 
FROM shipping_jobs 
GROUP BY order_id 
HAVING COUNT(*) > 1;
```

Report this as a bug.

## 📊 Monitoring Queries

**Active jobs:**
```sql
SELECT status, COUNT(*) 
FROM shipping_jobs 
GROUP BY status;
```

**Recent failures:**
```sql
SELECT order_number, last_error, retry_count 
FROM shipping_jobs 
WHERE status = 'failed' 
ORDER BY failed_at DESC 
LIMIT 10;
```

**Worker activity:**
```sql
SELECT locked_by, COUNT(*) as active_jobs
FROM shipping_jobs 
WHERE status = 'processing' 
GROUP BY locked_by;
```

**Success rate (last 24 hours):**
```sql
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM shipping_jobs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

## 🎓 Next Steps

1. **Replace mock courier with real API** - Edit `worker/shipping-worker.ts` `callCourierApi()` method
2. **Set up monitoring alerts** - Use your preferred monitoring tool
3. **Configure email notifications** - For failed jobs
4. **Add webhook support** - For courier tracking updates
5. **Scale as needed** - Add more workers or increase concurrency

## 📚 Full Documentation

For complete details, see:
- [Full System Documentation](./ASYNC_SHIPPING_SYSTEM.md)
- [Worker README](../worker/README.md)

## ✅ Checklist

- [ ] Database migration applied
- [ ] Worker deployed with static IP
- [ ] IP whitelisted with courier
- [ ] Test order fulfilled successfully
- [ ] Admin dashboard accessible
- [ ] Worker logs showing activity
- [ ] Monitoring queries working
- [ ] Team trained on retry process

## 🆘 Need Help?

1. Check worker logs first
2. Check database for job status
3. Review error messages in admin dashboard
4. Verify courier API credentials
5. Confirm IP is whitelisted
6. Test database connection from worker

---

**You're ready to go!** 🎉

The system will now handle all shipping asynchronously, safely, and reliably.
