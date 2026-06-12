-- Add NAICS classification to company profiles
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS naics TEXT;
