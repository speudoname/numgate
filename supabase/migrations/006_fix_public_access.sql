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

-- Drop the old restrictive SELECT policy only
DROP POLICY IF EXISTS "View tenant domains" ON custom_domains;

-- Create new public read policy for domain verification
CREATE POLICY "Public can read domains for verification" ON custom_domains
  FOR SELECT
  USING (true);  -- Public can check if domain exists

-- Note: INSERT, UPDATE, DELETE policies already exist from migration 005
-- We only needed to fix the SELECT policy to allow public reads

-- Note: We're keeping some public read access because:
-- 1. Subdomain resolution needs to work without auth
-- 2. Domain verification needs to work without auth
-- 3. The catch-all route needs to identify tenants
-- But all modifications still require proper authentication