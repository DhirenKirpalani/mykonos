-- Sales & Reporting
-- Support for sales analytics, product performance, and regional sales reporting

-- View for sales summary
CREATE OR REPLACE VIEW sales_summary AS
SELECT 
  o.id as order_id,
  o.order_number,
  o.user_id,
  o.status,
  o.created_at as order_date,
  o.subtotal as gross_sales,
  o.discount_amount,
  o.shipping_cost,
  o.tax_amount,
  o.total_amount as net_sales,
  o.currency_code,
  sa.country as shipping_country,
  pc.code as promo_code,
  pc.discount_type,
  CASE 
    WHEN o.status IN ('delivered', 'completed') THEN true
    ELSE false
  END as is_completed
FROM orders o
LEFT JOIN shipping_addresses sa ON sa.id = o.shipping_address_id
LEFT JOIN promo_codes pc ON pc.id = o.promo_code_id
WHERE o.status NOT IN ('cancelled', 'refunded');

-- View for product sales performance
CREATE OR REPLACE VIEW product_sales_report AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.slug,
  p.category,
  p.collection,
  COUNT(DISTINCT oi.order_id) as total_orders,
  SUM(oi.quantity) as units_sold,
  SUM(oi.price_at_purchase * oi.quantity) as gross_revenue,
  AVG(oi.price_at_purchase) as avg_price,
  MIN(o.created_at) as first_sale_date,
  MAX(o.created_at) as last_sale_date
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN orders o ON o.id = oi.order_id AND o.status NOT IN ('cancelled', 'refunded')
GROUP BY p.id, p.name, p.slug, p.category, p.collection;

-- View for regional sales performance
CREATE OR REPLACE VIEW regional_sales_report AS
SELECT 
  sa.country,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT o.user_id) as unique_customers,
  SUM(o.subtotal) as gross_sales,
  SUM(o.discount_amount) as total_discounts,
  SUM(o.shipping_cost) as total_shipping,
  SUM(o.tax_amount) as total_tax,
  SUM(o.total_amount) as net_sales,
  AVG(o.total_amount) as avg_order_value,
  COUNT(DISTINCT CASE WHEN o.status IN ('delivered', 'completed') THEN o.id END) as completed_orders
FROM orders o
LEFT JOIN shipping_addresses sa ON sa.id = o.shipping_address_id
WHERE o.status NOT IN ('cancelled', 'refunded')
GROUP BY sa.country;

-- View for discount performance
CREATE OR REPLACE VIEW discount_report AS
SELECT 
  pc.id as promo_code_id,
  pc.code as promo_code,
  pc.discount_type,
  pc.discount_value,
  COUNT(DISTINCT o.id) as times_used,
  SUM(o.discount_amount) as total_discount_given,
  SUM(o.total_amount) as total_revenue,
  AVG(o.discount_amount) as avg_discount,
  MIN(o.created_at) as first_used,
  MAX(o.created_at) as last_used
FROM promo_codes pc
LEFT JOIN orders o ON o.promo_code_id = pc.id AND o.status NOT IN ('cancelled', 'refunded')
GROUP BY pc.id, pc.code, pc.discount_type, pc.discount_value;

-- View for daily sales summary
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT 
  DATE(o.created_at) as sale_date,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT o.user_id) as unique_customers,
  SUM(o.subtotal) as gross_sales,
  SUM(o.discount_amount) as total_discounts,
  SUM(o.shipping_cost) as total_shipping,
  SUM(o.tax_amount) as total_tax,
  SUM(o.total_amount) as net_sales,
  AVG(o.total_amount) as avg_order_value
FROM orders o
WHERE o.status NOT IN ('cancelled', 'refunded')
GROUP BY DATE(o.created_at)
ORDER BY sale_date DESC;

-- Function to get sales report with date range
CREATE OR REPLACE FUNCTION get_sales_report(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
) RETURNS TABLE (
  total_orders BIGINT,
  gross_sales NUMERIC,
  total_discounts NUMERIC,
  total_shipping NUMERIC,
  total_tax NUMERIC,
  net_sales NUMERIC,
  avg_order_value NUMERIC,
  completed_orders BIGINT,
  unique_customers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT o.id)::BIGINT as total_orders,
    COALESCE(SUM(o.subtotal), 0) as gross_sales,
    COALESCE(SUM(o.discount_amount), 0) as total_discounts,
    COALESCE(SUM(o.shipping_cost), 0) as total_shipping,
    COALESCE(SUM(o.tax_amount), 0) as total_tax,
    COALESCE(SUM(o.total_amount), 0) as net_sales,
    COALESCE(AVG(o.total_amount), 0) as avg_order_value,
    COUNT(DISTINCT CASE WHEN o.status IN ('delivered', 'completed') THEN o.id END)::BIGINT as completed_orders,
    COUNT(DISTINCT o.user_id)::BIGINT as unique_customers
  FROM orders o
  WHERE o.status NOT IN ('cancelled', 'refunded')
    AND o.created_at >= p_start_date
    AND o.created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get product sales report with date range
CREATE OR REPLACE FUNCTION get_product_sales_report(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  category TEXT,
  collection TEXT,
  units_sold BIGINT,
  gross_revenue NUMERIC,
  avg_price NUMERIC,
  total_orders BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    p.category,
    p.collection,
    COALESCE(SUM(oi.quantity), 0)::BIGINT as units_sold,
    COALESCE(SUM(oi.price_at_purchase * oi.quantity), 0) as gross_revenue,
    COALESCE(AVG(oi.price_at_purchase), 0) as avg_price,
    COUNT(DISTINCT oi.order_id)::BIGINT as total_orders
  FROM products p
  LEFT JOIN order_items oi ON oi.product_id = p.id
  LEFT JOIN orders o ON o.id = oi.order_id 
    AND o.status NOT IN ('cancelled', 'refunded')
    AND (p_start_date IS NULL OR o.created_at >= p_start_date)
    AND (p_end_date IS NULL OR o.created_at <= p_end_date)
  GROUP BY p.id, p.name, p.category, p.collection
  ORDER BY gross_revenue DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get regional sales report with date range
CREATE OR REPLACE FUNCTION get_regional_sales_report(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS TABLE (
  country TEXT,
  total_orders BIGINT,
  unique_customers BIGINT,
  gross_sales NUMERIC,
  total_discounts NUMERIC,
  net_sales NUMERIC,
  avg_order_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.country,
    COUNT(DISTINCT o.id)::BIGINT as total_orders,
    COUNT(DISTINCT o.user_id)::BIGINT as unique_customers,
    COALESCE(SUM(o.subtotal), 0) as gross_sales,
    COALESCE(SUM(o.discount_amount), 0) as total_discounts,
    COALESCE(SUM(o.total_amount), 0) as net_sales,
    COALESCE(AVG(o.total_amount), 0) as avg_order_value
  FROM orders o
  LEFT JOIN shipping_addresses sa ON sa.id = o.shipping_address_id
  WHERE o.status NOT IN ('cancelled', 'refunded')
    AND (p_start_date IS NULL OR o.created_at >= p_start_date)
    AND (p_end_date IS NULL OR o.created_at <= p_end_date)
  GROUP BY sa.country
  ORDER BY net_sales DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get discount performance report
CREATE OR REPLACE FUNCTION get_discount_report(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS TABLE (
  promo_code TEXT,
  discount_type TEXT,
  times_used BIGINT,
  total_discount_given NUMERIC,
  total_revenue NUMERIC,
  avg_discount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.code as promo_code,
    pc.discount_type,
    COUNT(DISTINCT o.id)::BIGINT as times_used,
    COALESCE(SUM(o.discount_amount), 0) as total_discount_given,
    COALESCE(SUM(o.total_amount), 0) as total_revenue,
    COALESCE(AVG(o.discount_amount), 0) as avg_discount
  FROM promo_codes pc
  LEFT JOIN orders o ON o.promo_code_id = pc.id 
    AND o.status NOT IN ('cancelled', 'refunded')
    AND (p_start_date IS NULL OR o.created_at >= p_start_date)
    AND (p_end_date IS NULL OR o.created_at <= p_end_date)
  WHERE EXISTS (
    SELECT 1 FROM orders 
    WHERE promo_code_id = pc.id 
    AND status NOT IN ('cancelled', 'refunded')
  )
  GROUP BY pc.id, pc.code, pc.discount_type
  ORDER BY total_discount_given DESC;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security for views
-- Views inherit RLS from underlying tables, so no additional policies needed
