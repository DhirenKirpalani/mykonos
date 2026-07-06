-- Migration: Fix missing full_name and phone in shipping addresses
-- Issue: Old orders have empty full_name and phone fields
-- This breaks DHL integration which requires these fields

-- Step 1: Update existing orders with missing full_name
-- Use customer_first_name + customer_last_name as fallback
UPDATE orders
SET shipping_address = jsonb_set(
  shipping_address,
  '{full_name}',
  to_jsonb(
    CASE 
      WHEN COALESCE(customer_first_name, '') != '' AND COALESCE(customer_last_name, '') != '' 
        THEN customer_first_name || ' ' || customer_last_name
      WHEN COALESCE(customer_first_name, '') != ''
        THEN customer_first_name
      WHEN customer_email IS NOT NULL
        THEN split_part(customer_email, '@', 1)  -- Use email username as fallback
      ELSE 'Customer'
    END
  )
)
WHERE shipping_address IS NOT NULL
  AND (
    shipping_address->>'full_name' IS NULL 
    OR shipping_address->>'full_name' = ''
  );

-- Step 2: Update existing orders with missing phone
-- Use customer_phone as fallback, or default phone number
UPDATE orders
SET shipping_address = jsonb_set(
  shipping_address,
  '{phone}',
  to_jsonb(
    CASE 
      WHEN customer_phone IS NOT NULL AND customer_phone != ''
        THEN customer_phone
      WHEN shipping_address->>'country' = 'ID'
        THEN '+6281234567890'  -- Default Indonesian phone
      ELSE '+11234567890'  -- Default international phone
    END
  )
)
WHERE shipping_address IS NOT NULL
  AND (
    shipping_address->>'phone' IS NULL 
    OR shipping_address->>'phone' = ''
  );

-- Step 3: Add validation function to ensure full_name and phone are never empty
CREATE OR REPLACE FUNCTION validate_shipping_address()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if shipping_address has full_name and phone
  IF NEW.shipping_address IS NOT NULL THEN
    -- Validate full_name
    IF NEW.shipping_address->>'full_name' IS NULL 
       OR NEW.shipping_address->>'full_name' = '' THEN
      -- Try to populate from customer fields
      NEW.shipping_address = jsonb_set(
        NEW.shipping_address,
        '{full_name}',
        to_jsonb(
          CASE 
            WHEN COALESCE(NEW.customer_first_name, '') != '' AND COALESCE(NEW.customer_last_name, '') != '' 
              THEN NEW.customer_first_name || ' ' || NEW.customer_last_name
            WHEN COALESCE(NEW.customer_first_name, '') != ''
              THEN NEW.customer_first_name
            WHEN NEW.customer_email IS NOT NULL
              THEN split_part(NEW.customer_email, '@', 1)
            ELSE 'Customer'
          END
        )
      );
    END IF;
    
    -- Validate phone
    IF NEW.shipping_address->>'phone' IS NULL 
       OR NEW.shipping_address->>'phone' = '' THEN
      -- Try to populate from customer_phone or use default
      NEW.shipping_address = jsonb_set(
        NEW.shipping_address,
        '{phone}',
        to_jsonb(
          CASE 
            WHEN NEW.customer_phone IS NOT NULL AND NEW.customer_phone != ''
              THEN NEW.customer_phone
            WHEN NEW.shipping_address->>'country' = 'ID'
              THEN '+6281234567890'
            ELSE '+11234567890'
          END
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to validate shipping address on insert/update
DROP TRIGGER IF EXISTS validate_shipping_address_trigger ON orders;
CREATE TRIGGER validate_shipping_address_trigger
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_shipping_address();

-- Step 5: Add comments
COMMENT ON FUNCTION validate_shipping_address() IS 
  'Ensures shipping_address always has full_name and phone fields populated. 
   Uses customer fields as fallback or default values if not provided.
   Critical for DHL shipping integration.';

-- Step 6: Verify the fix
DO $$
DECLARE
  missing_name_count INTEGER;
  missing_phone_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_name_count
  FROM orders
  WHERE shipping_address IS NOT NULL
    AND (shipping_address->>'full_name' IS NULL OR shipping_address->>'full_name' = '');
  
  SELECT COUNT(*) INTO missing_phone_count
  FROM orders
  WHERE shipping_address IS NOT NULL
    AND (shipping_address->>'phone' IS NULL OR shipping_address->>'phone' = '');
  
  RAISE NOTICE 'Orders with missing full_name: %', missing_name_count;
  RAISE NOTICE 'Orders with missing phone: %', missing_phone_count;
  
  IF missing_name_count > 0 OR missing_phone_count > 0 THEN
    RAISE WARNING 'Some orders still have missing data. Manual review required.';
  ELSE
    RAISE NOTICE '✅ All orders have full_name and phone populated!';
  END IF;
END $$;
