-- Simple diagnostic to check what columns actually exist in postmark_settings table

-- 1. Check if the table exists and show its columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'contacts' 
    AND table_name = 'postmark_settings'
ORDER BY ordinal_position;

-- 2. Show a sample row (if any exist) to see actual data structure
SELECT * FROM contacts.postmark_settings LIMIT 1;

-- 3. Check if there are any RLS policies on the table
SELECT 
    pol.polname as policy_name,
    pol.polcmd as command,
    pol.polpermissive as permissive,
    pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
WHERE nsp.nspname = 'contacts' 
    AND cls.relname = 'postmark_settings';