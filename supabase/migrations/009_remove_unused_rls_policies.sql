-- Migration 009: Remove Unused RLS Policies
-- Since we use custom JWT with service key, RLS policies don't work
-- They're just creating performance warnings and serving no purpose
-- Security is handled by middleware + explicit tenant filtering

-- ============================================
-- 1. DROP ALL RLS POLICIES
-- ============================================

-- Drop all policies on tenants table
DROP POLICY IF EXISTS "Users can view their tenants" ON tenants;
DROP POLICY IF EXISTS "Users view their tenant" ON tenants;
DROP POLICY IF EXISTS "Service role creates tenants" ON tenants;
DROP POLICY IF EXISTS "Admins can update their tenant" ON tenants;
DROP POLICY IF EXISTS "Admins update their tenant" ON tenants;
DROP POLICY IF EXISTS "No tenant deletion" ON tenants;
DROP POLICY IF EXISTS "Public and users can read tenants" ON tenants;
DROP POLICY IF EXISTS "Public read tenants by slug" ON tenants;

-- Drop all policies on users table
DROP POLICY IF EXISTS "View users in same tenant" ON users;
DROP POLICY IF EXISTS "Users view same tenant users" ON users;
DROP POLICY IF EXISTS "Users update own profile" ON users;
DROP POLICY IF EXISTS "Service role creates users" ON users;

-- Drop all policies on custom_domains table
DROP POLICY IF EXISTS "View tenant domains" ON custom_domains;
DROP POLICY IF EXISTS "Admins insert domains" ON custom_domains;
DROP POLICY IF EXISTS "Admins update domains" ON custom_domains;
DROP POLICY IF EXISTS "Admins delete domains" ON custom_domains;
DROP POLICY IF EXISTS "Admins manage domains" ON custom_domains;
DROP POLICY IF EXISTS "Public can read domains for verification" ON custom_domains;
DROP POLICY IF EXISTS "Public read domains for lookup" ON custom_domains;

-- Drop all policies on tenant_users table
DROP POLICY IF EXISTS "View tenant members" ON tenant_users;
DROP POLICY IF EXISTS "Admins manage members" ON tenant_users;
DROP POLICY IF EXISTS "Users can view their own memberships" ON tenant_users;
DROP POLICY IF EXISTS "Admins can view tenant members" ON tenant_users;
DROP POLICY IF EXISTS "Admins can add tenant members" ON tenant_users;

-- Drop all policies on app_access table
DROP POLICY IF EXISTS "View tenant app access" ON app_access;
DROP POLICY IF EXISTS "View tenant apps" ON app_access;
DROP POLICY IF EXISTS "Admins manage app access" ON app_access;
DROP POLICY IF EXISTS "Admins manage apps" ON app_access;

-- Drop any other policies that might exist (catch-all)
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('tenants', 'users', 'custom_domains', 'tenant_users', 'app_access', 'end_users')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    RAISE NOTICE 'Dropped policy % on %.%', pol.policyname, pol.schemaname, pol.tablename;
  END LOOP;
END $$;

-- ============================================
-- 2. KEEP RLS ENABLED (for future use)
-- ============================================

-- We keep RLS enabled on tables in case we want to use it later
-- With no policies, RLS blocks all access via anon key (which is what we want)
-- Service key bypasses RLS anyway

-- These should already be enabled, but let's ensure
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. CLEAN UP UNUSED RLS FUNCTIONS
-- ============================================

-- These functions were only used by RLS policies
-- Since we removed all policies, we can remove these too

DROP FUNCTION IF EXISTS public.get_auth_user_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_auth_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_auth_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.user_has_tenant_access(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.user_is_admin() CASCADE;

-- ============================================
-- 4. DOCUMENT SECURITY APPROACH
-- ============================================

-- Create a comment on the database explaining our security model
COMMENT ON DATABASE postgres IS 'Security Model: Custom JWT with service key. Middleware validates JWT, then API routes filter by tenant_id. RLS is enabled but has no policies (blocks anon key access).';

-- Add comments to tables explaining security
COMMENT ON TABLE tenants IS 'Multi-tenant organizations. Security: Service key + explicit tenant_id filtering in queries.';
COMMENT ON TABLE users IS 'Admin users (not end-users). Security: Service key + tenant_id filtering.';
COMMENT ON TABLE tenant_users IS 'Junction table linking users to tenants. Security: Service key + tenant_id filtering.';
COMMENT ON TABLE custom_domains IS 'Custom domains per tenant. Security: Service key + tenant_id filtering.';
COMMENT ON TABLE app_access IS 'Controls which apps each tenant can access. Security: Service key + tenant_id filtering.';

-- ============================================
-- 5. VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration 009 completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 What changed:';
  RAISE NOTICE '- Removed all RLS policies (they did not work with custom JWT)';
  RAISE NOTICE '- Kept RLS enabled (blocks anon key, allows service key)';
  RAISE NOTICE '- Removed unused RLS helper functions';
  RAISE NOTICE '- Documented security approach in database comments';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security model:';
  RAISE NOTICE '- Middleware validates custom JWT';
  RAISE NOTICE '- API routes use service key + explicit tenant filtering';
  RAISE NOTICE '- Every query includes .eq(tenant_id, tenantId)';
  RAISE NOTICE '';
  RAISE NOTICE '📈 Expected results:';
  RAISE NOTICE '- Performance Advisor: 0 warnings (was 82)';
  RAISE NOTICE '- Slightly faster queries (no RLS evaluation overhead)';
  RAISE NOTICE '- Cleaner, more honest architecture';
END $$;