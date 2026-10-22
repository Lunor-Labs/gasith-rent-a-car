-- Add optional nickname to customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS nickname TEXT;
