-- Migration to ensure ssl_status column exists in custom_domains table
-- This fixes the Supabase schema cache issue

-- First, add the column if it doesn't exist
ALTER TABLE custom_domains 
ADD COLUMN IF NOT EXISTS ssl_status TEXT DEFAULT 'pending';

-- Update any existing records that might have NULL ssl_status
UPDATE custom_domains 
SET ssl_status = 'pending' 
WHERE ssl_status IS NULL;

-- Add a check constraint to ensure valid values
ALTER TABLE custom_domains 
DROP CONSTRAINT IF EXISTS custom_domains_ssl_status_check;

ALTER TABLE custom_domains 
ADD CONSTRAINT custom_domains_ssl_status_check 
CHECK (ssl_status IN ('pending', 'active', 'failed'));

-- Refresh the schema cache by querying the table
SELECT * FROM custom_domains LIMIT 1;