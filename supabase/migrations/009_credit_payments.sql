-- Customer credit settlement payments
-- Tracks repayments made against the credit balance customers accrued
-- via bookings (bookings.credit_amount). Outstanding balance per customer
-- = SUM(bookings.credit_amount) - SUM(credit_payments.amount).
-- Run in Supabase Dashboard → SQL Editor.

CREATE TABLE IF NOT EXISTS credit_payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  paid_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note        TEXT,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_payments_customer ON credit_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_payments_paid_at  ON credit_payments(paid_at DESC);

ALTER TABLE credit_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access"
  ON credit_payments FOR ALL USING (auth.role() = 'authenticated');
