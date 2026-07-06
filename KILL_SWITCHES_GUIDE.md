# Kill Switches Implementation Guide

Complete guide to system kill switches and operational controls.

## 📋 Overview

Kill switches allow you to instantly disable specific features across the entire application without deploying code. All changes are logged with audit trail.

---

## ✅ Implemented Kill Switches

### 1. **Checkout** ✅ ENFORCED
- **Key**: `checkout_enabled`
- **Default**: Enabled
- **Enforcement**: Middleware blocks `/checkout` route
- **Effect**: Redirects to cart with message

### 2. **Payment Processing** ✅ ENFORCED
- **Key**: `payments_enabled`
- **Default**: Enabled
- **Enforcement**: `/api/midtrans/create-token/route.ts`
- **Effect**: Returns 503 error, prevents payment token creation

### 3. **Promo Codes** ✅ ENFORCED
- **Key**: `promo_codes_enabled`
- **Default**: Enabled
- **Enforcement**: `/app/api/promo-codes/validate/route.ts`
- **Effect**: Returns 503 error, prevents code validation

### 4. **DHL Auto-Pickup** ✅ ENFORCED
- **Key**: `dhl_auto_pickup`
- **Default**: Disabled
- **Enforcement**: `/app/api/orders/[id]/create-shipment/route.ts`
- **Effect**: Controls automatic pickup requests

### 5. **User Registration** ⚠️ NOT YET ENFORCED
- **Key**: `user_registration_enabled`
- **Default**: Enabled
- **Enforcement**: TODO - Add to registration page
- **Effect**: Will hide registration form

### 6. **Wishlist** ⚠️ NOT YET ENFORCED
- **Key**: `wishlist_enabled`
- **Default**: Enabled
- **Enforcement**: TODO - Add to wishlist components
- **Effect**: Will hide wishlist buttons

### 7. **Email Notifications** ⚠️ NOT YET ENFORCED
- **Key**: `email_notifications_enabled`
- **Default**: Enabled
- **Enforcement**: TODO - Add to email sending functions
- **Effect**: Will prevent all automated emails

### 8. **Order Notifications** ⚠️ NOT YET ENFORCED
- **Key**: `order_notifications_enabled`
- **Default**: Enabled
- **Enforcement**: TODO - Add to order status email functions
- **Effect**: Will prevent order status update emails

---

## 🔧 How to Use

### Via CMS Settings Page

1. **Navigate to Settings**
   ```
   CMS → Settings → Operational Kill Switches
   ```

2. **Toggle Feature**
   - Click the Enabled/Disabled button
   - Provide a reason (required for audit)
   - Confirm the change

3. **Changes Take Effect Immediately**
   - No deployment needed
   - All users affected instantly

---

## 💻 Programmatic Usage

### Server-Side (API Routes)

```typescript
import { isFeatureEnabled } from '@/lib/system-settings'

export async function POST(request: Request) {
  // Check if feature is enabled
  const enabled = await isFeatureEnabled('checkout_enabled')
  
  if (!enabled) {
    return NextResponse.json(
      { error: 'This feature is temporarily disabled' },
      { status: 503 }
    )
  }
  
  // Continue with normal logic...
}
```

### Client-Side (React Components)

```typescript
import { checkFeatureClient } from '@/lib/system-settings'

async function handleAction() {
  const enabled = await checkFeatureClient('wishlist_enabled')
  
  if (!enabled) {
    toast.error('Wishlist is temporarily disabled')
    return
  }
  
  // Continue with normal logic...
}
```

### Check Multiple Features

```typescript
import { checkFeatures } from '@/lib/system-settings'

const features = await checkFeatures([
  'checkout_enabled',
  'payments_enabled',
  'promo_codes_enabled'
])

if (!features.checkout_enabled) {
  // Handle disabled checkout
}
```

---

## 🗄️ Database Structure

```sql
CREATE TABLE system_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example row
{
  "setting_key": "checkout_enabled",
  "setting_value": {"enabled": true},
  "description": "Allow customers to complete checkout..."
}
```

---

## 📊 Audit Trail

All changes are logged in `system_settings_audit`:

```sql
SELECT 
  setting_key,
  old_value,
  new_value,
  changed_by,
  reason,
  created_at
FROM system_settings_audit
ORDER BY created_at DESC;
```

View in CMS:
```
Settings → View Audit Log
```

---

## 🚀 Adding New Kill Switches

### Step 1: Add to Settings Page

Edit `/app/cms/settings/page.tsx`:

```typescript
const killSwitches = [
  // ... existing switches
  {
    key: 'new_feature_enabled',
    icon: YourIcon,
    title: 'New Feature',
    description: 'Description of what this controls',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  }
]
```

### Step 2: Create Migration

Create `/supabase/migrations/XX_add_new_feature_switch.sql`:

```sql
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'new_feature_enabled',
  '{"enabled": true}'::jsonb,
  'Description of the feature'
)
ON CONFLICT (setting_key) DO NOTHING;
```

### Step 3: Enforce in Code

Add check where feature is used:

```typescript
import { isFeatureEnabled } from '@/lib/system-settings'

const enabled = await isFeatureEnabled('new_feature_enabled')
if (!enabled) {
  // Handle disabled state
}
```

### Step 4: Run Migration

```bash
npx supabase db push
```

---

## ⚠️ Best Practices

### 1. **Fail-Open Philosophy**
- If setting doesn't exist → assume enabled
- If database error → assume enabled
- Prevents accidental lockouts

### 2. **Always Require Reason**
- All changes logged with reason
- Helps with debugging and compliance
- Audit trail for security

### 3. **Test Before Disabling**
- Test in staging first
- Have rollback plan ready
- Monitor after changes

### 4. **Clear Communication**
- Notify team before disabling features
- Update status page if customer-facing
- Document in incident log

### 5. **Temporary Use Only**
- Kill switches are for emergencies
- Don't use as permanent feature flags
- Fix root cause, don't leave disabled

---

## 🔍 Monitoring

### Check Current Status

```sql
SELECT 
  setting_key,
  setting_value->>'enabled' as enabled,
  updated_at
FROM system_settings
WHERE setting_key LIKE '%_enabled'
ORDER BY setting_key;
```

### Recent Changes

```sql
SELECT 
  setting_key,
  old_value->>'enabled' as was_enabled,
  new_value->>'enabled' as now_enabled,
  reason,
  user_email,
  created_at
FROM system_settings_audit
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## 🆘 Emergency Procedures

### Disable Checkout (Site Issues)

```sql
UPDATE system_settings
SET setting_value = '{"enabled": false}'::jsonb
WHERE setting_key = 'checkout_enabled';
```

### Disable Payments (Payment Gateway Issues)

```sql
UPDATE system_settings
SET setting_value = '{"enabled": false}'::jsonb
WHERE setting_key = 'payments_enabled';
```

### Re-enable Everything

```sql
UPDATE system_settings
SET setting_value = '{"enabled": true}'::jsonb
WHERE setting_key LIKE '%_enabled';
```

---

## 📝 TODO: Remaining Enforcement

### High Priority
- [ ] **User Registration** - Add check to registration page
- [ ] **Wishlist** - Add check to wishlist components
- [ ] **Email Notifications** - Add check to email sending functions

### Implementation Example

```typescript
// In registration page
const registrationEnabled = await isFeatureEnabled('user_registration_enabled')
if (!registrationEnabled) {
  return (
    <div className="text-center p-8">
      <p>New registrations are temporarily closed.</p>
      <p>Please try again later.</p>
    </div>
  )
}
```

---

## 🎯 Summary

**Fully Enforced:**
- ✅ Checkout
- ✅ Payment Processing
- ✅ Promo Codes
- ✅ DHL Auto-Pickup

**Needs Enforcement:**
- ⚠️  User Registration
- ⚠️  Wishlist
- ⚠️  Email Notifications
- ⚠️  Order Notifications

**All switches are:**
- Visible in CMS Settings
- Stored in database
- Logged in audit trail
- Ready to use

**Next steps:** Implement enforcement for remaining switches as needed.
