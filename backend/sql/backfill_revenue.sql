-- Backfill the `revenue` table from completed bookings.
--
-- Why: revenue was historically recorded as the full `final_amount` for owned
-- vehicles, which includes the driver fee (a pass-through, not real revenue).
-- Admin income is now `final_amount - driver_fee` for owned bookings and
-- `commission_amount` for outsourced ones. This recomputes every month bucket
-- so the persisted `revenue` table (dashboard MTD) matches the reports.
--
-- Bucketing: by completion month (end_date, falling back to start_date), using a
-- raw substring of the stored timestamp — matching the /reports/financial logic
-- (no timezone conversion).
--
-- Run once in the Supabase SQL editor. Idempotent: recomputes from source.

-- 1) Preview first (read-only). Compare against the Reports page, then run step 2.
SELECT
  substring(COALESCE(b.end_date, b.start_date)::text, 1, 7) AS month,
  SUM(
    CASE WHEN b.is_outsourced
         THEN COALESCE(b.commission_amount, 0)
         ELSE COALESCE(b.final_amount, 0) - COALESCE(b.driver_fee, 0)
    END
  )                                                          AS total_revenue,
  COUNT(*)                                                   AS total_bookings,
  COALESCE(SUM(b.total_km), 0)                               AS total_km
FROM bookings b
WHERE b.status = 'completed'
  AND COALESCE(b.end_date, b.start_date) IS NOT NULL
GROUP BY 1
ORDER BY 1;

-- 2) Apply: overwrite the revenue table with the recomputed values.
INSERT INTO revenue (month, total_revenue, total_bookings, total_km, updated_at)
SELECT
  substring(COALESCE(b.end_date, b.start_date)::text, 1, 7),
  SUM(
    CASE WHEN b.is_outsourced
         THEN COALESCE(b.commission_amount, 0)
         ELSE COALESCE(b.final_amount, 0) - COALESCE(b.driver_fee, 0)
    END
  ),
  COUNT(*),
  COALESCE(SUM(b.total_km), 0),
  now()
FROM bookings b
WHERE b.status = 'completed'
  AND COALESCE(b.end_date, b.start_date) IS NOT NULL
GROUP BY 1
ON CONFLICT (month) DO UPDATE SET
  total_revenue  = EXCLUDED.total_revenue,
  total_bookings = EXCLUDED.total_bookings,
  total_km       = EXCLUDED.total_km,
  updated_at     = now();
