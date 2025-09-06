-- Migration 013: Add Subscription Plans Table
-- This creates a flexible subscription plans system for future expansion

-- ============================================
-- 1. CREATE SUBSCRIPTION PLANS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- 'free', 'pro', 'enterprise', etc.
  display_name TEXT NOT NULL, -- 'Free Plan', 'Professional', 'Enterprise'
  description TEXT,
  price_monthly DECIMAL(10, 2) DEFAULT 0.00,
  price_yearly DECIMAL(10, 2) DEFAULT 0.00,
  features JSONB DEFAULT '{}', -- Flexible feature storage
  limits JSONB DEFAULT '{}', -- Usage limits (users, domains, etc.)
  is_active BOOLEAN DEFAULT true, -- Can new tenants select this plan?
  sort_order INTEGER DEFAULT 0, -- Display order
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. INSERT DEFAULT PLANS
-- ============================================

INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, features, limits, sort_order) 
VALUES 
  (
    'free',
    'Free Plan',
    'Perfect for getting started',
    0.00,
    0.00,
    '{"page_builder": true, "custom_domains": 1, "team_members": 3, "storage": "1GB"}'::jsonb,
    '{"domains": 1, "users": 3, "api_calls": 1000}'::jsonb,
    1
  ),
  (
    'pro',
    'Professional',
    'For growing businesses',
    29.99,
    299.99,
    '{"page_builder": true, "email": true, "custom_domains": 5, "team_members": 10, "storage": "10GB", "priority_support": true}'::jsonb,
    '{"domains": 5, "users": 10, "api_calls": 10000}'::jsonb,
    2
  ),
  (
    'enterprise',
    'Enterprise',
    'For large organizations',
    99.99,
    999.99,
    '{"page_builder": true, "email": true, "webinar": true, "lms": true, "custom_domains": -1, "team_members": -1, "storage": "unlimited", "priority_support": true, "dedicated_support": true}'::jsonb,
    '{"domains": -1, "users": -1, "api_calls": -1}'::jsonb,
    3
  )
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. ADD PLAN REFERENCE TO TENANTS
-- ============================================

-- Add plan_id column to tenants (foreign key to subscription_plans)
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES subscription_plans(id),
ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- Set default expiration for free plan (1 year from now)
UPDATE tenants 
SET plan_expires_at = NOW() + INTERVAL '1 year' 
WHERE plan_expires_at IS NULL;

-- ============================================
-- 4. MIGRATE EXISTING PLAN DATA
-- ============================================

-- Update existing tenants to use the new plan_id based on their subscription_plan text
UPDATE tenants 
SET plan_id = sp.id
FROM subscription_plans sp
WHERE tenants.subscription_plan = sp.name
AND tenants.plan_id IS NULL;

-- Set default plan for any tenant without a plan
UPDATE tenants 
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'free')
WHERE plan_id IS NULL;

-- ============================================
-- 5. ADD SETTINGS STRUCTURE TO TENANTS
-- ============================================

-- Update the settings JSONB with default structure if empty
UPDATE tenants
SET settings = '{
  "organization": {
    "description": "",
    "timezone": "UTC",
    "language": "en"
  },
  "notifications": {
    "emailAlerts": true,
    "domainAlerts": true,
    "userActivityAlerts": false
  }
}'::jsonb
WHERE settings = '{}'::jsonb OR settings IS NULL;

-- ============================================
-- 6. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON subscription_plans(name);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_tenants_plan_id ON tenants(plan_id);
CREATE INDEX IF NOT EXISTS idx_tenants_plan_expires ON tenants(plan_expires_at);

-- ============================================
-- 7. ADD RLS POLICIES
-- ============================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can view active plans (for signup/upgrade)
CREATE POLICY "subscription_plans_select_active" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- Service key can manage all plans (for super admin)
-- No other policies needed as we use service key

-- ============================================
-- 8. ADD UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER update_subscription_plans_updated_at 
    BEFORE UPDATE ON subscription_plans 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. VERIFICATION
-- ============================================

DO $$
DECLARE
  plan_count INTEGER;
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO plan_count FROM subscription_plans;
  SELECT COUNT(*) INTO migrated_count FROM tenants WHERE plan_id IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Subscription Plans Migration Complete!';
  RAISE NOTICE '📊 Plans created: %', plan_count;
  RAISE NOTICE '🔄 Tenants migrated: %', migrated_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Implement settings page UI';
  RAISE NOTICE '2. Create settings API endpoints';
  RAISE NOTICE '3. Test organization settings update';
END $$;