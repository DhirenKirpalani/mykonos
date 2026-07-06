# DHL Express API Integration Guide

Complete guide for integrating DHL Express shipping into your Mykonos e-commerce platform.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [API Routes](#api-routes)
- [Usage](#usage)
- [Data Flow](#data-flow)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Production Deployment](#production-deployment)

---

## Overview

This integration provides:

- ✅ **Shipment Creation** - Generate DHL shipping labels with tracking
- ✅ **Rate Calculation** - Get shipping quotes before checkout
- ✅ **Tracking** - Real-time shipment tracking
- ✅ **Address Validation** - Verify customer addresses
- ✅ **Bulk Processing** - Create multiple shipments at once
- ✅ **Comprehensive Logging** - Detailed debug information

### Architecture

```
┌─────────────────┐
│   CMS Orders    │ "Mark as Shipped" button
│      Page       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Route      │ /api/orders/[id]/create-shipment
│  Create         │
│  Shipment       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  DHL Client     │ lib/dhl/client.ts
│  (Fetch API)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  DHL Express    │ https://express.api.dhl.com
│  API v3.2.2     │
└─────────────────┘
```

---

## Setup

### 1. Install Dependencies

No additional packages needed! Uses native `fetch` API.

### 2. Database Migration

Apply the DHL fields migration:

```bash
npx supabase db push
```

This adds the following fields to the `orders` table:
- `dhl_shipment_number` - DHL tracking number
- `dhl_tracking_url` - Full tracking URL
- `dhl_label_pdf` - Base64 encoded shipping label
- `dhl_product_code` - Service type (e.g., 'N' for domestic)
- `dhl_service_name` - Human-readable service name
- `shipped_at` - Timestamp when shipped

### 3. Configure Environment Variables

Copy `.env.dhl.example` to `.env.local` and fill in your DHL credentials:

```bash
cp .env.dhl.example .env.local
```

---

## Environment Variables

### Required Variables

```env
# DHL API Credentials
DHL_API_KEY=your_api_key_here
DHL_API_SECRET=your_api_secret_here
DHL_ACCOUNT_NUMBER=your_account_number

# DHL API URLs
DHL_SANDBOX_API_URL=https://express.api.dhl.com/mydhlapi/test
DHL_PRODUCTION_API_URL=https://express.api.dhl.com/mydhlapi

# Shipper Information (Your Company)
DHL_SHIPPER_NAME=PT. MONARCH MULTI INDUSTRI
DHL_SHIPPER_ADDRESS=Kawasan Industri Pulogadung Jalan Rawagatel Kav B1-B2
DHL_SHIPPER_CITY=Jakarta
DHL_SHIPPER_POSTAL_CODE=13920
DHL_SHIPPER_COUNTRY=ID
DHL_SHIPPER_PHONE=+62123456789
DHL_SHIPPER_EMAIL=mykonos.operational@gmail.com
```

### Important Notes

- **API Key/Secret**: Get these from DHL Express MyDHL API portal
- **Account Number**: Your DHL billing account number
- **Shipper Address**: Must be max 45 characters (will be auto-truncated)
- **Phone**: Must include country code (e.g., `+62` for Indonesia)
- **Country Code**: Use ISO 2-letter codes (ID, US, SG, etc.)

---

## API Routes

### 1. Create Shipment

**Endpoint:** `POST /api/orders/[id]/create-shipment`

Creates a DHL shipment for an order and generates a shipping label.

**Request:**
```json
{
  "serviceLevel": "standard"
}
```

**Response (Success):**
```json
{
  "success": true,
  "shipmentTrackingNumber": "1234567890",
  "trackingUrl": "https://www.dhl.com/...",
  "labelPdf": "base64_encoded_pdf...",
  "productCode": "N",
  "serviceName": "DOMESTIC EXPRESS",
  "estimatedDeliveryDate": "2026-05-15"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "No shipping address found for this order",
  "orderId": "abc-123"
}
```

### 2. Get Shipping Rates

**Endpoint:** `POST /api/shipping/dhl/rates`

Get shipping rate quotes for an order.

**Request:**
```json
{
  "orderId": "abc-123"
}
```

**Response:**
```json
{
  "success": true,
  "rates": [
    {
      "productCode": "N",
      "productName": "DOMESTIC EXPRESS",
      "totalPrice": 150000,
      "currency": "IDR",
      "deliveryTime": "1-2 days"
    }
  ]
}
```

### 3. Track Shipment

**Endpoint:** `GET /api/shipping/dhl/tracking?trackingNumber=1234567890`

Get real-time tracking information.

**Response:**
```json
{
  "success": true,
  "trackingNumber": "1234567890",
  "status": "In Transit",
  "events": [
    {
      "timestamp": "2026-05-13T10:00:00Z",
      "location": "Jakarta",
      "description": "Shipment picked up"
    }
  ]
}
```

### 4. Validate Address

**Endpoint:** `POST /api/shipping/dhl/validate-address`

Validate a customer's shipping address.

**Request:**
```json
{
  "countryCode": "ID",
  "postalCode": "14340",
  "cityName": "Jakarta Pusat",
  "strictValidation": true
}
```

**Response:**
```json
{
  "success": true,
  "isValid": true,
  "warnings": [],
  "suggestions": []
}
```

---

## Usage

### From CMS Orders Page

1. Navigate to **CMS → Orders**
2. Select one or more orders
3. Click **"Mark as Shipped"** button
4. System automatically:
   - Creates DHL shipment
   - Generates shipping label (PDF)
   - Gets tracking number
   - Updates order status to "shipped"
   - Saves tracking info to database

### Programmatically

```typescript
// Create shipment for an order
const response = await fetch(`/api/orders/${orderId}/create-shipment`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    serviceLevel: 'standard' // or 'express', 'economy'
  })
})

const data = await response.json()

if (data.success) {
  console.log('Tracking Number:', data.shipmentTrackingNumber)
  console.log('Tracking URL:', data.trackingUrl)
  // data.labelPdf contains the shipping label as base64
}
```

### Using DHL Client Directly

```typescript
import { dhlClient } from '@/lib/dhl/client'

// Create shipment
const shipment = await dhlClient.createShipment({
  plannedShippingDateAndTime: '2026-05-13T17:00:00 GMT+07:00',
  productCode: 'N',
  accounts: [{ typeCode: 'shipper', number: '123456789' }],
  customerDetails: {
    shipperDetails: { /* ... */ },
    receiverDetails: { /* ... */ }
  },
  content: {
    packages: [{ weight: 0.5, dimensions: { length: 30, width: 20, height: 15 } }],
    declaredValue: 199000,
    declaredValueCurrency: 'IDR'
  }
})

// Get tracking info
const tracking = await dhlClient.trackShipment('1234567890')

// Validate address
const validation = await dhlClient.validateAddress({
  type: 'delivery',
  countryCode: 'ID',
  postalCode: '14340',
  cityName: 'Jakarta Pusat'
})
```

---

## Data Flow

### Order to Shipment Flow

```
1. Order Created
   ↓
2. Customer pays
   ↓
3. Admin clicks "Mark as Shipped"
   ↓
4. System fetches order from database
   ↓
5. Validates shipping address exists
   ↓
6. Builds DHL shipment request
   ↓
7. Calls DHL API
   ↓
8. Receives tracking number & label
   ↓
9. Updates order in database
   ↓
10. Returns success to admin
```

### Required Order Data

For shipment creation, the order must have:

- ✅ **Shipping Address** (JSONB in `orders.shipping_address`)
  - `full_name` or fallback to "Customer"
  - `phone` or fallback to "+6281234567890"
  - `email` or fallback to "customer@example.com"
  - `address_line1` (max 45 chars)
  - `city`
  - `postal_code`
  - `country` (ISO 2-letter code)
  
- ✅ **Order Items** with products
  - Product weight (for package calculation)
  - Product dimensions (length, width, height)
  
- ✅ **Order Total** (for customs declaration)

---

## Error Handling

### Common Errors

#### 1. "No shipping address found"
**Cause:** Order doesn't have shipping address data  
**Fix:** Ensure checkout saves shipping address to `orders.shipping_address`

#### 2. "Account not allowed for this service"
**Cause:** Invalid DHL account number or not authorized  
**Fix:** Contact DHL to get valid account number and update `.env`

#### 3. "Unprocessable Entity" (422)
**Cause:** Invalid data format (phone, address, etc.)  
**Fix:** Check `DHL_ERROR_GUIDE.md` for specific field requirements

#### 4. "Bad request" - Date format
**Cause:** Incorrect date format  
**Fix:** Already handled - uses `YYYY-MM-DDTHH:MM:SS GMT+HH:MM` format

### Debug Logging

All API calls include detailed logging:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 DHL API Request [DHL-1778667593602]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 URL: https://express.api.dhl.com/mydhlapi/test/shipments
🔧 Method: POST
📄 Request Body: { ... full JSON ... }
⏰ Timestamp: 2026-05-13T10:19:53.602Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Check your server console for these logs when debugging.

---

## Testing

### Sandbox Testing

1. Use sandbox API URL in `.env`:
   ```env
   DHL_SANDBOX_API_URL=https://express.api.dhl.com/mydhlapi/test
   ```

2. Get sandbox credentials from DHL

3. Test with sample orders

### Test Checklist

- [ ] Create shipment for domestic order (ID → ID)
- [ ] Create shipment for international order (ID → US)
- [ ] Bulk create shipments (multiple orders)
- [ ] Validate address before checkout
- [ ] Track existing shipment
- [ ] Handle errors gracefully
- [ ] Verify shipping label PDF generation
- [ ] Check database updates (tracking number saved)

---

## Production Deployment

### Pre-Deployment Checklist

1. **Get Production Credentials**
   - [ ] Production API key & secret
   - [ ] Production account number
   - [ ] Verify account is authorized for shipment creation

2. **Update Environment Variables**
   ```env
   DHL_PRODUCTION_API_URL=https://express.api.dhl.com/mydhlapi
   DHL_API_KEY=production_key
   DHL_API_SECRET=production_secret
   DHL_ACCOUNT_NUMBER=production_account
   ```

3. **Verify Shipper Information**
   - [ ] Company name is correct
   - [ ] Address is accurate and ≤ 45 characters
   - [ ] Phone includes country code
   - [ ] Email is monitored

4. **Test in Production**
   - [ ] Create test shipment
   - [ ] Verify tracking works
   - [ ] Check label quality
   - [ ] Confirm billing

### Monitoring

Monitor these metrics:
- Shipment creation success rate
- Average API response time
- Failed shipments (check logs)
- Customer complaints about tracking

### Cost Optimization

- Use appropriate service levels (standard vs express)
- Validate addresses to avoid failed deliveries
- Batch process shipments during off-peak hours
- Monitor DHL account charges

---

## API Reference

### DHL Product Codes

| Code | Service Name | Description |
|------|-------------|-------------|
| `N` | DOMESTIC EXPRESS | Standard domestic shipping |
| `P` | EXPRESS WORLDWIDE | International express |
| `U` | EXPRESS WORLDWIDE | International express (alternative) |
| `D` | EXPRESS 9:00 | Next day by 9 AM |
| `K` | EXPRESS 12:00 | Next day by noon |

### Service Levels Mapping

```typescript
const serviceLevelMap = {
  'standard': 'N',    // Domestic Express
  'express': 'P',     // International Express
  'economy': 'N',     // Same as standard for domestic
}
```

### Field Requirements

| Field | Type | Max Length | Required | Format |
|-------|------|-----------|----------|--------|
| `fullName` | string | 35 | Yes | Any |
| `companyName` | string | 35 | Yes | Any |
| `phone` | string | 25 | Yes | `+62123456789` |
| `email` | string | 50 | No | `user@domain.com` |
| `addressLine1` | string | 45 | Yes | Any |
| `addressLine2` | string | 45 | No | Any (not empty string) |
| `cityName` | string | 35 | Yes | Any |
| `postalCode` | string | 12 | Yes | Country-specific |
| `countryCode` | string | 2 | Yes | ISO 2-letter (ID, US, SG) |

---

## Support

### Documentation Files

- `DHL_INTEGRATION.md` - This file (complete guide)
- `DHL_QUICK_START.md` - Quick setup guide
- `DHL_TROUBLESHOOTING.md` - Common issues and solutions
- `DHL_ADDRESS_VALIDATION.md` - Address validation best practices
- `DHL_ERROR_GUIDE.md` - Error codes and fixes

### DHL Resources

- [DHL Developer Portal](https://developer.dhl.com/)
- [API Documentation](https://developer.dhl.com/api-reference/dhl-express-mydhl-api)
- DHL Support: Contact your DHL Express representative

### Code Files

- `/lib/dhl/client.ts` - Main DHL API client
- `/lib/dhl/types.ts` - TypeScript type definitions
- `/lib/dhl/helpers.ts` - Helper functions
- `/lib/dhl/config.ts` - Configuration
- `/app/api/orders/[id]/create-shipment/route.ts` - Shipment creation endpoint
- `/app/api/shipping/dhl/` - DHL API routes

---

## License

This integration is part of the Mykonos e-commerce platform.

---

**Last Updated:** May 13, 2026  
**DHL API Version:** v3.2.2  
**Integration Status:** ✅ Complete and Production-Ready
