-- Fix for ssl_status column if it doesn't exist
-- This handles the case where the column might be missing or cached incorrectly

-- Add ssl_status column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'custom_domains' 
    AND column_name = 'ssl_status'
  ) THEN
    ALTER TABLE custom_domains 
    ADD COLUMN ssl_status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- Ensure the column has the correct default
ALTER TABLE custom_domains 
ALTER COLUMN ssl_status SET DEFAULT 'pending';

-- Update any NULL values to 'pending'
UPDATE custom_domains 
SET ssl_status = 'pending' 
WHERE ssl_status IS NULL;