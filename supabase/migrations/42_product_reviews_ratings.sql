-- Product Reviews and Ratings System

-- Product reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review_text TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- Review helpful votes
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review ON review_helpful_votes(review_id);

-- Row Level Security
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "Anyone can view reviews" 
  ON product_reviews FOR SELECT 
  USING (true);

-- Users can create their own reviews
CREATE POLICY "Users can create reviews" 
  ON product_reviews FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews" 
  ON product_reviews FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews" 
  ON product_reviews FOR DELETE 
  USING (auth.uid() = user_id);

-- Anyone can view helpful votes
CREATE POLICY "Anyone can view helpful votes" 
  ON review_helpful_votes FOR SELECT 
  USING (true);

-- Users can mark reviews as helpful
CREATE POLICY "Users can mark reviews helpful" 
  ON review_helpful_votes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their helpful votes
CREATE POLICY "Users can remove helpful votes" 
  ON review_helpful_votes FOR DELETE 
  USING (auth.uid() = user_id);

-- Function to update helpful count
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE product_reviews 
    SET helpful_count = helpful_count + 1 
    WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE product_reviews 
    SET helpful_count = helpful_count - 1 
    WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update helpful count
CREATE TRIGGER on_helpful_vote_change
  AFTER INSERT OR DELETE ON review_helpful_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpful_count();

-- Function to get product average rating
CREATE OR REPLACE FUNCTION get_product_average_rating(p_product_id UUID)
RETURNS TABLE (
  average_rating NUMERIC,
  total_reviews INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(rating)::NUMERIC, 1) as average_rating,
    COUNT(*)::INTEGER as total_reviews
  FROM product_reviews
  WHERE product_id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark review as verified purchase
CREATE OR REPLACE FUNCTION mark_verified_purchase_reviews()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark reviews as verified if user has purchased the product
  UPDATE product_reviews pr
  SET is_verified_purchase = true
  WHERE pr.user_id = NEW.user_id
    AND pr.product_id IN (
      SELECT oi.product_id
      FROM order_items oi
      WHERE oi.order_id = NEW.id
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to mark verified purchases when order is completed
CREATE TRIGGER on_order_completed_mark_verified
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'delivered')
  EXECUTE FUNCTION mark_verified_purchase_reviews();

COMMENT ON TABLE product_reviews IS 'Customer reviews and ratings for products';
COMMENT ON TABLE review_helpful_votes IS 'Tracks which users found reviews helpful';
