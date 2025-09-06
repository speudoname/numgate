-- Domain claims table for handling domain ownership verification
CREATE TABLE IF NOT EXISTS domain_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  claiming_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  current_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL, -- Current owner if exists
  verification_token TEXT UNIQUE NOT NULL, -- Token to add as TXT record
  txt_record_name TEXT NOT NULL, -- The full TXT record name (e.g., _numgate-verification.domain.com)
  status TEXT DEFAULT 'pending', -- pending, verified, expired, completed
  expires_at TIMESTAMPTZ NOT NULL, -- 24 hours from creation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_domain_claims_domain ON domain_claims(domain);
CREATE INDEX IF NOT EXISTS idx_domain_claims_claiming_tenant ON domain_claims(claiming_tenant_id);
CREATE INDEX IF NOT EXISTS idx_domain_claims_token ON domain_claims(verification_token);
CREATE INDEX IF NOT EXISTS idx_domain_claims_status ON domain_claims(status);

-- Add updated_at trigger
-- First ensure the function exists (CREATE OR REPLACE to avoid errors)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Now create the trigger
CREATE TRIGGER update_domain_claims_updated_at 
    BEFORE UPDATE ON domain_claims 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for domain_claims
ALTER TABLE domain_claims ENABLE ROW LEVEL SECURITY;

-- Since we use custom JWT with service key, RLS won't work properly
-- We'll rely on explicit tenant filtering in API routes
-- But we keep RLS enabled to block anon key access

-- Create a simple policy that blocks all access (service key bypasses this)
CREATE POLICY "domain_claims_block_all" ON domain_claims
  FOR ALL USING (false);