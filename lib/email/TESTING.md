# Email Testing Guide

## Quick Setup for Testing

### 1. Enable Test Mode

Add to your `.env` file:

```env
# Resend API Key (get from https://resend.com/api-keys)
RESEND_API_KEY=re_your_api_key_here

# Enable test mode to use onboarding@resend.dev
EMAIL_TEST_MODE=true

# Admin email for notifications
ADMIN_EMAIL=your-email@example.com
```

### 2. Test Mode vs Production Mode

**Test Mode** (`EMAIL_TEST_MODE=true`):
- Uses `onboarding@resend.dev` as sender
- No domain verification needed
- Perfect for initial testing
- Emails will be sent successfully

**Production Mode** (`EMAIL_TEST_MODE=false` or not set):
- Uses `orders@mykonos.com` as sender
- Requires domain verification in Resend
- Use after testing is complete

### 3. Check Logs

When you create an order, you should see:

```
=== 📧 EMAIL CONFIRMATION START ===
📋 [EMAIL] Order Number: MYK-20260411-XXXX
📋 [EMAIL] Order ID: uuid
📋 [EMAIL] Customer: John Doe <john@example.com>
⏰ [EMAIL] Timestamp: 2026-04-11T04:28:00.000Z
📦 [EMAIL] Order Items Count: 2
💰 [EMAIL] Total Amount: 500000
📝 [EMAIL] Subject: Your Order MYK-20260411-XXXX
👁️ [EMAIL] Preheader: Your order has been received...
📤 [EMAIL] Sending to Resend API...
📧 [EMAIL] From: Mykonos <onboarding@resend.dev>
📧 [EMAIL] To: customer@example.com
🔑 [EMAIL] Using API Key: re_abc123...
✅ [EMAIL] Email sent successfully!
🆔 [EMAIL] Resend Email ID: re_xyz789...
💾 [EMAIL] Storing thread ID in database...
✅ [EMAIL] Thread ID stored: re_xyz789...
💾 [EMAIL] Logging email to database...
✅ [EMAIL] Email logged to database
📤 [EMAIL] Sending admin notification...
✅ [EMAIL] Admin notification sent: re_def456...
=== 📧 EMAIL CONFIRMATION END (SUCCESS) ===
```

### 4. Common Issues

#### ❌ "RESEND_API_KEY is not set"
**Solution**: Add `RESEND_API_KEY` to your `.env` file

#### ❌ Email not received
**Check**:
1. Look for `✅ [EMAIL] Email sent successfully!` in logs
2. Check spam folder
3. Verify email address is correct
4. Check Resend dashboard for delivery status

#### ❌ "Domain not verified"
**Solution**: 
- Set `EMAIL_TEST_MODE=true` to use test email
- OR verify your domain in Resend dashboard

### 5. Verify Email Sending

1. **Create an order** through checkout
2. **Check server logs** for email confirmation logs
3. **Check your inbox** (or spam folder)
4. **Check Resend dashboard**: https://resend.com/emails

### 6. Test Email Threading

1. Create an order → First email sent
2. Update payment status → Second email sent (should thread)
3. Update order status → Third email sent (should thread)
4. Check inbox → All emails should be in one conversation

### 7. Database Logging

Check the `emails` table to see all sent emails:

```sql
SELECT * FROM emails ORDER BY created_at DESC LIMIT 10;
```

You should see:
- `order_confirmation`
- `payment_update`
- `order_status_update`
- `admin_notification`

## Troubleshooting

### No logs appearing?

The email functions might not be called. Check:
1. Order creation API: `/api/orders/create-before-payment`
2. Payment webhook: `/api/midtrans/webhook`
3. Status update API: `/api/orders/[id]/status`

### Emails sent but not received?

1. Check Resend dashboard for delivery status
2. Check spam folder
3. Verify recipient email is correct
4. Check Resend logs for bounces/errors

### Threading not working?

1. Check if `email_thread_id` is stored in orders table
2. Verify subsequent emails have `In-Reply-To` header in logs
3. Check if subject line is consistent (`Re: Your Order MYK-XXXX`)

## Next Steps

Once testing is complete:

1. Set `EMAIL_TEST_MODE=false`
2. Verify your domain in Resend
3. Update `FROM_EMAIL` to use your verified domain
4. Test again with production settings
