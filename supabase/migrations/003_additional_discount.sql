-- Additional manual discount applied at booking completion
-- Run in Supabase Dashboard → SQL Editor
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS additional_discount NUMERIC(10,2) DEFAULT 0;
