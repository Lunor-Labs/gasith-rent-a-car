-- Add blacklist fields to customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS is_blacklisted    BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS blacklisted_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blacklist_reason  TEXT        DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_customers_blacklisted ON customers (is_blacklisted);
