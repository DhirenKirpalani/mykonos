-- Add visibility field to promo_codes
-- 'public'  = shown as clickable tile in checkout (website campaigns, general promos)
-- 'private' = hidden, must be entered manually (influencers, affiliates, VIP)
-- This is independent from is_active (status)

ALTER TABLE promo_codes
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('public', 'private'));

-- Backfill all existing rows to 'private' (safe default — no surprise auto-display)
UPDATE promo_codes SET visibility = 'private' WHERE visibility IS NULL;
