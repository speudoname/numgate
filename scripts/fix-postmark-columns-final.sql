-- Fix column name mismatch in postmark_settings table
-- The code expects server_id/server_token but database has transactional_server_id/transactional_server_token

-- Add the missing columns that the code expects
ALTER TABLE contacts.postmark_settings 
ADD COLUMN IF NOT EXISTS server_id INTEGER,
ADD COLUMN IF NOT EXISTS server_token TEXT;

-- Copy existing data from transactional columns to new columns
UPDATE contacts.postmark_settings 
SET 
    server_id = transactional_server_id,
    server_token = transactional_server_token
WHERE transactional_server_id IS NOT NULL;

-- Create a trigger to keep columns in sync going forward
CREATE OR REPLACE FUNCTION contacts.sync_postmark_server_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync from transactional_* to server_* columns
    IF NEW.transactional_server_id IS DISTINCT FROM OLD.transactional_server_id THEN
        NEW.server_id := NEW.transactional_server_id;
    END IF;
    
    IF NEW.transactional_server_token IS DISTINCT FROM OLD.transactional_server_token THEN
        NEW.server_token := NEW.transactional_server_token;
    END IF;
    
    -- Sync from server_* to transactional_* columns (bidirectional)
    IF NEW.server_id IS DISTINCT FROM OLD.server_id THEN
        NEW.transactional_server_id := NEW.server_id;
    END IF;
    
    IF NEW.server_token IS DISTINCT FROM OLD.server_token THEN
        NEW.transactional_server_token := NEW.server_token;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_server_columns_trigger ON contacts.postmark_settings;

-- Create the trigger
CREATE TRIGGER sync_server_columns_trigger
BEFORE UPDATE ON contacts.postmark_settings
FOR EACH ROW
EXECUTE FUNCTION contacts.sync_postmark_server_columns();

-- Also handle INSERT to sync columns
CREATE OR REPLACE FUNCTION contacts.sync_postmark_server_columns_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- If server_id is null but transactional_server_id has value, copy it
    IF NEW.server_id IS NULL AND NEW.transactional_server_id IS NOT NULL THEN
        NEW.server_id := NEW.transactional_server_id;
    END IF;
    
    -- If transactional_server_id is null but server_id has value, copy it
    IF NEW.transactional_server_id IS NULL AND NEW.server_id IS NOT NULL THEN
        NEW.transactional_server_id := NEW.server_id;
    END IF;
    
    -- Same for tokens
    IF NEW.server_token IS NULL AND NEW.transactional_server_token IS NOT NULL THEN
        NEW.server_token := NEW.transactional_server_token;
    END IF;
    
    IF NEW.transactional_server_token IS NULL AND NEW.server_token IS NOT NULL THEN
        NEW.transactional_server_token := NEW.server_token;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing insert trigger if it exists
DROP TRIGGER IF EXISTS sync_server_columns_on_insert_trigger ON contacts.postmark_settings;

-- Create the insert trigger
CREATE TRIGGER sync_server_columns_on_insert_trigger
BEFORE INSERT ON contacts.postmark_settings
FOR EACH ROW
EXECUTE FUNCTION contacts.sync_postmark_server_columns_on_insert();

-- Grant necessary permissions
GRANT ALL ON contacts.postmark_settings TO service_role;
GRANT SELECT ON contacts.postmark_settings TO anon, authenticated;

-- Verify the fix
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'contacts' 
    AND table_name = 'postmark_settings'
    AND column_name IN ('server_id', 'server_token', 'transactional_server_id', 'transactional_server_token')
ORDER BY column_name;