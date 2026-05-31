-- Due date & actual return date + Payment method tracking
-- Run in Supabase Dashboard → SQL Editor

-- Due date: the date the vehicle was expected to be returned (used for billing)
-- Actual return date: the date the vehicle was physically handed back (for records)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_return_date TIMESTAMPTZ;

-- Payment method: cash, credit, or mixed
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'credit', 'mixed')),
  ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS credit_amount NUMERIC(12,2);
