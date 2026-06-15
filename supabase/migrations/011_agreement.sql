-- Add agreement fields to bookings
ALTER TABLE bookings
  ADD COLUMN agreement_url        TEXT,
  ADD COLUMN agreement_signature  TEXT,
  ADD COLUMN agreement_signed_at  TIMESTAMPTZ;

-- Company signatory config (single-row table)
CREATE TABLE app_config (
  id                      INTEGER PRIMARY KEY DEFAULT 1,
  company_signatory_name  TEXT,
  company_signatory_title TEXT,
  company_signature       TEXT
);

INSERT INTO app_config (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;
