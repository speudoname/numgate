-- Check existing tenants
SELECT id, name, slug, email, created_at 
FROM tenants 
ORDER BY created_at DESC 
LIMIT 5;

-- If you have a tenant, use its ID below
-- Replace 'YOUR_TENANT_ID' with the actual UUID from above query

-- Add a test custom domain for local testing
-- INSERT INTO custom_domains (tenant_id, domain, verified)
-- VALUES ('YOUR_TENANT_ID', 'test.localhost', true);

-- Check custom domains
SELECT cd.*, t.name as tenant_name 
FROM custom_domains cd
JOIN tenants t ON cd.tenant_id = t.id;