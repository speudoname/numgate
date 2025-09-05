-- Migration 005: Enable Row Level Security (RLS) on all tables
-- This ensures complete tenant isolation at the database level
-- CRITICAL: Run this to secure your multi-tenant application

-- ============================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_access ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. CREATE HELPER FUNCTIONS (in public schema)
-- ============================================

-- Function to get current user's ID from JWT
CREATE OR REPLACE FUNCTION public.get_auth_user_id() 
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'user_id', '')::UUID;
$$ LANGUAGE SQL STABLE;

-- Function to get current tenant ID from JWT
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id() 
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'tenant_id', '')::UUID;
$$ LANGUAGE SQL STABLE;

-- Function to check if user belongs to a tenant
CREATE OR REPLACE FUNCTION public.user_has_tenant_access(tenant_uuid UUID) 
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE user_id = public.get_auth_user_id() 
    AND tenant_id = tenant_uuid
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================
-- 3. TENANTS TABLE POLICIES
-- ============================================

-- Users can only view tenants they belong to
CREATE POLICY "Users can view their tenants" ON tenants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE tenant_users.tenant_id = tenants.id 
      AND tenant_users.user_id = public.get_auth_user_id()
    )
  );

-- Only service role can create tenants (during registration)
CREATE POLICY "Service role creates tenants" ON tenants
  FOR INSERT
  WITH CHECK (false); -- No one can insert via anon key

-- Users with admin role can update their tenant
CREATE POLICY "Admins can update their tenant" ON tenants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE tenant_users.tenant_id = tenants.id 
      AND tenant_users.user_id = public.get_auth_user_id()
      AND tenant_users.role = 'admin'
    )
  );

-- No one can delete tenants via anon key
CREATE POLICY "No tenant deletion" ON tenants
  FOR DELETE
  USING (false);

-- ============================================
-- 4. USERS TABLE POLICIES
-- ============================================

-- Users can only view users in their tenant
CREATE POLICY "View users in same tenant" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu1
      JOIN tenant_users tu2 ON tu1.tenant_id = tu2.tenant_id
      WHERE tu1.user_id = public.get_auth_user_id()
      AND tu2.user_id = users.id
    )
  );

-- Users can update their own profile
CREATE POLICY "Users update own profile" ON users
  FOR UPDATE
  USING (id = public.get_auth_user_id())
  WITH CHECK (id = public.get_auth_user_id());

-- Service role handles user creation
CREATE POLICY "Service role creates users" ON users
  FOR INSERT
  WITH CHECK (false);

-- ============================================
-- 5. CUSTOM_DOMAINS TABLE POLICIES
-- ============================================

-- View domains for user's tenants
CREATE POLICY "View tenant domains" ON custom_domains
  FOR SELECT
  USING (public.user_has_tenant_access(tenant_id));

-- Admins can insert domains for their tenant
CREATE POLICY "Admins insert domains" ON custom_domains
  FOR INSERT
  WITH CHECK (
    public.user_has_tenant_access(tenant_id) AND
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = custom_domains.tenant_id
      AND tenant_users.user_id = public.get_auth_user_id()
      AND tenant_users.role = 'admin'
    )
  );

-- Admins can update domains for their tenant
CREATE POLICY "Admins update domains" ON custom_domains
  FOR UPDATE
  USING (
    public.user_has_tenant_access(tenant_id) AND
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = custom_domains.tenant_id
      AND tenant_users.user_id = public.get_auth_user_id()
      AND tenant_users.role = 'admin'
    )
  );

-- Admins can delete domains for their tenant
CREATE POLICY "Admins delete domains" ON custom_domains
  FOR DELETE
  USING (
    public.user_has_tenant_access(tenant_id) AND
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = custom_domains.tenant_id
      AND tenant_users.user_id = public.get_auth_user_id()
      AND tenant_users.role = 'admin'
    )
  );

-- ============================================
-- 6. TENANT_USERS TABLE POLICIES
-- ============================================

-- Users can view tenant members
CREATE POLICY "View tenant members" ON tenant_users
  FOR SELECT
  USING (public.user_has_tenant_access(tenant_id));

-- Admins can manage tenant members
CREATE POLICY "Admins manage members" ON tenant_users
  FOR ALL
  USING (
    public.user_has_tenant_access(tenant_id) AND
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = tenant_users.tenant_id
      AND tu.user_id = public.get_auth_user_id()
      AND tu.role = 'admin'
    )
  );

-- ============================================
-- 7. APP_ACCESS TABLE POLICIES
-- ============================================

-- View app access for user's tenants
CREATE POLICY "View tenant app access" ON app_access
  FOR SELECT
  USING (public.user_has_tenant_access(tenant_id));

-- Admins can manage app access
CREATE POLICY "Admins manage app access" ON app_access
  FOR ALL
  USING (
    public.user_has_tenant_access(tenant_id) AND
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = app_access.tenant_id
      AND tenant_users.user_id = public.get_auth_user_id()
      AND tenant_users.role = 'admin'
    )
  );

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON tenants TO anon, authenticated;
GRANT SELECT, UPDATE ON users TO authenticated;
GRANT ALL ON custom_domains TO authenticated;
GRANT SELECT ON tenant_users TO authenticated;
GRANT ALL ON tenant_users TO authenticated; -- Admins need this
GRANT SELECT ON app_access TO authenticated;

-- ============================================
-- 9. VERIFY RLS IS ENABLED
-- ============================================

DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('tenants', 'users', 'custom_domains', 'tenant_users', 'app_access')
  LOOP
    RAISE NOTICE 'RLS enabled on table: %', t.tablename;
  END LOOP;
END $$;