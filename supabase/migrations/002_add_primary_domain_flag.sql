-- Add primary domain flag to custom_domains table
-- This allows tenants to have multiple domains with one marked as primary

-- Add the is_primary column
ALTER TABLE custom_domains 
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Create a partial unique index to ensure only one primary domain per tenant
-- This allows multiple non-primary domains but only one primary
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_primary_per_tenant 
ON custom_domains(tenant_id) 
WHERE is_primary = true;

-- Set the first domain as primary for existing tenants
-- This ensures existing domains have a primary
UPDATE custom_domains 
SET is_primary = true 
WHERE id IN (
  SELECT DISTINCT ON (tenant_id) id 
  FROM custom_domains 
  ORDER BY tenant_id, created_at ASC
);

-- Add comment for documentation
COMMENT ON COLUMN custom_domains.is_primary IS 'Indicates if this is the primary domain for the tenant. Used for emails and admin redirects.';