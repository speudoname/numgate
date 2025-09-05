-- Migration 011: Setup Komunate as Regular Tenant
-- Makes komunate.com a verified custom domain for the komunate tenant
-- Adds levan@sarke.ge as admin user of komunate tenant

-- ============================================
-- 1. GET THE KOMUNATE TENANT ID
-- ============================================

DO $$
DECLARE
  v_komunate_tenant_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the komunate tenant ID
  SELECT id INTO v_komunate_tenant_id
  FROM tenants
  WHERE slug = 'komunate'
  LIMIT 1;

  IF v_komunate_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Komunate tenant not found! Please create a tenant with slug "komunate" first.';
  END IF;

  -- Get levan@sarke.ge user ID
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'levan@sarke.ge'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User levan@sarke.ge not found!';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🔍 Found komunate tenant: %', v_komunate_tenant_id;
  RAISE NOTICE '👤 Found user levan@sarke.ge: %', v_user_id;

  -- ============================================
  -- 2. ADD USER TO KOMUNATE TENANT
  -- ============================================

  -- Check if user is already in komunate tenant
  IF NOT EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE tenant_id = v_komunate_tenant_id 
    AND user_id = v_user_id
  ) THEN
    INSERT INTO tenant_users (tenant_id, user_id, role)
    VALUES (v_komunate_tenant_id, v_user_id, 'owner');
    
    RAISE NOTICE '✅ Added levan@sarke.ge as owner of komunate tenant';
  ELSE
    -- Update role to owner if different
    UPDATE tenant_users 
    SET role = 'owner'
    WHERE tenant_id = v_komunate_tenant_id 
    AND user_id = v_user_id
    AND role != 'owner';
    
    RAISE NOTICE '✅ User already in komunate tenant (updated role to owner)';
  END IF;

  -- ============================================
  -- 3. ADD KOMUNATE.COM AS VERIFIED DOMAIN
  -- ============================================

  -- First, remove any existing komunate.com entries
  DELETE FROM custom_domains 
  WHERE domain IN ('komunate.com', 'www.komunate.com');

  -- Add komunate.com as verified and primary domain
  INSERT INTO custom_domains (
    tenant_id,
    domain,
    verified,
    is_primary,
    verification_token,
    dns_configured,
    ssl_configured
  ) VALUES (
    v_komunate_tenant_id,
    'komunate.com',
    true,
    true,
    'verified-platform-domain',
    true,
    true
  );

  RAISE NOTICE '✅ Added komunate.com as verified primary domain';

  -- Also add www.komunate.com
  INSERT INTO custom_domains (
    tenant_id,
    domain,
    verified,
    is_primary,
    verification_token,
    dns_configured,
    ssl_configured
  ) VALUES (
    v_komunate_tenant_id,
    'www.komunate.com',
    true,
    false,
    'verified-platform-domain',
    true,
    true
  );

  RAISE NOTICE '✅ Added www.komunate.com as verified domain';

  -- ============================================
  -- 4. ENSURE APP ACCESS FOR KOMUNATE
  -- ============================================

  -- Give komunate tenant access to all apps
  INSERT INTO app_access (tenant_id, app_name, enabled)
  VALUES 
    (v_komunate_tenant_id, 'page_builder', true),
    (v_komunate_tenant_id, 'email', true),
    (v_komunate_tenant_id, 'webinar', true),
    (v_komunate_tenant_id, 'lms', true)
  ON CONFLICT (tenant_id, app_name) 
  DO UPDATE SET enabled = EXCLUDED.enabled;

  RAISE NOTICE '✅ Enabled all apps for komunate tenant';

  -- ============================================
  -- 5. UPDATE TENANT SETTINGS
  -- ============================================

  -- Make sure komunate tenant is active
  UPDATE tenants
  SET 
    is_active = true,
    subscription_plan = 'enterprise'
  WHERE id = v_komunate_tenant_id;

  RAISE NOTICE '✅ Updated komunate tenant to enterprise plan';

  -- ============================================
  -- 6. FINAL VERIFICATION
  -- ============================================

  RAISE NOTICE '';
  RAISE NOTICE '🎉 SUCCESS! Komunate is now a regular tenant!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Summary:';
  RAISE NOTICE '  ✓ komunate.komunate.com → Tenant subdomain';
  RAISE NOTICE '  ✓ komunate.com → Verified custom domain';
  RAISE NOTICE '  ✓ levan@sarke.ge → Owner of komunate tenant';
  RAISE NOTICE '  ✓ Super admin access → Still works (user property)';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next Steps:';
  RAISE NOTICE '  1. Deploy the code changes (removes platform special case)';
  RAISE NOTICE '  2. Clear your browser cookies';
  RAISE NOTICE '  3. Login to komunate.com with levan@sarke.ge';
  RAISE NOTICE '  4. You will be redirected to komunate.com (not subdomain)';
  RAISE NOTICE '  5. Pages will be served from komunate tenant blob storage';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Note: You may need to clear the tenant cache or restart the app';

END $$;