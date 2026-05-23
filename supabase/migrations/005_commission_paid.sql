-- Track whether the commission for outsourced bookings has been settled/paid out
-- Run in Supabase Dashboard → SQL Editor
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN DEFAULT FALSE;
