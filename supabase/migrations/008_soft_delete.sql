-- Add is_active soft-delete flag to customers and vehicles.
-- Records with existing bookings cannot be hard-deleted; they are deactivated instead.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE vehicles  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
