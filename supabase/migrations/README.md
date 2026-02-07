# Database Migrations

This directory contains modular SQL migration files for the Mykonos e-commerce platform.

## File Structure

Each table has its own migration file with all related operations:
- Table creation
- Indexes
- Row Level Security (RLS) policies
- Triggers and functions (where applicable)

## Migration Files

### Core Setup
- `00_base.sql` - Extensions, drop statements, cleanup

### User & Authentication
- `01_users.sql` - User profiles, triggers, RLS
- `02_shipping_addresses.sql` - Shipping addresses with default support
- `03_password_reset_tokens.sql` - Password reset token management

### Product Catalog
- `04_collections.sql` - Product collections/categories
- `05_products.sql` - Product catalog

### Shopping & Orders
- `06_cart_items.sql` - Shopping cart
- `07_orders.sql` - Customer orders
- `08_order_items.sql` - Order line items

### Data
- `99_seed_data.sql` - Sample collections and products

## Running Migrations

### Option 1: Run All at Once
```bash
# Concatenate all files in order and run
cat supabase/migrations/*.sql | psql $DATABASE_URL
```

### Option 2: Run Individually (Recommended)
```bash
# Run in order
psql $DATABASE_URL -f supabase/migrations/00_base.sql
psql $DATABASE_URL -f supabase/migrations/01_users.sql
psql $DATABASE_URL -f supabase/migrations/02_shipping_addresses.sql
psql $DATABASE_URL -f supabase/migrations/03_password_reset_tokens.sql
psql $DATABASE_URL -f supabase/migrations/04_collections.sql
psql $DATABASE_URL -f supabase/migrations/05_products.sql
psql $DATABASE_URL -f supabase/migrations/06_cart_items.sql
psql $DATABASE_URL -f supabase/migrations/07_orders.sql
psql $DATABASE_URL -f supabase/migrations/08_order_items.sql
psql $DATABASE_URL -f supabase/migrations/99_seed_data.sql
```

### Option 3: Using Supabase CLI
```bash
# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

## Important Notes

1. **Order Matters**: Files are numbered to ensure correct execution order due to foreign key dependencies.

2. **Drop Statements**: `00_base.sql` includes DROP statements to clean up existing tables. Be careful when running this in production!

3. **RLS Policies**: All tables have Row Level Security enabled with appropriate policies to ensure data isolation.

4. **Seed Data**: `99_seed_data.sql` contains sample data for testing. Skip this in production or replace with your own data.

## After Running Migrations

1. **Regenerate TypeScript Types**:
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/database.types.ts
   ```

2. **Verify Tables**:
   ```sql
   -- Check all tables were created
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   
   -- Check RLS is enabled
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
   ```

3. **Test Policies**:
   - Try accessing data as an authenticated user
   - Verify users can only see their own data
   - Test public access to products and collections

## Rollback

To rollback all changes:
```bash
psql $DATABASE_URL -f supabase/migrations/00_base.sql
```

This will drop all tables and you can start fresh.

## Table Dependencies

```
auth.users (Supabase managed)
  ├── users
  ├── shipping_addresses
  ├── password_reset_tokens
  ├── cart_items
  │   └── products
  └── orders
      └── order_items
          └── products

collections (independent)
products (independent, references collections by name)
```
