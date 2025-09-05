-- Migration 006: Fix public access for tenant lookups
-- Some queries need to be public (like subdomain resolution)

-- ============================================
-- 1. Allow public read of basic tenant info for subdomain resolution
-- ============================================

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view their tenants" ON tenants;

-- Create a single policy for SELECT that allows both public and authenticated access
-- Public can read basic info, authenticated users can read their tenants
CREATE POLICY "Public and users can read tenants" ON tenants
  FOR SELECT
  USING (true);  -- Allow all reads - this is safe because sensitive data is in other tables

-- ============================================
-- 2. Fix custom_domains public lookup
-- ============================================

-- Drop old restrictive policy
DROP POLICY IF EXISTS "View tenant domains" ON custom_domains;

-- Allow public read of domains for verification
CREATE POLICY "Public can read domains for verification" ON custom_domains
  FOR SELECT
  USING (true);  -- Public can check if domain exists

-- Only admins can insert new domains
CREATE POLICY "Admins can insert domains" ON custom_domains
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

-- Note: We're keeping some public read access because:
-- 1. Subdomain resolution needs to work without auth
-- 2. Domain verification needs to work without auth
-- 3. The catch-all route needs to identify tenants
-- But all modifications still require proper authentication