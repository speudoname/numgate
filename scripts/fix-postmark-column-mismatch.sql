-- ============================================
-- FIX FOR POSTMARK COLUMN NAME MISMATCH
-- ============================================
-- This script fixes the mismatch between what the code expects
-- and what actually exists in the database

-- The problem:
-- Code expects: server_id, server_token, marketing_server_id, marketing_server_token
-- Database has: transactional_server_id, transactional_server_token, marketing_server_id, marketing_server_token

-- Solution: Add the missing columns that the code expects, as aliases to the correct columns

-- ============================================
-- STEP 1: Add missing columns to postmark_settings
-- ============================================

DO $$
BEGIN
    -- Add server_id as a computed column that references transactional_server_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'contacts' 
        AND table_name = 'postmark_settings' 
        AND column_name = 'server_id'
    ) THEN
        ALTER TABLE contacts.postmark_settings 
        ADD COLUMN server_id INTEGER;
        
        -- Copy existing data from transactional_server_id
        UPDATE contacts.postmark_settings 
        SET server_id = transactional_server_id
        WHERE transactional_server_id IS NOT NULL;
        
        RAISE NOTICE 'Added server_id column to postmark_settings';
    END IF;

    -- Add server_token as a computed column that references transactional_server_token
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'contacts' 
        AND table_name = 'postmark_settings' 
        AND column_name = 'server_token'
    ) THEN
        ALTER TABLE contacts.postmark_settings 
        ADD COLUMN server_token TEXT;
        
        -- Copy existing data from transactional_server_token
        UPDATE contacts.postmark_settings 
        SET server_token = transactional_server_token
        WHERE transactional_server_token IS NOT NULL;
        
        RAISE NOTICE 'Added server_token column to postmark_settings';
    END IF;

    -- Add server_mode if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'contacts' 
        AND table_name = 'postmark_settings' 
        AND column_name = 'server_mode'
    ) THEN
        ALTER TABLE contacts.postmark_settings 
        ADD COLUMN server_mode TEXT DEFAULT 'dedicated';
        
        RAISE NOTICE 'Added server_mode column to postmark_settings';
    END IF;
END $$;

-- ============================================
-- STEP 2: Create trigger to keep columns in sync
-- ============================================

-- Create a function to sync the columns
CREATE OR REPLACE FUNCTION contacts.sync_postmark_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- When transactional columns are updated, update the alias columns
    IF NEW.transactional_server_id IS DISTINCT FROM OLD.transactional_server_id THEN
        NEW.server_id = NEW.transactional_server_id;
    END IF;
    
    IF NEW.transactional_server_token IS DISTINCT FROM OLD.transactional_server_token THEN
        NEW.server_token = NEW.transactional_server_token;
    END IF;
    
    -- When alias columns are updated, update the transactional columns
    IF NEW.server_id IS DISTINCT FROM OLD.server_id THEN
        NEW.transactional_server_id = NEW.server_id;
    END IF;
    
    IF NEW.server_token IS DISTINCT FROM OLD.server_token THEN
        NEW.transactional_server_token = NEW.server_token;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_postmark_columns_trigger ON contacts.postmark_settings;

-- Create the trigger
CREATE TRIGGER sync_postmark_columns_trigger
BEFORE INSERT OR UPDATE ON contacts.postmark_settings
FOR EACH ROW
EXECUTE FUNCTION contacts.sync_postmark_columns();

-- ============================================
-- STEP 3: Ensure all required columns exist
-- ============================================

-- Ensure marketing columns exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'contacts' 
        AND table_name = 'postmark_settings' 
        AND column_name = 'marketing_server_id'
    ) THEN
        ALTER TABLE contacts.postmark_settings 
        ADD COLUMN marketing_server_id INTEGER;
        RAISE NOTICE 'Added marketing_server_id column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'contacts' 
        AND table_name = 'postmark_settings' 
        AND column_name = 'marketing_server_token'
    ) THEN
        ALTER TABLE contacts.postmark_settings 
        ADD COLUMN marketing_server_token TEXT;
        RAISE NOTICE 'Added marketing_server_token column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'contacts' 
        AND table_name = 'postmark_settings' 
        AND column_name = 'marketing_stream_id'
    ) THEN
        ALTER TABLE contacts.postmark_settings 
        ADD COLUMN marketing_stream_id TEXT DEFAULT 'broadcasts';
        RAISE NOTICE 'Added marketing_stream_id column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'contacts' 
        AND table_name = 'postmark_settings' 
        AND column_name = 'transactional_stream_id'
    ) THEN
        ALTER TABLE contacts.postmark_settings 
        ADD COLUMN transactional_stream_id TEXT DEFAULT 'outbound';
        RAISE NOTICE 'Added transactional_stream_id column';
    END IF;
END $$;

-- ============================================
-- STEP 4: Grant proper permissions
-- ============================================

-- Grant permissions for service role
GRANT ALL ON contacts.postmark_settings TO service_role;
GRANT ALL ON contacts.shared_postmark_config TO service_role;

-- Grant permissions for authenticated users (read-only)
GRANT SELECT ON contacts.postmark_settings TO authenticated;
GRANT SELECT ON contacts.shared_postmark_config TO authenticated;

-- ============================================
-- STEP 5: Verify the fix
-- ============================================

-- Show the final structure
SELECT 
    'Final postmark_settings structure:' as info;

SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'contacts' 
AND table_name = 'postmark_settings'
AND column_name IN (
    'server_id', 'server_token', 
    'transactional_server_id', 'transactional_server_token',
    'marketing_server_id', 'marketing_server_token',
    'transactional_stream_id', 'marketing_stream_id',
    'server_mode'
)
ORDER BY column_name;

-- ============================================
-- STEP 6: Test the columns work
-- ============================================

DO $$
DECLARE
    test_result BOOLEAN := true;
BEGIN
    -- Test that we can query using both column names
    PERFORM * FROM contacts.postmark_settings 
    WHERE server_id IS NOT NULL 
    OR transactional_server_id IS NOT NULL
    LIMIT 1;
    
    RAISE NOTICE 'SUCCESS: Column fix applied successfully!';
    RAISE NOTICE 'Both server_id and transactional_server_id columns now exist';
    RAISE NOTICE 'The code can now use either column name';
END $$;