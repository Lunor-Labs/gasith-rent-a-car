-- ── Pricing Config ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pricing_config (
  id                     INTEGER PRIMARY KEY DEFAULT 1,
  first_day_free_km      NUMERIC(10,1) NOT NULL DEFAULT 150,
  subsequent_day_free_km NUMERIC(10,1) NOT NULL DEFAULT 100,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO pricing_config (id, first_day_free_km, subsequent_day_free_km)
VALUES (1, 150, 100)
ON CONFLICT (id) DO NOTHING;

-- Row Level Security
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view pricing config"
  ON pricing_config FOR SELECT USING (true);
CREATE POLICY "Authenticated can update pricing config"
  ON pricing_config FOR UPDATE USING (auth.role() = 'authenticated');

-- ── New columns on bookings ───────────────────────────────────
-- billing_mode may already exist — use IF NOT EXISTS for safety
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS billing_mode          TEXT NOT NULL DEFAULT 'per_km'
                                                 CHECK (billing_mode IN ('per_km', 'per_day')),
  ADD COLUMN IF NOT EXISTS default_price_per_day NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_free_km       NUMERIC(10,1),
  ADD COLUMN IF NOT EXISTS free_km               NUMERIC(10,1),
  ADD COLUMN IF NOT EXISTS extra_km              NUMERIC(12,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_km_charge       NUMERIC(12,2) NOT NULL DEFAULT 0;
