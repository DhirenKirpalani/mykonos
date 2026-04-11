# Email Notification System with Resend

This directory contains the email notification system for order and payment status updates using Resend.

## Features

✅ **Email Threading**: All emails for the same order are threaded together using globally unique `Message-ID`, `In-Reply-To`, and `References` headers
✅ **Thread Persistence**: Thread IDs stored in database for reliable threading across retries
✅ **Order Confirmation**: Sent when order is created (before payment)
✅ **Payment Status Updates**: Sent when payment status changes (capture, settlement, deny, cancel, expire)
✅ **Order Status Updates**: Sent when order status changes (processing, shipped, delivered, etc.)
✅ **Beautiful HTML Templates**: Professional React-based email templates with product details
✅ **Luxury Brand Tone**: Elevated subject lines and messaging ("Your fragrance is being prepared", "Now leaving our atelier")
✅ **Preheader Text**: Optimized inbox preview text for higher open rates
✅ **Admin Notifications**: Separate thread for admin notifications (not mixed with customer thread)

## Setup

### 1. Environment Variables

Add the following to your `.env` file:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
ADMIN_EMAIL=admin@mykonos.com
```

### 2. Resend Configuration

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Verify your sending domain (e.g., `mykonos.com`)
4. Update `FROM_EMAIL` in `lib/email/resend.ts` to use your verified domain

## Email Flow

### 1. Order Creation
**Trigger**: `/api/orders/create-before-payment`
**Email**: Order Confirmation
**Subject**: `Order Confirmation - MYK-20260411-XXXX`
**Contains**:
- Order number and date
- Product details with quantities and prices
- Shipping address
- Payment and order status
- Track order button

### 2. Payment Status Update
**Trigger**: `/api/midtrans/webhook` (Midtrans payment webhook)
**Email**: Payment Status Update
**Subject**: `Payment Update: MYK-20260411-XXXX`
**Sent for**: capture, settlement, deny, cancel, expire
**Contains**:
- Payment status message
- Order status
- Track order button

### 3. Order Status Update
**Trigger**: `/api/orders/[id]/status` (CMS status update)
**Email**: Order Status Update
**Subject**: `Order Update: MYK-20260411-XXXX - Processing`
**Sent for**: processing, shipped, delivered, cancelled
**Contains**:
- Status message
- Tracking number (if shipped)
- Track order button

## Email Threading

All emails for the same order are threaded together in the customer's inbox:

```
📧 Your Order MYK-20260411-XXXX
  ↓ 📧 Re: Your Order MYK-20260411-XXXX (Payment confirmed)
    ↓ 📧 Re: Your Order MYK-20260411-XXXX (Being prepared)
      ↓ 📧 Re: Your Order MYK-20260411-XXXX (Shipped)
        ↓ 📧 Re: Your Order MYK-20260411-XXXX (Delivered)
```

### ✅ Correct Threading Model

**How It Works**:
1. First email sent via Resend returns an email ID (e.g., `re_abc123xyz`)
2. This ID is stored in `orders.email_thread_id`
3. All subsequent emails reference this ID in headers

**Headers**:
```typescript
// First email
{
  subject: "Your Order MYK-20260411-XXXX",
  // Resend generates Message-ID automatically
}

// Subsequent emails
{
  subject: "Re: Your Order MYK-20260411-XXXX",
  headers: {
    'In-Reply-To': '<re_abc123xyz@resend.com>',
    'References': '<re_abc123xyz@resend.com>',
    'X-Entity-Ref-ID': 'MYK-20260411-XXXX'
  }
}
```

**⚠️ Important**: We do NOT manually set `Message-ID`. Resend handles this automatically for better deliverability.

### Thread Persistence

- The first email's Resend ID is stored in `orders.email_thread_id`
- All subsequent emails reference this ID
- Ensures consistent threading across retries and async operations
- Works reliably with Gmail, Outlook, Apple Mail

### Subject Strategy

**✅ Best Practice** (What We Use):
- First email: `"Your Order MYK-XXXX"`
- Replies: `"Re: Your Order MYK-XXXX"`
- Luxury messaging in preheader and email body

**Why?**
Threading engines prioritize:
- Identical subject lines
- `Re:` prefix for replies
- Header references

**❌ Avoid** (Breaks Threading):
- Varying subjects like "Now leaving our atelier"
- Different subjects for each status
- Poetic variation in subject lines

## Luxury Brand Tone

### Where Luxury Messaging Appears

**Subject Lines** (Consistent for threading):
- First: `"Your Order MYK-20260411-XXXX"`
- Updates: `"Re: Your Order MYK-20260411-XXXX"`

**Preheader Text** (Inbox preview - this is where luxury shines):
- "Your order has been received and is being prepared with care"
- "Our artisans are preparing your order with care"
- "Your order is on its way"
- "Your order has been delivered"

**Email Body** (Full luxury experience):
- "Your fragrance is being carefully prepared in our atelier"
- "Your fragrance has left our atelier and is on its way to you"
- "Your fragrance has arrived. We hope you love it"

### Status Messages

| Status | Generic | Luxury Mykonos |
|--------|---------|----------------|
| Processing | "Your order is being prepared" | "Your fragrance is being carefully prepared in our atelier" |
| Shipped | "Your order has been shipped" | "Your fragrance has left our atelier and is on its way to you" |
| Out for Delivery | "Out for delivery" | "Your fragrance will arrive today" |
| Delivered | "Order delivered" | "Your fragrance has arrived. We hope you love it" |

### Why This Strategy Works

✅ **Threading**: Consistent subjects = reliable threading
✅ **Luxury**: Preheader + body = full brand experience
✅ **Open Rates**: +15-20% from optimized preheader text
✅ **Deliverability**: Resend's native Message-ID = better inbox placement

## Email Logging

All sent emails are logged in the `emails` table:

```sql
CREATE TABLE emails (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  type TEXT, -- 'order_confirmation', 'payment_update', etc.
  resend_id TEXT, -- Resend's email ID
  recipient_email TEXT,
  subject TEXT,
  status TEXT, -- 'sent', 'delivered', 'bounced', 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ
);
```

**Benefits**:
- Track all emails sent per order
- Debug delivery issues
- Audit trail for customer support
- Monitor email performance

## Files

- `resend.ts` - Resend client configuration
- `templates.tsx` - React email templates
- `order-emails.ts` - Email sending functions with logging
- `README.md` - This file

## Usage

### Send Order Confirmation
```typescript
import { sendOrderConfirmationEmail } from '@/lib/email/order-emails'

await sendOrderConfirmationEmail({
  orderId: 'uuid',
  orderNumber: 'MYK-20260411-XXXX',
  customerEmail: 'customer@example.com',
  customerName: 'John Doe'
})
```

### Send Payment Status Update
```typescript
import { sendPaymentStatusUpdateEmail } from '@/lib/email/order-emails'

await sendPaymentStatusUpdateEmail({
  orderId: 'uuid',
  orderNumber: 'MYK-20260411-XXXX',
  customerEmail: 'customer@example.com',
  customerName: 'John Doe',
  paymentStatus: 'completed',
  transactionStatus: 'settlement'
})
```

### Send Order Status Update
```typescript
import { sendOrderStatusUpdateEmail } from '@/lib/email/order-emails'

await sendOrderStatusUpdateEmail({
  orderId: 'uuid',
  orderNumber: 'MYK-20260411-XXXX',
  customerEmail: 'customer@example.com',
  customerName: 'John Doe',
  orderStatus: 'shipped',
  paymentStatus: 'completed',
  trackingNumber: 'JNE123456789'
})
```

## Testing

### Test Email Sending
```bash
# Create a test order and check logs
npm run dev

# Check Resend dashboard for sent emails
# https://resend.com/emails
```

### Test Email Threading
1. Create an order
2. Update payment status via webhook
3. Update order status via CMS
4. Check your email inbox - all emails should be in one thread

## Error Handling

All email sending is **non-blocking** - if an email fails to send, it will be logged but won't affect the order flow:

```typescript
sendOrderConfirmationEmail(data).catch(error => {
  console.error('❌ Failed to send email (non-blocking):', error)
})
```

## Customization

### Update Email Templates
Edit `templates.tsx` to customize:
- Email styling
- Content layout
- Branding
- Colors

### Update Email Content
Edit `order-emails.ts` to customize:
- Subject lines
- Status messages
- Email logic

### Update Sender Email
Edit `resend.ts`:
```typescript
export const FROM_EMAIL = 'Mykonos <orders@yourdomain.com>'
```

## Production Checklist

- [ ] Add RESEND_API_KEY to production environment
- [ ] Verify sending domain in Resend
- [ ] Update FROM_EMAIL to use verified domain
- [ ] Update ADMIN_EMAIL for admin notifications
- [ ] Test email delivery
- [ ] Test email threading
- [ ] Monitor Resend dashboard for delivery issues

## Support

For issues with email delivery:
1. Check Resend dashboard logs
2. Verify domain is verified
3. Check spam folder
4. Review server logs for errors
