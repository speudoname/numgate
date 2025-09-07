-- Diagnostic script to check postmark_settings table structure
-- and identify column name mismatches

-- 1. Show current structure of postmark_settings table
SELECT 
    'Current postmark_settings columns:' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'contacts' 
AND table_name = 'postmark_settings'
ORDER BY ordinal_position;

-- 2. Check if old column names exist
SELECT 
    'Checking for old column names:' as info;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'contacts' 
            AND table_name = 'postmark_settings' 
            AND column_name = 'server_id'
        ) THEN 'server_id EXISTS (OLD COLUMN)'
        ELSE 'server_id NOT FOUND'
    END as server_id_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'contacts' 
            AND table_name = 'postmark_settings' 
            AND column_name = 'server_token'
        ) THEN 'server_token EXISTS (OLD COLUMN)'
        ELSE 'server_token NOT FOUND'
    END as server_token_status;

-- 3. Check if new column names exist
SELECT 
    'Checking for new column names:' as info;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'contacts' 
            AND table_name = 'postmark_settings' 
            AND column_name = 'transactional_server_id'
        ) THEN 'transactional_server_id EXISTS (CORRECT)'
        ELSE 'transactional_server_id MISSING'
    END as transactional_server_id_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'contacts' 
            AND table_name = 'postmark_settings' 
            AND column_name = 'transactional_server_token'
        ) THEN 'transactional_server_token EXISTS (CORRECT)'
        ELSE 'transactional_server_token MISSING'
    END as transactional_server_token_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'contacts' 
            AND table_name = 'postmark_settings' 
            AND column_name = 'marketing_server_id'
        ) THEN 'marketing_server_id EXISTS (CORRECT)'
        ELSE 'marketing_server_id MISSING'
    END as marketing_server_id_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'contacts' 
            AND table_name = 'postmark_settings' 
            AND column_name = 'marketing_server_token'
        ) THEN 'marketing_server_token EXISTS (CORRECT)'
        ELSE 'marketing_server_token MISSING'
    END as marketing_server_token_status;

-- 4. Check shared_postmark_config table structure
SELECT 
    'Current shared_postmark_config columns:' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'contacts' 
AND table_name = 'shared_postmark_config'
ORDER BY ordinal_position;

-- 5. Show sample data from postmark_settings
SELECT 
    'Sample data from postmark_settings:' as info;

SELECT * FROM contacts.postmark_settings LIMIT 1;

-- 6. Show RLS policies on the table
SELECT 
    'RLS policies on postmark_settings:' as info;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'contacts' 
AND tablename = 'postmark_settings';