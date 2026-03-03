# Shipping Worker Service

Enterprise-grade async worker service for processing shipping jobs with static IP support.

## Overview

This worker service runs independently from the Next.js application and processes shipping jobs from the database queue. It's designed to be deployed on a server with a static IP address (DigitalOcean, Railway, AWS EC2, etc.) to meet courier API IP whitelisting requirements.

## Features

- ✅ **Async Job Processing**: Polls database for pending jobs
- ✅ **Safe Concurrency**: Uses PostgreSQL row-level locking (SELECT FOR UPDATE SKIP LOCKED)
- ✅ **Automatic Retries**: Exponential backoff for failed jobs
- ✅ **Graceful Shutdown**: Handles SIGTERM/SIGINT properly
- ✅ **Multiple Workers**: Can run multiple instances safely
- ✅ **Production Ready**: Comprehensive error handling and logging

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
WORKER_ID=shipping-worker-1
POLL_INTERVAL_MS=5000
LOCK_DURATION_SECONDS=300
MAX_CONCURRENT_JOBS=3
```

### 3. Build

```bash
npm run build
```

### 4. Run

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## Deployment Options

### Option 1: PM2 (Recommended for VPS)

```bash
# Install PM2 globally
npm install -g pm2

# Start worker
pm2 start dist/shipping-worker.js --name shipping-worker

# Save PM2 configuration
pm2 save

# Setup auto-restart on server reboot
pm2 startup
```

**PM2 Commands:**
```bash
pm2 status              # Check status
pm2 logs shipping-worker # View logs
pm2 restart shipping-worker # Restart
pm2 stop shipping-worker    # Stop
pm2 delete shipping-worker  # Remove
```

### Option 2: Docker

```bash
# Build image
docker build -t shipping-worker .

# Run container
docker run -d \
  --name shipping-worker \
  --env-file .env \
  --restart unless-stopped \
  shipping-worker
```

**Docker Compose:**
```bash
docker-compose up -d
```

**Docker Commands:**
```bash
docker logs -f shipping-worker  # View logs
docker restart shipping-worker  # Restart
docker stop shipping-worker     # Stop
docker rm shipping-worker       # Remove
```

### Option 3: Railway

1. Create new project in Railway
2. Connect GitHub repository
3. Set root directory to `/worker`
4. Add environment variables in Railway dashboard
5. Deploy

Railway automatically provides a static IP that you can whitelist.

### Option 4: DigitalOcean App Platform

1. Create new app in DigitalOcean
2. Connect GitHub repository
3. Set source directory to `/worker`
4. Configure environment variables
5. Deploy

Note the static IP from your droplet/app.

### Option 5: AWS EC2

```bash
# SSH into EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone your-repo.git
cd your-repo/worker

# Install dependencies
npm install

# Build
npm run build

# Install PM2
sudo npm install -g pm2

# Start worker
pm2 start dist/shipping-worker.js --name shipping-worker
pm2 save
pm2 startup
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SUPABASE_URL` | Supabase project URL | - | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | - | ✅ |
| `WORKER_ID` | Unique worker identifier | `worker-{pid}` | ❌ |
| `POLL_INTERVAL_MS` | Job polling interval in milliseconds | `5000` | ❌ |
| `LOCK_DURATION_SECONDS` | Job lock duration | `300` | ❌ |
| `MAX_CONCURRENT_JOBS` | Max jobs to process simultaneously | `3` | ❌ |

### Tuning Parameters

**POLL_INTERVAL_MS:**
- Lower = More responsive, higher database load
- Higher = Less responsive, lower database load
- Recommended: 3000-10000ms

**LOCK_DURATION_SECONDS:**
- Should be longer than typical job processing time
- Prevents stuck jobs from blocking queue
- Recommended: 300-600 seconds

**MAX_CONCURRENT_JOBS:**
- Based on server resources and courier API rate limits
- Start with 3, increase if needed
- Monitor CPU and memory usage

## Monitoring

### Logs

Worker outputs structured logs:

```
[Worker shipping-worker-1] Starting shipping worker...
[Worker shipping-worker-1] Poll interval: 5000ms
[Worker shipping-worker-1] Max concurrent jobs: 3
[Worker shipping-worker-1] Acquired job abc-123 for order ORD-20260303-A1B2
[Worker shipping-worker-1] Retry count: 0
[Worker shipping-worker-1] Calling courier API for job abc-123...
[Worker shipping-worker-1] ✓ Job abc-123 completed successfully
```

### Health Checks

The worker doesn't expose HTTP endpoints. Monitor health via:

1. **Process monitoring**: PM2 or Docker health checks
2. **Database queries**: Check for stuck jobs
3. **Log monitoring**: Watch for errors
4. **Job metrics**: Track success/failure rates

### Database Queries

**Check worker activity:**
```sql
SELECT locked_by, COUNT(*) 
FROM shipping_jobs 
WHERE status = 'processing' 
GROUP BY locked_by;
```

**Check stuck jobs:**
```sql
SELECT * FROM shipping_jobs 
WHERE status = 'processing' 
AND lock_expires_at < NOW();
```

**Release stuck jobs:**
```sql
SELECT release_expired_job_locks();
```

## Scaling

### Horizontal Scaling (Multiple Workers)

Run multiple worker instances with different `WORKER_ID`:

```bash
# Worker 1
WORKER_ID=worker-1 npm start

# Worker 2
WORKER_ID=worker-2 npm start

# Worker 3
WORKER_ID=worker-3 npm start
```

Workers coordinate via database locking - no conflicts!

### Vertical Scaling

Increase `MAX_CONCURRENT_JOBS` on a single worker:

```bash
MAX_CONCURRENT_JOBS=10 npm start
```

Monitor CPU/memory usage and courier API rate limits.

## Troubleshooting

### Worker not processing jobs

**Check:**
1. Worker is running: `pm2 status` or `docker ps`
2. Database connection: Check logs for connection errors
3. Environment variables: Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
4. Jobs exist: Query `shipping_jobs` table

### Jobs stuck in processing

**Cause:** Worker crashed while processing  
**Solution:** Run `SELECT release_expired_job_locks();` or wait for lock expiration

### High CPU usage

**Cause:** Poll interval too low or too many concurrent jobs  
**Solution:** Increase `POLL_INTERVAL_MS` or decrease `MAX_CONCURRENT_JOBS`

### Memory leaks

**Cause:** Long-running process accumulating memory  
**Solution:** Restart worker periodically (PM2 can do this automatically)

```bash
pm2 start dist/shipping-worker.js --max-memory-restart 500M
```

## Development

### Running Locally

```bash
npm run dev
```

### Testing

The worker includes a mock courier API that:
- Simulates 2-second processing time
- Has 10% random failure rate (for testing retries)
- Returns mock tracking numbers and labels

### Debugging

Add debug logging:

```typescript
console.log('[DEBUG] Job payload:', JSON.stringify(job.job_payload, null, 2));
```

Set shorter poll interval for faster feedback:

```bash
POLL_INTERVAL_MS=1000 npm run dev
```

## Security

### Best Practices

1. **Never commit `.env` file**
2. **Use service role key only on backend**
3. **Rotate credentials regularly**
4. **Monitor for unauthorized access**
5. **Use HTTPS for courier API calls**
6. **Restrict database access to worker IP**

### IP Whitelisting

After deploying, note your server's static IP and whitelist it with your courier provider:

```bash
# Get your server's public IP
curl ifconfig.me
```

Provide this IP to your courier's support team for whitelisting.

## Maintenance

### Updates

```bash
git pull
npm install
npm run build
pm2 restart shipping-worker
```

### Backups

The worker is stateless - all state is in the database. Ensure your Supabase database is backed up regularly.

### Monitoring Checklist

- [ ] Worker process is running
- [ ] No stuck jobs (processing > 5 minutes)
- [ ] Failed job rate < 5%
- [ ] CPU usage < 70%
- [ ] Memory usage stable
- [ ] Logs show no errors

## Support

For issues:
1. Check worker logs
2. Check database for job status
3. Review main documentation: `/docs/ASYNC_SHIPPING_SYSTEM.md`
4. Verify courier API credentials
5. Test database connection

## License

MIT
