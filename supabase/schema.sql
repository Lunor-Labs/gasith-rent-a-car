-- ============================================================
-- Supabase Schema for Gasith Rent-a-Car
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Vehicles ─────────────────────────────────────────────────
CREATE TABLE vehicles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,
  plate       TEXT NOT NULL UNIQUE,
  price_per_km    NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_per_day   NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_outsourced   BOOLEAN NOT NULL DEFAULT FALSE,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10,
  last_meter_reading NUMERIC(12,1) NOT NULL DEFAULT 0,
  image_url       TEXT DEFAULT '',
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_landing BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Customers ────────────────────────────────────────────────
CREATE TABLE customers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  phone             TEXT,
  email             TEXT,
  address           TEXT,
  nic_number        TEXT,
  nic_front_url     TEXT DEFAULT '',
  nic_back_url      TEXT DEFAULT '',
  driving_license_url TEXT DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Bookings ─────────────────────────────────────────────────
CREATE TABLE bookings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id        UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  start_date        TIMESTAMPTZ NOT NULL,
  end_date          TIMESTAMPTZ,
  start_meter_reading NUMERIC(12,1) NOT NULL DEFAULT 0,
  end_meter_reading   NUMERIC(12,1),
  total_km          NUMERIC(12,1) NOT NULL DEFAULT 0,
  price_per_km      NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_per_day     NUMERIC(10,2) NOT NULL DEFAULT 0,
  base_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  final_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_outsourced     BOOLEAN NOT NULL DEFAULT FALSE,
  outsourced_payment NUMERIC(12,2),
  commission_rate   NUMERIC(5,2) NOT NULL DEFAULT 10,
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'cancelled')),
  invoice_url       TEXT DEFAULT '',
  notes             TEXT DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Meter Readings ───────────────────────────────────────────
CREATE TABLE meter_readings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reading     NUMERIC(12,1) NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('start', 'end')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by TEXT DEFAULT 'admin'
);

-- ── Invoices ─────────────────────────────────────────────────
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  pdf_url         TEXT DEFAULT '',
  whatsapp_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- ── Revenue (monthly aggregates) ─────────────────────────────
CREATE TABLE revenue (
  month          TEXT PRIMARY KEY,  -- format: 'yyyy-MM'
  total_revenue  NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_bookings INTEGER NOT NULL DEFAULT 0,
  total_km       NUMERIC(14,1) NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_vehicle ON bookings(vehicle_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);
CREATE INDEX idx_vehicles_landing ON vehicles(show_on_landing)
  WHERE show_on_landing = TRUE;
CREATE INDEX idx_vehicles_created ON vehicles(created_at DESC);
CREATE INDEX idx_customers_created ON customers(created_at DESC);
CREATE INDEX idx_meter_readings_vehicle ON meter_readings(vehicle_id);
CREATE INDEX idx_invoices_booking ON invoices(booking_id);

-- ── Row Level Security ───────────────────────────────────────
-- Vehicles: public read, authenticated write
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view vehicles"
  ON vehicles FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage vehicles"
  ON vehicles FOR ALL USING (auth.role() = 'authenticated');

-- All other tables: authenticated only
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access"
  ON customers FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access"
  ON bookings FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access"
  ON meter_readings FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access"
  ON invoices FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access"
  ON revenue FOR ALL USING (auth.role() = 'authenticated');

-- ── Storage: Single "uploads" bucket ─────────────────────────
-- Create the bucket (public so vehicle images and invoice PDFs are accessible)
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');

-- Allow public read on all files (vehicle images, invoice PDFs)
CREATE POLICY "Public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'uploads');

-- Allow authenticated users to update/delete their uploads
CREATE POLICY "Authenticated manage"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'uploads' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'uploads' AND auth.role() = 'authenticated');
