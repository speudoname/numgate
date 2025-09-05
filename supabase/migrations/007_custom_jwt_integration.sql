-- Migration 007: Custom JWT Integration for RLS
-- This enables RLS to work with our custom JWT authentication system
-- Instead of relying on Supabase Auth, we read JWT claims from request headers

-- ============================================
-- 1. DROP OLD FUNCTIONS (if they exist)
-- ============================================

DROP FUNCTION IF EXISTS public.get_auth_user_id();
DROP FUNCTION IF EXISTS public.get_auth_tenant_id();
DROP FUNCTION IF EXISTS public.user_has_tenant_access(UUID);

-- ============================================
-- 2. CREATE NEW JWT CLAIM FUNCTIONS
-- ============================================

-- Function to get current user's ID from custom JWT headers
-- The middleware sets these headers after validating the JWT
CREATE OR REPLACE FUNCTION public.get_auth_user_id() 
RETURNS UUID AS $$
DECLARE
  user_id TEXT;
BEGIN
  -- Try to get user_id from request headers set by middleware
  user_id := current_setting('request.headers')::json->>'x-user-id';
  
  IF user_id IS NULL OR user_id = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN user_id::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get current tenant ID from custom JWT headers
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id() 
RETURNS UUID AS $$
DECLARE
  tenant_id TEXT;
BEGIN
  -- Try to get tenant_id from request headers set by middleware
  tenant_id := current_setting('request.headers')::json->>'x-tenant-id';
  
  IF tenant_id IS NULL OR tenant_id = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN tenant_id::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get user role from custom JWT headers
CREATE OR REPLACE FUNCTION public.get_auth_user_role() 
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Try to get role from request headers set by middleware
  user_role := current_setting('request.headers')::json->>'x-user-role';
  
  IF user_role IS NULL OR user_role = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN user_role;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user belongs to a tenant
CREATE OR REPLACE FUNCTION public.user_has_tenant_access(tenant_uuid UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  -- First check if the JWT tenant matches
  IF public.get_auth_tenant_id() = tenant_uuid THEN
    RETURN TRUE;
  END IF;
  
  -- Also check tenant_users table for multi-tenant support
  RETURN EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE user_id = public.get_auth_user_id() 
    AND tenant_id = tenant_uuid
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.user_is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_auth_user_role() = 'admin' OR public.get_auth_user_role() = 'owner';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- 3. UPDATE RLS POLICIES TO USE NEW FUNCTIONS
-- ============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their tenants" ON tenants;
DROP POLICY IF EXISTS "Service role creates tenants" ON tenants;
DROP POLICY IF EXISTS "Admins can update their tenant" ON tenants;
DROP POLICY IF EXISTS "No tenant deletion" ON tenants;
DROP POLICY IF EXISTS "View users in same tenant" ON users;
DROP POLICY IF EXISTS "Users update own profile" ON users;
DROP POLICY IF EXISTS "Service role creates users" ON users;
DROP POLICY IF EXISTS "View tenant domains" ON custom_domains;
DROP POLICY IF EXISTS "Admins insert domains" ON custom_domains;
DROP POLICY IF EXISTS "Admins update domains" ON custom_domains;
DROP POLICY IF EXISTS "Admins delete domains" ON custom_domains;
DROP POLICY IF EXISTS "View tenant members" ON tenant_users;
DROP POLICY IF EXISTS "Admins manage members" ON tenant_users;
DROP POLICY IF EXISTS "View tenant app access" ON app_access;
DROP POLICY IF EXISTS "Admins manage app access" ON app_access;

-- Also drop the public access policies from migration 006
DROP POLICY IF EXISTS "Public and users can read tenants" ON tenants;
DROP POLICY IF EXISTS "Public can read domains for verification" ON custom_domains;

-- ============================================
-- 4. CREATE NEW RLS POLICIES WITH CUSTOM JWT
-- ============================================

-- TENANTS TABLE
CREATE POLICY "Users view their tenant" ON tenants
  FOR SELECT
  USING (id = public.get_auth_tenant_id());

CREATE POLICY "Admins update their tenant" ON tenants
  FOR UPDATE
  USING (id = public.get_auth_tenant_id() AND public.user_is_admin())
  WITH CHECK (id = public.get_auth_tenant_id() AND public.user_is_admin());

-- USERS TABLE
CREATE POLICY "Users view same tenant users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.user_id = users.id
      AND tenant_users.tenant_id = public.get_auth_tenant_id()
    )
  );

CREATE POLICY "Users update own profile" ON users
  FOR UPDATE
  USING (id = public.get_auth_user_id())
  WITH CHECK (id = public.get_auth_user_id());

-- CUSTOM_DOMAINS TABLE
CREATE POLICY "View tenant domains" ON custom_domains
  FOR SELECT
  USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Admins manage domains" ON custom_domains
  FOR ALL
  USING (tenant_id = public.get_auth_tenant_id() AND public.user_is_admin())
  WITH CHECK (tenant_id = public.get_auth_tenant_id() AND public.user_is_admin());

-- TENANT_USERS TABLE
CREATE POLICY "View tenant members" ON tenant_users
  FOR SELECT
  USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Admins manage members" ON tenant_users
  FOR ALL
  USING (tenant_id = public.get_auth_tenant_id() AND public.user_is_admin())
  WITH CHECK (tenant_id = public.get_auth_tenant_id() AND public.user_is_admin());

-- APP_ACCESS TABLE
CREATE POLICY "View tenant apps" ON app_access
  FOR SELECT
  USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Admins manage apps" ON app_access
  FOR ALL
  USING (tenant_id = public.get_auth_tenant_id() AND public.user_is_admin())
  WITH CHECK (tenant_id = public.get_auth_tenant_id() AND public.user_is_admin());

-- ============================================
-- 5. PUBLIC ACCESS POLICIES (for non-authenticated routes)
-- ============================================

-- Allow public to check if a domain exists (for verification)
CREATE POLICY "Public read domains for lookup" ON custom_domains
  FOR SELECT
  USING (verified = true);

-- Allow public to read tenant info by slug (for subdomain routing)
CREATE POLICY "Public read tenants by slug" ON tenants
  FOR SELECT
  USING (true); -- We might want to restrict this later

-- ============================================
-- 6. GRANT NECESSARY PERMISSIONS
-- ============================================

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.get_auth_user_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_tenant_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_user_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_tenant_access(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_admin() TO anon, authenticated;

-- ============================================
-- 7. VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Custom JWT integration for RLS has been set up successfully';
  RAISE NOTICE 'The system now reads JWT claims from request headers';
  RAISE NOTICE 'Make sure your application passes headers: x-user-id, x-tenant-id, x-user-role';
END $$;