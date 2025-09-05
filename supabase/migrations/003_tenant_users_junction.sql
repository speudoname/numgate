-- Create junction table for many-to-many relationship between users and tenants
-- This allows users to belong to multiple tenants with different roles

-- Create the tenant_users table
CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'member', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Ensure a user can only have one role per tenant
  UNIQUE(tenant_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX idx_tenant_users_role ON tenant_users(role);

-- Add RLS policies
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tenant memberships
CREATE POLICY "Users can view their own memberships" ON tenant_users
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Tenant admins can view all members of their tenant
CREATE POLICY "Admins can view tenant members" ON tenant_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = tenant_users.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.role = 'admin'
    )
  );

-- Policy: Tenant admins can add members to their tenant
CREATE POLICY "Admins can add tenant members" ON tenant_users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = tenant_id
      AND tu.user_id = auth.uid()
      AND tu.role = 'admin'
    )
  );

-- Policy: Tenant admins can update member roles
CREATE POLICY "Admins can update member roles" ON tenant_users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = tenant_users.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.role = 'admin'
    )
  );

-- Policy: Tenant admins can remove members (except themselves)
CREATE POLICY "Admins can remove members" ON tenant_users
  FOR DELETE
  USING (
    user_id != auth.uid() AND
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = tenant_users.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.role = 'admin'
    )
  );

-- Migrate existing data: Add all current tenant owners as admins
-- Assuming there's an owner_id or email field in tenants table
INSERT INTO tenant_users (tenant_id, user_id, role)
SELECT DISTINCT t.id, u.id, 'admin'
FROM tenants t
JOIN users u ON u.email = t.email
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_users tu 
  WHERE tu.tenant_id = t.id AND tu.user_id = u.id
);

-- Add comment for documentation
COMMENT ON TABLE tenant_users IS 'Junction table managing many-to-many relationship between users and tenants with role-based access';
COMMENT ON COLUMN tenant_users.role IS 'User role within the tenant: admin (full access), member (standard access), viewer (read-only)';