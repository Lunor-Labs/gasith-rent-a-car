-- Flat commission amount for outsourced bookings
-- Default logic: < LKR 5,000 → LKR 500 flat; >= LKR 5,000 → 10%
-- Admin can override with any custom amount.
-- Run in Supabase Dashboard → SQL Editor
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10,2) DEFAULT NULL;
