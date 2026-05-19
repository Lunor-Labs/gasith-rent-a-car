-- Per-booking overrides for free-KM rates
-- Run in Supabase Dashboard → SQL Editor
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_first_day_free_km    NUMERIC(10,1),
  ADD COLUMN IF NOT EXISTS booking_subsequent_day_free_km NUMERIC(10,1);
