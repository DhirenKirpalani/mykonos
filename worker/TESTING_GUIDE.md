# Testing Guide: Get Digital Ocean IP for Courier Whitelisting

This guide helps you deploy the worker to Digital Ocean, get its static IP address, and test the shipping integration.

## 🎯 Goal

1. Deploy worker to Digital Ocean
2. Get the static IP address
3. Test that the worker can process shipping jobs
4. Provide IP to courier for whitelisting
5. Integrate with courier's development API

---

## Step 1: Deploy Worker to Digital Ocean

### Option A: Digital Ocean Droplet (Recommended)

**1. Create a Droplet:**
```bash
# Via DigitalOcean Dashboard:
1. Click "Create" → "Droplets"
2. Choose Ubuntu 22.04 LTS
3. Select Basic plan ($6/month is sufficient)
4. Choose datacenter region (closest to Indonesia for best performance)
5. Add SSH key
6. Create Droplet
```

**2. SSH into Droplet:**
```bash
ssh root@your-droplet-ip
```

**3. Install Node.js:**
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

**4. Install Git:**
```bash
sudo apt-get install -y git
```

**5. Clone Your Repository:**
```bash
cd /opt
git clone https://github.com/your-username/mykonos.git
cd mykonos/worker
```

**6. Install Dependencies:**
```bash
npm install
```

**7. Create Environment File:**
```bash
nano .env
```

Add your configuration:
```bash
SUPABASE_URL=https://fgnigpamurrmeljtlphe.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
WORKER_ID=do-shipping-worker-1
POLL_INTERVAL_MS=5000
LOCK_DURATION_SECONDS=300
MAX_CONCURRENT_JOBS=3
```

**8. Build the Worker:**
```bash
npm run build
```

**9. Install PM2 (Process Manager):**
```bash
sudo npm install -g pm2
```

**10. Start the Worker:**
```bash
pm2 start dist/shipping-worker.js --name shipping-worker
pm2 save
pm2 startup
```

**11. Get Your Static IP:**
```bash
curl ifconfig.me
```

**📝 Save this IP address - this is what you'll provide to the courier!**

### Option B: Digital Ocean App Platform

**1. Via Dashboard:**
```
1. Go to DigitalOcean → Apps
2. Click "Create App"
3. Connect your GitHub repository
4. Set source directory: /worker
5. Set build command: npm run build
6. Set run command: npm start
7. Add environment variables
8. Deploy
```

**2. Get Static IP:**
```
1. Go to App → Settings → Domains
2. Note the app's IP address
3. Or use: curl ifconfig.me from app console
```

---

## Step 2: Get Worker's IP Address

### From Droplet:
```bash
# SSH into droplet
ssh root@your-droplet-ip

# Get public IP
curl ifconfig.me

# Or
curl https://api.ipify.org
```

### From App Platform:
```bash
# Open app console and run:
curl ifconfig.me
```

**Example Output:**
```
167.99.123.45
```

✅ **This is your static IP to whitelist with the courier!**

---

## Step 3: Test Shipping Job Processing

### A. Create a Test Shipping Job

**From your CMS (shown in screenshot):**

1. Go to **Orders** page
2. Click on order `MYK-20260308-6A04`
3. Click **"Fulfill Order"** or **"Create Shipping Label"** button
4. This will create a shipping job

**Or via API:**
```bash
curl -X POST https://your-app.vercel.app/api/admin/shipping/fulfill \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "order_id": "your-order-id-here"
  }'
```

### B. Monitor Worker Logs

**On Digital Ocean Droplet:**
```bash
# View live logs
pm2 logs shipping-worker

# Or
pm2 logs shipping-worker --lines 100
```

**Expected Output:**
```
[Worker do-shipping-worker-1] Starting shipping worker...
[Worker do-shipping-worker-1] Poll interval: 5000ms
[Worker do-shipping-worker-1] Max concurrent jobs: 3
[Worker do-shipping-worker-1] Acquired job abc-123 for order MYK-20260308-6A04
[Worker do-shipping-worker-1] Retry count: 0
[Worker do-shipping-worker-1] Calling courier API for job abc-123...
[Worker do-shipping-worker-1] [MOCK] Creating shipment for order MYK-20260308-6A04
[Worker do-shipping-worker-1] ✓ Job abc-123 completed successfully
```

### C. Check Database

**Query shipping jobs:**
```sql
SELECT 
  id,
  order_number,
  status,
  retry_count,
  locked_by,
  tracking_number,
  created_at
FROM shipping_jobs
ORDER BY created_at DESC
LIMIT 10;
```

**Check for your worker:**
```sql
SELECT 
  locked_by,
  COUNT(*) as jobs_processed
FROM shipping_jobs
WHERE locked_by = 'do-shipping-worker-1'
GROUP BY locked_by;
```

---

## Step 4: Verify IP is Correct

### Test Outbound IP from Worker

**Create a test script on your droplet:**
```bash
nano /opt/test-ip.js
```

```javascript
const https = require('https');

https.get('https://api.ipify.org?format=json', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Worker outbound IP:', JSON.parse(data).ip);
  });
});
```

**Run it:**
```bash
node /opt/test-ip.js
```

**Output:**
```
Worker outbound IP: 167.99.123.45
```

✅ **Confirm this matches your droplet IP!**

---

## Step 5: Provide IP to Courier

### Email Template for Courier Support:

```
Subject: API Whitelisting Request - Mykonos E-commerce

Dear [Courier Name] Support Team,

We would like to integrate with your shipping API for our e-commerce platform.

Please whitelist the following IP address for API access:

Static IP: 167.99.123.45
Environment: Development/Sandbox
Company: Mykonos
Contact: [Your Name]
Email: [Your Email]

We are ready to begin integration testing once the IP is whitelisted.

Thank you,
[Your Name]
```

---

## Step 6: Test with Real Courier API

### Once IP is Whitelisted:

**1. Update Worker Code:**

Edit `worker/shipping-worker.ts` and replace `mockCourierApiCall` with real API:

```typescript
private async realCourierApiCall(
  payload: ShippingJobPayload,
  courierRequestId: string
): Promise<CourierResponse> {
  const courierApiUrl = process.env.COURIER_API_URL || 'https://api.courier.com/v1/shipments';
  const apiKey = process.env.COURIER_API_KEY;

  const response = await fetch(courierApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-Idempotency-Key': courierRequestId,
    },
    body: JSON.stringify({
      order_number: payload.order_number,
      shipping_address: payload.shipping_address,
      // ... other required fields
    }),
    signal: AbortSignal.timeout(10000), // 10 second timeout
  });

  if (!response.ok) {
    throw new Error(`Courier API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return {
    tracking_number: data.tracking_number,
    label_url: data.label_url,
    courier_name: 'Your Courier Name',
    estimated_delivery_at: data.estimated_delivery,
    service_type: data.service_type,
    cost: data.cost,
    raw_response: data,
  };
}
```

**2. Update Environment Variables:**
```bash
nano /opt/mykonos/worker/.env
```

Add:
```bash
COURIER_API_URL=https://sandbox-api.courier.com/v1/shipments
COURIER_API_KEY=your-sandbox-api-key
```

**3. Rebuild and Restart:**
```bash
cd /opt/mykonos/worker
npm run build
pm2 restart shipping-worker
```

**4. Test with Real Order:**
```bash
# Create shipping job from CMS
# Monitor logs
pm2 logs shipping-worker
```

---

## Troubleshooting

### Worker Not Starting
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs shipping-worker --err

# Restart
pm2 restart shipping-worker
```

### Can't Connect to Database
```bash
# Test Supabase connection
curl https://fgnigpamurrmeljtlphe.supabase.co/rest/v1/ \
  -H "apikey: your-anon-key"
```

### IP Mismatch
```bash
# Verify droplet IP
curl ifconfig.me

# Check worker is using correct IP
node /opt/test-ip.js
```

### Jobs Not Processing
```bash
# Check if jobs exist
# Run in Supabase SQL editor:
SELECT * FROM shipping_jobs WHERE status = 'pending';

# Release stuck jobs
SELECT release_expired_job_locks();
```

---

## Quick Reference

### Useful Commands

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Check worker status
pm2 status

# View logs
pm2 logs shipping-worker

# Restart worker
pm2 restart shipping-worker

# Stop worker
pm2 stop shipping-worker

# Get IP
curl ifconfig.me

# Update code
cd /opt/mykonos
git pull
cd worker
npm install
npm run build
pm2 restart shipping-worker
```

### Important Files

- Worker code: `/opt/mykonos/worker/shipping-worker.ts`
- Environment: `/opt/mykonos/worker/.env`
- Logs: `~/.pm2/logs/`
- PM2 config: `~/.pm2/`

---

## Next Steps After IP Whitelisting

1. ✅ Receive confirmation from courier that IP is whitelisted
2. ✅ Get sandbox API credentials
3. ✅ Update worker code with real courier API integration
4. ✅ Test with development API
5. ✅ Verify tracking numbers and labels are generated
6. ✅ Test error handling and retries
7. ✅ Move to production API when ready

---

## Support

If you encounter issues:

1. Check worker logs: `pm2 logs shipping-worker`
2. Check database for job status
3. Verify IP with `curl ifconfig.me`
4. Test database connection
5. Check courier API documentation

Good luck with your integration! 🚀
