-- Standard (rack) KM rate captured at booking creation, so a lowered
-- price_per_km can be shown as a discount. NULL on old rows; readers fall
-- back to price_per_km, keeping historical totals identical.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS default_price_per_km numeric;
