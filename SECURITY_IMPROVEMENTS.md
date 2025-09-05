# Security Improvements Needed

## ✅ Completed
1. **Removed test endpoint** - `/api/auth/test/route.ts` deleted
2. **Removed redundant SQL files** - Cleaned up duplicate migrations
3. **Identified Supabase key usage issues** - Created plan below

## 🔴 High Priority Security Issues

### 1. Supabase Service Key Overuse
**Current Issue:** Service key (bypasses RLS) used for ALL database operations
**Risk:** Potential for data leaks between tenants

**Solution:** Use service key ONLY for:
- User registration (creating new users/tenants)
- Admin operations that need to bypass RLS
- System-level operations

**Use anon key for:**
- All tenant-scoped queries
- User operations within their tenant
- Domain management within tenant

### 2. Missing Rate Limiting
**Affected endpoints:**
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/forgot-password`

**Solution:** Implement rate limiting middleware using:
```typescript
// Option 1: Use @vercel/kv for rate limiting
// Option 2: Use upstash/ratelimit
// Option 3: Use custom implementation with Redis
```

### 3. Input Validation Gaps
**Issues found:**
- No email format validation
- No password strength requirements
- No SQL injection protection (though Supabase provides some)
- No XSS sanitization for tenant names

**Solution:**
- Add zod schemas for all API inputs
- Implement password strength requirements
- Sanitize all user inputs

## 🟡 Medium Priority Issues

### 1. Secrets in Console Logs
**Files with issues:**
- `scripts/create-blob-store.ts` - Logs tokens
- `scripts/check-migrations.ts` - Shows password format

**Solution:** Remove or mask sensitive data in logs

### 2. Missing Security Headers
**Add to middleware:**
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy` headers

### 3. CORS Not Configured
**Solution:** Configure CORS for API routes:
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
```

## 🟢 Low Priority Improvements

### 1. Add Request Size Limits
- Implement body size limits for file uploads
- Limit JSON payload sizes

### 2. Add Audit Logging
- Log all authentication attempts
- Log all admin actions
- Log domain changes

### 3. Implement Session Management
- Add session expiration
- Add refresh token rotation
- Add logout everywhere functionality

## Implementation Priority

1. **First:** Fix Supabase key usage (create separate functions)
2. **Second:** Add input validation with zod
3. **Third:** Implement rate limiting
4. **Fourth:** Add security headers
5. **Fifth:** Clean up console logs in scripts

## RLS (Row Level Security) Policies Needed

```sql
-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY tenant_isolation ON tenants
  FOR ALL USING (id = current_setting('app.current_tenant_id')::uuid);

-- Users can only see their own data
CREATE POLICY users_isolation ON users
  FOR ALL USING (id = auth.uid());

-- Domain management within tenant
CREATE POLICY domains_tenant_isolation ON custom_domains
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

## Next Steps

1. Create `/lib/supabase/tenant-client.ts` for tenant-scoped operations
2. Update all API routes to use appropriate client (service vs anon)
3. Add input validation schemas
4. Implement rate limiting middleware
5. Add security headers to middleware