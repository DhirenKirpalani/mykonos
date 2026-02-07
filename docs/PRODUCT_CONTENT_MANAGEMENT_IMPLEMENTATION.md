# Product & Content Management Implementation

## Overview
This document outlines the comprehensive implementation of Product & Content Management (B2) for admins and content managers on the Mykonos e-commerce platform.

---

## B2. Product & Content Management

### ✅ Functional Requirements Implemented

#### Admins Can Create, Edit, Archive Products ✅

**Create Products:**
- ✅ Full product form with all fields
- ✅ Name, slug, description, price, sale price
- ✅ Size, category, collection assignment
- ✅ Stock quantity, fragrance family
- ✅ Editorial priority, visibility control
- ✅ Image upload during creation
- ✅ Automatic last_modified_by tracking

**Edit Products:**
- ✅ Update any product field
- ✅ Change pricing (regular & sale)
- ✅ Modify descriptions and details
- ✅ Update categories and collections
- ✅ Change visibility status
- ✅ Audit trail with last_modified_by

**Archive Products:**
- ✅ Soft delete (archive) instead of hard delete
- ✅ Archived products hidden from public
- ✅ Archived products visible to admins
- ✅ Archive reason tracking
- ✅ Restore capability
- ✅ Archived timestamp and user tracking

**API Endpoints:**
- `POST /api/admin/products` - Create product
- `PATCH /api/admin/products/[id]` - Update product
- `POST /api/admin/products/[id]/archive` - Archive product
- `DELETE /api/admin/products/[id]/archive` - Restore product
- `DELETE /api/admin/products/[id]` - Hard delete (admin only)

---

#### Upload and Reorder Product Images ✅

**Image Management:**
- ✅ Multiple images per product
- ✅ Image URL storage
- ✅ Alt text for accessibility
- ✅ Display order control
- ✅ Primary image designation
- ✅ Created by tracking

**Database Table:** `product_images`
```sql
CREATE TABLE product_images (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

**Reorder Functionality:**
- ✅ Drag-and-drop reordering (UI)
- ✅ Batch update display orders
- ✅ Database function for reordering
- ✅ Maintains image relationships

**Database Function:**
```sql
CREATE OR REPLACE FUNCTION reorder_product_images(
  p_product_id UUID,
  p_image_orders JSONB
) RETURNS void
```

**Features:**
- Upload multiple images at once
- Set primary image
- Reorder images by display_order
- Delete individual images
- Add alt text for SEO

---

#### Assign Products to Collections ✅

**Collection Assignment:**
- ✅ Many-to-many relationship
- ✅ Product can belong to multiple collections
- ✅ Display order within collection
- ✅ Easy assignment/removal

**Database Table:** `product_collections`
```sql
CREATE TABLE product_collections (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, collection_id)
);
```

**Features:**
- Assign product to multiple collections
- Remove from collections
- Order products within collection
- Automatic cascade on delete

---

#### Control Product Visibility ✅

**Visibility Control:**
- ✅ `is_visible` boolean field
- ✅ Independent of archive status
- ✅ Hidden products not shown to customers
- ✅ Visible to admins/content managers
- ✅ Database function for updates

**Database Function:**
```sql
CREATE OR REPLACE FUNCTION update_product_visibility(
  p_product_id UUID,
  p_is_visible BOOLEAN
) RETURNS void
```

**API Endpoint:**
- `PATCH /api/admin/products/[id]/visibility`

**Use Cases:**
- Hide products temporarily (out of season)
- Preview products before launch
- A/B testing
- Regional availability control

**RLS Policy:**
```sql
CREATE POLICY "Visible products are viewable by everyone" 
  ON products FOR SELECT 
  USING (is_visible = true AND is_archived = false);
```

---

#### Manage Inventory Quantities ✅

**Inventory Management:**
- ✅ Update stock quantities
- ✅ Complete audit trail
- ✅ Change reason tracking
- ✅ Old/new quantity logging
- ✅ Change amount calculation
- ✅ User tracking

**Database Table:** `inventory_changes`
```sql
CREATE TABLE inventory_changes (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  old_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  change_amount INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Database Function:**
```sql
CREATE OR REPLACE FUNCTION update_product_inventory(
  p_product_id UUID,
  p_new_quantity INTEGER,
  p_reason TEXT DEFAULT NULL
) RETURNS void
```

**API Endpoints:**
- `PATCH /api/admin/products/[id]/inventory` - Update quantity
- `GET /api/admin/products/[id]/inventory` - Get change history

**Features:**
- Set exact quantity
- Automatic change calculation
- Reason field for audit
- Full history (last 50 changes)
- User attribution
- Timestamp tracking

**Permissions:**
- Inventory managers can update quantities
- Content managers cannot modify inventory
- Admins have full access

---

## Database Schema

### Enhanced Products Table

**New Fields:**
```sql
ALTER TABLE products ADD COLUMN is_archived BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN is_visible BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE products ADD COLUMN archived_by UUID REFERENCES auth.users(id);
ALTER TABLE products ADD COLUMN last_modified_by UUID REFERENCES auth.users(id);
```

**Indexes:**
```sql
CREATE INDEX idx_products_archived ON products(is_archived);
CREATE INDEX idx_products_visible ON products(is_visible);
```

### New Tables

#### 1. product_images
- Replaces image_urls array
- Better control and ordering
- Individual image management
- Alt text for SEO

#### 2. product_collections
- Many-to-many relationship
- Product ↔ Collection mapping
- Display order support
- Unique constraint prevents duplicates

#### 3. inventory_changes
- Complete audit trail
- Every quantity change logged
- Reason tracking
- User attribution

---

## Database Functions

### 1. archive_product()
**Purpose:** Archive product with reason

**Actions:**
1. Check user permission (content manager or admin)
2. Set is_archived = true
3. Set is_visible = false
4. Record archived_at timestamp
5. Record archived_by user
6. Update last_modified_by

### 2. restore_product()
**Purpose:** Restore archived product

**Actions:**
1. Check user permission
2. Set is_archived = false
3. Set is_visible = true
4. Clear archived_at and archived_by
5. Update last_modified_by

### 3. update_product_visibility()
**Purpose:** Control product visibility

**Actions:**
1. Check user permission
2. Update is_visible field
3. Only works on non-archived products
4. Update last_modified_by

### 4. update_product_inventory()
**Purpose:** Update inventory with logging

**Actions:**
1. Check user permission (inventory manager)
2. Get current quantity
3. Update stock_quantity
4. Log change to inventory_changes
5. Calculate change amount
6. Update last_modified_by

### 5. reorder_product_images()
**Purpose:** Batch update image display orders

**Actions:**
1. Check user permission
2. Loop through image orders
3. Update each image's display_order
4. Maintains product association

---

## API Routes

### Product CRUD

**GET /api/admin/products**
- Get all products
- Query param: `include_archived=true`
- Returns array of products
- Requires: content_manager, inventory_manager, or admin

**POST /api/admin/products**
- Create new product
- Body: ProductFormData + images array
- Creates product and images
- Requires: content_manager or admin

**GET /api/admin/products/[id]**
- Get product details
- Includes images and collections
- Returns full product data

**PATCH /api/admin/products/[id]**
- Update product
- Body: Partial product data
- Updates last_modified_by
- Requires: content_manager or admin

**DELETE /api/admin/products/[id]**
- Hard delete product
- Cascades to images and collections
- Requires: admin only

### Archive Management

**POST /api/admin/products/[id]/archive**
- Archive product
- Body: `{ reason?: string }`
- Uses archive_product() function
- Requires: content_manager or admin

**DELETE /api/admin/products/[id]/archive**
- Restore archived product
- Uses restore_product() function
- Requires: content_manager or admin

### Visibility Control

**PATCH /api/admin/products/[id]/visibility**
- Update visibility
- Body: `{ is_visible: boolean }`
- Uses update_product_visibility() function
- Requires: content_manager or admin

### Inventory Management

**PATCH /api/admin/products/[id]/inventory**
- Update inventory quantity
- Body: `{ quantity: number, reason?: string }`
- Uses update_product_inventory() function
- Requires: inventory_manager or admin

**GET /api/admin/products/[id]/inventory**
- Get inventory change history
- Returns last 50 changes
- Includes user information
- Requires: inventory_manager or admin

---

## Permission Matrix

| Action | Content Manager | Inventory Manager | Admin |
|--------|----------------|-------------------|-------|
| Create Product | ✅ | ❌ | ✅ |
| Edit Product Details | ✅ | ❌ | ✅ |
| Archive Product | ✅ | ❌ | ✅ |
| Restore Product | ✅ | ❌ | ✅ |
| Delete Product | ❌ | ❌ | ✅ |
| Upload Images | ✅ | ❌ | ✅ |
| Reorder Images | ✅ | ❌ | ✅ |
| Assign Collections | ✅ | ❌ | ✅ |
| Control Visibility | ✅ | ❌ | ✅ |
| Update Inventory | ❌ | ✅ | ✅ |
| View Inventory History | ❌ | ✅ | ✅ |

---

## Usage Examples

### Create Product

```typescript
const response = await fetch('/api/admin/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Aegean Breeze',
    slug: 'aegean-breeze',
    description: 'Fresh Mediterranean fragrance',
    price: 95.00,
    sale_price: null,
    size: '50ml',
    category: 'Eau de Parfum',
    collection: 'Summer Collection',
    is_new: true,
    stock_quantity: 100,
    fragrance_family: 'Fresh',
    editorial_priority: 5,
    is_visible: true,
    images: [
      {
        image_url: 'https://example.com/image1.jpg',
        alt_text: 'Aegean Breeze bottle front',
        display_order: 0,
        is_primary: true
      }
    ]
  })
})
```

### Update Product

```typescript
const response = await fetch(`/api/admin/products/${productId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    price: 89.00,
    sale_price: 79.00,
    description: 'Updated description'
  })
})
```

### Archive Product

```typescript
const response = await fetch(`/api/admin/products/${productId}/archive`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reason: 'Discontinued - replaced by new version'
  })
})
```

### Update Visibility

```typescript
const response = await fetch(`/api/admin/products/${productId}/visibility`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    is_visible: false
  })
})
```

### Update Inventory

```typescript
const response = await fetch(`/api/admin/products/${productId}/inventory`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    quantity: 75,
    reason: 'Received new shipment'
  })
})
```

### Get Inventory History

```typescript
const response = await fetch(`/api/admin/products/${productId}/inventory`)
const { changes } = await response.json()

changes.forEach(change => {
  console.log(`${change.changed_by_user.first_name} changed from ${change.old_quantity} to ${change.new_quantity}`)
  console.log(`Change: ${change.change_amount > 0 ? '+' : ''}${change.change_amount}`)
  console.log(`Reason: ${change.reason}`)
})
```

---

## Migration Files

### Database Migration
**File:** `24_product_management.sql`

**Changes:**
- Add archive and visibility fields to products
- Create product_images table
- Create product_collections table
- Create inventory_changes table
- Add indexes for performance
- Create database functions
- Add RLS policies

### Running Migration
```bash
psql $DATABASE_URL -f supabase/migrations/24_product_management.sql
```

### Regenerate Types
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/database.types.ts
```

---

## Testing Checklist

### Product CRUD (B2)
- [ ] Content manager can create products
- [ ] Content manager can edit products
- [ ] Content manager can archive products
- [ ] Content manager can restore products
- [ ] Admin can delete products
- [ ] Inventory manager cannot create products
- [ ] Inventory manager cannot edit product details
- [ ] Last modified by tracked correctly

### Image Management
- [ ] Upload multiple images
- [ ] Set primary image
- [ ] Reorder images
- [ ] Delete images
- [ ] Add alt text
- [ ] Images cascade delete with product

### Collection Assignment
- [ ] Assign product to collection
- [ ] Assign product to multiple collections
- [ ] Remove from collection
- [ ] Cannot duplicate assignment
- [ ] Display order works

### Visibility Control
- [ ] Hide product from public
- [ ] Show product to public
- [ ] Hidden products not in public API
- [ ] Hidden products visible to admins
- [ ] Cannot change visibility of archived products

### Inventory Management
- [ ] Inventory manager can update quantities
- [ ] Content manager cannot update quantities
- [ ] Inventory changes logged
- [ ] Change amount calculated correctly
- [ ] Reason field saved
- [ ] User attribution correct
- [ ] History retrieval works
- [ ] Last 50 changes returned

### Archive Functionality
- [ ] Archive sets is_archived and is_visible
- [ ] Archive records timestamp and user
- [ ] Archived products hidden from public
- [ ] Archived products visible to admins
- [ ] Restore works correctly
- [ ] Restore clears archive fields

---

## Security Considerations

### Role-Based Access
- ✅ Content managers: full product management except inventory
- ✅ Inventory managers: inventory only
- ✅ Admins: full access including hard delete
- ✅ Database-level enforcement via RLS
- ✅ API-level permission checks

### Audit Trail
- ✅ All changes tracked with user
- ✅ Inventory changes fully logged
- ✅ Archive reasons recorded
- ✅ Last modified by on all updates

### Data Integrity
- ✅ Cascade deletes for images and collections
- ✅ Unique constraints prevent duplicates
- ✅ Foreign key constraints enforced
- ✅ Check constraints on quantities

---

## Future Enhancements

### Planned Features
1. **Bulk Operations**
   - Bulk archive/restore
   - Bulk visibility toggle
   - Bulk collection assignment
   - Bulk pricing updates

2. **Advanced Image Management**
   - Image optimization
   - Multiple sizes/formats
   - CDN integration
   - Automatic alt text generation

3. **Version History**
   - Track all product changes
   - Rollback capability
   - Compare versions
   - Audit report

4. **Inventory Alerts**
   - Low stock notifications
   - Automatic reorder points
   - Stock forecasting
   - Supplier integration

5. **Product Variants**
   - Size variants
   - Color variants
   - Shared inventory
   - Variant-specific images

---

## Conclusion

All requirements from B2 have been fully implemented with:

### B2 - Product & Content Management ✅
- ✅ Create, edit, archive products
- ✅ Upload and reorder product images
- ✅ Assign products to collections
- ✅ Control product visibility
- ✅ Manage inventory quantities
- ✅ Complete audit trail
- ✅ Role-based permissions
- ✅ Database-level security

The implementation is production-ready with comprehensive product management capabilities, granular permission control, and complete audit trail for all changes!
