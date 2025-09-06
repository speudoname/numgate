-- Fix security warnings for NumGate functions
-- This fixes the 3 remaining security warnings

-- 1. Fix get_auth_tenant_id function
ALTER FUNCTION public.get_auth_tenant_id() 
    SET search_path = public, pg_catalog;

-- 2. Fix get_auth_user_id function  
ALTER FUNCTION public.get_auth_user_id() 
    SET search_path = public, pg_catalog;

-- 3. Fix user_is_admin function
ALTER FUNCTION public.user_is_admin() 
    SET search_path = public, pg_catalog;

-- Also fix get_auth_user_role since it's used by user_is_admin
ALTER FUNCTION public.get_auth_user_role() 
    SET search_path = public, pg_catalog;

-- Fix user_has_tenant_access for completeness
ALTER FUNCTION public.user_has_tenant_access(UUID) 
    SET search_path = public, pg_catalog;

-- Verify the fixes
SELECT 
    p.proname as function_name,
    n.nspname as schema_name,
    p.prosecdef as is_security_definer,
    p.proconfig as config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN (
    'get_auth_tenant_id', 
    'get_auth_user_id', 
    'user_is_admin',
    'get_auth_user_role',
    'user_has_tenant_access'
)
ORDER BY p.proname;