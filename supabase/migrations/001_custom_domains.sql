-- Create custom_domains table for multi-tenant domain management
CREATE TABLE IF NOT EXISTS public.custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  domain TEXT UNIQUE NOT NULL,
  verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  ssl_status TEXT DEFAULT 'pending', -- pending, active, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON public.custom_domains(domain);
CREATE INDEX IF NOT EXISTS idx_custom_domains_tenant_id ON public.custom_domains(tenant_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_custom_domains_updated_at 
  BEFORE UPDATE ON public.custom_domains 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add custom_domains array to tenants table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tenants' 
    AND column_name = 'custom_domains'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN custom_domains TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
END $$;

-- Add RLS policies
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;

-- Only tenant owners can manage their domains
CREATE POLICY "Tenant owners can manage domains" ON public.custom_domains
  FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM public.users 
    WHERE id = auth.uid() AND role = 'owner'
  ));