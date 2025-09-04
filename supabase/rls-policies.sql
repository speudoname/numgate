-- Enable Row Level Security on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_users ENABLE ROW LEVEL SECURITY;

-- For now, we'll use service role key from our backend
-- These policies will be refined as we build the auth system

-- Tenants policies (service role can do everything)
CREATE POLICY "Service role can manage tenants" ON tenants
  FOR ALL USING (true) WITH CHECK (true);

-- Users policies
CREATE POLICY "Service role can manage users" ON users
  FOR ALL USING (true) WITH CHECK (true);

-- App access policies
CREATE POLICY "Service role can manage app access" ON app_access
  FOR ALL USING (true) WITH CHECK (true);

-- Custom domains policies
CREATE POLICY "Service role can manage domains" ON custom_domains
  FOR ALL USING (true) WITH CHECK (true);

-- Sessions policies
CREATE POLICY "Service role can manage sessions" ON sessions
  FOR ALL USING (true) WITH CHECK (true);

-- End users policies
CREATE POLICY "Service role can manage end users" ON end_users
  FOR ALL USING (true) WITH CHECK (true);