-- Migration to fix custom_domains table structure
-- This fixes the "record new has no field updated_at" error

-- 1. Add the missing updated_at column
ALTER TABLE custom_domains 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add the missing is_primary column (from Migration 002)
ALTER TABLE custom_domains 
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- 3. Create a partial unique index to ensure only one primary domain per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_primary_per_tenant 
ON custom_domains(tenant_id) 
WHERE is_primary = true;

-- 4. Set the first domain as primary for existing tenants (if not already set)
UPDATE custom_domains 
SET is_primary = true 
WHERE id IN (
  SELECT DISTINCT ON (tenant_id) id 
  FROM custom_domains 
  WHERE is_primary IS NOT true
  ORDER BY tenant_id, created_at ASC
);

-- 5. Ensure the trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Recreate the trigger (drop and recreate to ensure it's properly configured)
DROP TRIGGER IF EXISTS update_custom_domains_updated_at ON custom_domains;
CREATE TRIGGER update_custom_domains_updated_at 
  BEFORE UPDATE ON custom_domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Update all existing records to set updated_at if null
UPDATE custom_domains 
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

-- 8. Add comment for documentation
COMMENT ON COLUMN custom_domains.updated_at IS 'Timestamp of last update, automatically maintained by trigger';
COMMENT ON COLUMN custom_domains.is_primary IS 'Indicates if this is the primary domain for the tenant. Used for emails and admin redirects.';

-- 9. Verify the fix by selecting one row
SELECT id, domain, updated_at, is_primary FROM custom_domains LIMIT 1;