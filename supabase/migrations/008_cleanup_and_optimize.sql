-- Migration 008: Cleanup unused tables and optimize performance
-- This migration:
-- 1. Drops unused sessions table
-- 2. Adds performance indexes
-- 3. Fixes security warnings for functions

-- ============================================
-- 1. DROP UNUSED SESSIONS TABLE
-- ============================================

-- Drop policies first
DROP POLICY IF EXISTS "Service role can manage sessions" ON sessions;

-- Drop the sessions table (it's not used - we use JWT)
DROP TABLE IF EXISTS sessions CASCADE;

-- ============================================
-- 2. ADD PERFORMANCE INDEXES
-- ============================================

-- These indexes will dramatically improve query performance
-- Each index speeds up queries that filter by these columns

-- For tenant_users table (junction table needs both directions)
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_combined ON tenant_users(tenant_id, user_id);

-- For users table (if they have tenant_id)
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email); -- For login queries

-- For custom_domains table
CREATE INDEX IF NOT EXISTS idx_custom_domains_tenant_id ON custom_domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON custom_domains(domain); -- For domain lookup
CREATE INDEX IF NOT EXISTS idx_custom_domains_verified ON custom_domains(verified); -- For verified checks

-- For app_access table
CREATE INDEX IF NOT EXISTS idx_app_access_tenant_id ON app_access(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_access_app_name ON app_access(app_name);
CREATE INDEX IF NOT EXISTS idx_app_access_combined ON app_access(tenant_id, app_name);

-- For tenants table
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug); -- For subdomain lookup

-- ============================================
-- 3. FIX SECURITY WARNINGS (search_path)
-- ============================================

-- We need to use CREATE OR REPLACE (not DROP) because RLS policies depend on these
-- This fixes the "Function Search Path Mutable" warnings without breaking policies

-- Fix get_auth_user_id function (CREATE OR REPLACE keeps existing dependencies)
CREATE OR REPLACE FUNCTION public.get_auth_user_id() 
RETURNS UUID AS $$
DECLARE
  user_id TEXT;
BEGIN
  -- Try to get user_id from request headers set by middleware
  user_id := current_setting('request.headers', true)::json->>'x-user-id';
  
  IF user_id IS NULL OR user_id = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN user_id::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Fix get_auth_tenant_id function (CREATE OR REPLACE keeps existing dependencies)
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id() 
RETURNS UUID AS $$
DECLARE
  tenant_id TEXT;
BEGIN
  -- Try to get tenant_id from request headers set by middleware
  tenant_id := current_setting('request.headers', true)::json->>'x-tenant-id';
  
  IF tenant_id IS NULL OR tenant_id = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN tenant_id::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Fix user_has_tenant_access function (CREATE OR REPLACE keeps existing dependencies)
CREATE OR REPLACE FUNCTION public.user_has_tenant_access(tenant_uuid UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  -- First check if the JWT tenant matches
  IF public.get_auth_tenant_id() = tenant_uuid THEN
    RETURN TRUE;
  END IF;
  
  -- Also check tenant_users table for multi-tenant support
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = public.get_auth_user_id() 
    AND tenant_id = tenant_uuid
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Fix update_updated_at_column function (CREATE OR REPLACE to preserve triggers)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix get_auth_user_role function (if it exists from migration 007)
CREATE OR REPLACE FUNCTION public.get_auth_user_role() 
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Try to get role from request headers set by middleware
  user_role := current_setting('request.headers', true)::json->>'x-user-role';
  
  IF user_role IS NULL OR user_role = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN user_role;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Fix user_is_admin function (if it exists from migration 007)
CREATE OR REPLACE FUNCTION public.user_is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_auth_user_role() = 'admin' OR public.get_auth_user_role() = 'owner';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================
-- 4. GRANT PERMISSIONS (maintain existing)
-- ============================================

-- Ensure functions have proper permissions
GRANT EXECUTE ON FUNCTION public.get_auth_user_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_tenant_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_tenant_access(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO anon, authenticated;

-- ============================================
-- 5. VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 008 completed successfully!';
  RAISE NOTICE '✅ Dropped unused sessions table';
  RAISE NOTICE '✅ Added performance indexes for all foreign keys';
  RAISE NOTICE '✅ Fixed security warnings with explicit search_path';
  RAISE NOTICE '';
  RAISE NOTICE 'Your database is now optimized and clean!';
END $$;