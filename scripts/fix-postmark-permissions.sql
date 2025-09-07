-- Fix permissions for postmark_settings table
-- This script grants necessary permissions to service_role for the postmark tables

-- Grant all permissions on postmark_settings table to service_role
GRANT ALL ON contacts.postmark_settings TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA contacts TO service_role;

-- Also grant permissions on shared_postmark_config if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'contacts' 
               AND table_name = 'shared_postmark_config') THEN
        EXECUTE 'GRANT ALL ON contacts.shared_postmark_config TO service_role';
        EXECUTE 'GRANT SELECT ON contacts.shared_postmark_config TO anon, authenticated';
    END IF;
END $$;

-- Make sure anon and authenticated can at least read postmark_settings
GRANT SELECT ON contacts.postmark_settings TO anon, authenticated;

-- Verify permissions are set
SELECT 
    schemaname,
    tablename,
    has_table_privilege('service_role', schemaname||'.'||tablename, 'SELECT') as can_select,
    has_table_privilege('service_role', schemaname||'.'||tablename, 'INSERT') as can_insert,
    has_table_privilege('service_role', schemaname||'.'||tablename, 'UPDATE') as can_update,
    has_table_privilege('service_role', schemaname||'.'||tablename, 'DELETE') as can_delete
FROM pg_tables 
WHERE schemaname = 'contacts' 
    AND tablename IN ('postmark_settings', 'shared_postmark_config')
ORDER BY tablename;