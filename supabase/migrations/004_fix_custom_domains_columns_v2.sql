-- Migration to fix custom_domains table structure
-- This fixes the "record new has no field updated_at" error
-- Version 2: Handles existing primary domains

-- 1. Add the missing updated_at column if it doesn't exist
ALTER TABLE custom_domains 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add the missing is_primary column if it doesn't exist (from Migration 002)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'custom_domains' 
    AND column_name = 'is_primary'
  ) THEN
    ALTER TABLE custom_domains 
    ADD COLUMN is_primary BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 3. Drop existing index if it exists and recreate
DROP INDEX IF EXISTS idx_one_primary_per_tenant;
CREATE UNIQUE INDEX idx_one_primary_per_tenant 
ON custom_domains(tenant_id) 
WHERE is_primary = true;

-- 4. Set the first domain as primary for tenants that don't have a primary domain yet
UPDATE custom_domains 
SET is_primary = true 
WHERE id IN (
  SELECT cd.id 
  FROM custom_domains cd
  WHERE NOT EXISTS (
    SELECT 1 
    FROM custom_domains cd2 
    WHERE cd2.tenant_id = cd.tenant_id 
    AND cd2.is_primary = true
  )
  AND cd.id = (
    SELECT id 
    FROM custom_domains cd3 
    WHERE cd3.tenant_id = cd.tenant_id 
    ORDER BY created_at ASC 
    LIMIT 1
  )
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

-- 8. Add comments for documentation
COMMENT ON COLUMN custom_domains.updated_at IS 'Timestamp of last update, automatically maintained by trigger';
COMMENT ON COLUMN custom_domains.is_primary IS 'Indicates if this is the primary domain for the tenant. Used for emails and admin redirects.';

-- 9. Show current state for verification
SELECT 
  domain,
  is_primary,
  updated_at,
  tenant_id
FROM custom_domains
ORDER BY tenant_id, created_at;