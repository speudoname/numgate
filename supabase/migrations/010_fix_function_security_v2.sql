-- Fix security warnings for NumGate functions (CORRECTED VERSION)
-- This fixes the remaining security warnings

-- First check if functions exist before trying to alter them
DO $$
BEGIN
    -- 1. Fix get_auth_tenant_id if it exists
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'get_auth_tenant_id'
    ) THEN
        ALTER FUNCTION public.get_auth_tenant_id() 
            SET search_path = public, pg_catalog;
    END IF;

    -- 2. Fix get_auth_user_id if it exists
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'get_auth_user_id'
    ) THEN
        ALTER FUNCTION public.get_auth_user_id() 
            SET search_path = public, pg_catalog;
    END IF;

    -- 3. Fix get_auth_user_role if it exists (needed by user_is_admin)
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'get_auth_user_role'
    ) THEN
        ALTER FUNCTION public.get_auth_user_role() 
            SET search_path = public, pg_catalog;
    END IF;

    -- 4. Fix user_is_admin if it exists
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'user_is_admin'
    ) THEN
        ALTER FUNCTION public.user_is_admin() 
            SET search_path = public, pg_catalog;
    END IF;

    -- 5. Fix user_has_tenant_access if it exists
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'user_has_tenant_access'
    ) THEN
        ALTER FUNCTION public.user_has_tenant_access(UUID) 
            SET search_path = public, pg_catalog;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some functions could not be modified: %', SQLERRM;
END $$;

-- Verify which functions exist and their status
SELECT 
    p.proname as function_name,
    CASE 
        WHEN p.proconfig::text LIKE '%search_path%' THEN '✅ Fixed'
        ELSE '⚠️ Needs search_path'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'get_auth_tenant_id', 
    'get_auth_user_id', 
    'user_is_admin',
    'get_auth_user_role',
    'user_has_tenant_access'
)
ORDER BY p.proname;