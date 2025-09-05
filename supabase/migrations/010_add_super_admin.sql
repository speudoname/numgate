-- Migration 010: Add Super Admin Support
-- Adds is_super_admin column and sets up initial super admin

-- ============================================
-- 1. ADD SUPER ADMIN COLUMN
-- ============================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Add index for quick super admin lookups
CREATE INDEX IF NOT EXISTS idx_users_super_admin ON users(is_super_admin) WHERE is_super_admin = true;

-- ============================================
-- 2. SET YOUR INITIAL SUPER ADMIN
-- ============================================

-- Make levan@sarke.ge the super admin
UPDATE users 
SET is_super_admin = true 
WHERE email = 'levan@sarke.ge';

-- ============================================
-- 3. ADD APP LIMITS SUPPORT (for future)
-- ============================================

-- Add columns to app_access for future app limits
ALTER TABLE app_access
ADD COLUMN IF NOT EXISTS limits JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add index for finding expired access
CREATE INDEX IF NOT EXISTS idx_app_access_expires ON app_access(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================
-- 4. ADD TENANT METADATA
-- ============================================

-- Add useful columns for super admin dashboard
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Index for finding inactive/suspended tenants
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);
CREATE INDEX IF NOT EXISTS idx_tenants_suspended ON tenants(suspended_at) WHERE suspended_at IS NOT NULL;

-- ============================================
-- 5. VERIFICATION
-- ============================================

DO $$
DECLARE
  super_admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO super_admin_count 
  FROM users 
  WHERE is_super_admin = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Super Admin setup complete!';
  RAISE NOTICE '👤 Super admins configured: %', super_admin_count;
  RAISE NOTICE '';
  RAISE NOTICE 'New capabilities:';
  RAISE NOTICE '- is_super_admin column on users table';
  RAISE NOTICE '- App limits support (limits, expires_at)';
  RAISE NOTICE '- Tenant management fields (is_active, suspended_at, notes)';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Next: Build /super-admin routes in the app';
END $$;