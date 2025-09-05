## Important Development Rules
     - **NEVER ASSUME**: Always align with the user before making implementation decisions
     - **ASK QUESTIONS**: When unclear about requirements, ask for clarification
     - **AMBIGUITY RULE**: When something is not clear and there's ~50/50 understanding, ALWAYS ask for clarification instead of guessing
     - **SLOW AND STEADY**: Build features incrementally and verify each step with the user
     - **CONFIRM APPROACH**: Before implementing, explain the approach and get approval

## 🎓 LESSONS LEARNED - CRITICAL KNOWLEDGE

### RLS (Row Level Security) - FINAL ARCHITECTURE DECISION
**IMPORTANT: Custom JWT cannot integrate with Supabase RLS due to infrastructure limitations**

#### Final Architecture (This is permanent, not temporary):
- We use custom JWT authentication (not Supabase Auth)
- Supabase doesn't pass custom headers to PostgreSQL for RLS
- **Solution**: Use service key with STRICT tenant filtering in all queries
- **Security**: Middleware validates JWT, then API routes filter by tenant_id
- This is a secure and common pattern for custom auth with Supabase

#### RLS Policy Syntax Rules:
- **SELECT/DELETE**: Use only `USING` clause (no `WITH CHECK`)
- **INSERT**: Use only `WITH CHECK` clause (no `USING`) 
- **UPDATE**: Use both `USING` (for read) and `WITH CHECK` (for write)
- **ALL**: Use both `USING` and `WITH CHECK`

Example:
```sql
-- ✅ CORRECT for SELECT
CREATE POLICY "read_policy" ON table
  FOR SELECT USING (condition);

-- ✅ CORRECT for INSERT  
CREATE POLICY "insert_policy" ON table
  FOR INSERT WITH CHECK (condition);

-- ✅ CORRECT for UPDATE
CREATE POLICY "update_policy" ON table
  FOR UPDATE 
  USING (can_read_condition)
  WITH CHECK (can_write_condition);
```

### Service Key Usage Pattern (FINAL):
```
ALL ROUTES USE SERVICE KEY - This is our permanent architecture:
├─ Auth routes (login/register) → Service key (needs password_hash)
├─ Public routes (homepage, tenant lookup) → Service key (no auth context)
├─ Authenticated API routes → Service key with MANDATORY tenant filtering
└─ ALWAYS: Filter every query by tenant_id

CRITICAL SECURITY RULE:
Every database query MUST include .eq('tenant_id', tenantId)
The only exceptions are:
- Login (user lookup by email)
- Registration (creating new tenant/user)
- Public tenant lookup (by domain/slug)
```

### What Breaks When You Enable RLS:
1. **Subdomain resolution** - Can't lookup tenant by slug
2. **Public pages** - Can't read tenant info to serve content
3. **Domain verification** - Can't check if domain exists
4. **Catch-all routes** - Can't identify tenant

### How to Fix RLS Breaking Public Access:
1. Create public read policies for basic info
2. OR use service key for specific public lookups
3. Keep write operations restricted to authenticated users

## 🔒 CRITICAL SECURITY RULES - MUST FOLLOW

### Supabase Client Usage - FINAL PATTERN
**We use custom JWT with service key - This is our permanent architecture**

#### When to use SERVICE KEY (supabaseAdmin) - Required For:
- User registration (creating new users/tenants)
- Login endpoint (needs password_hash access)
- Public routes (tenant lookup, homepage serving)
- **ALL authenticated routes** (with explicit tenant filtering)

#### Security Requirements (MANDATORY):
- ALWAYS filter by tenant_id explicitly in EVERY query
- ALWAYS validate JWT token before operations
- ALWAYS check user belongs to tenant
- NEVER trust client-provided tenant_id without verification
- NEVER query without .eq('tenant_id', tenantId)

#### Why This Pattern Is Secure:
- Middleware validates JWT before route handler runs
- Every query explicitly filters by validated tenant_id
- No cross-tenant data access possible
- Common pattern for custom auth with Supabase

### Security Checklist for New Features:
1. ✅ Use service key with MANDATORY tenant filtering in EVERY query
2. ✅ Validate ALL inputs with zod schemas from `/lib/validations/`
3. ✅ Check tenant_id from JWT (never trust client)
4. ✅ Ensure user belongs to tenant before any operation
5. ✅ Never expose sensitive data in console.log (all cleaned up)
6. ✅ Add rate limiting to public endpoints
7. ✅ Sanitize user inputs to prevent XSS
8. ✅ Use parameterized queries (Supabase does this)
9. ✅ NEVER make a query without .eq('tenant_id', tenantId)

### Example of CORRECT implementation (PERMANENT PATTERN):
```typescript
// ✅ CURRENT - Service key with explicit tenant filtering
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // Validate auth first
  const tenantId = request.headers.get('x-tenant-id')
  const userId = request.headers.get('x-user-id')
  
  if (!tenantId || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Use service key BUT always filter by tenant_id
  const { data, error } = await supabaseAdmin
    .from('custom_domains')
    .select('*')
    .eq('tenant_id', tenantId) // CRITICAL: Always filter by tenant
}
```

### Example of WRONG implementation:
```typescript
// ❌ WRONG - Service key without tenant filtering!
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  // DANGER: No tenant filtering - exposes all data!
  const { data } = await supabaseAdmin
    .from('custom_domains')
    .select('*')
}
```

## UI/UX Design Standards - STRICT REQUIREMENTS
     - **USE NEOBRUTALISM.DEV EXCLUSIVELY**: For ALL UI components, use ONLY components from NeoBrutalism.dev
     - **NO CUSTOM COMPONENTS**: Do NOT create custom UI components or invent new designs
     - **STRICT ADHERENCE**: Every button, card, form, modal, and UI element MUST be from NeoBrutalism.dev
     - **FOLLOW THE GUIDE**: See NEOBRUTALISM_GUIDE.md for complete component list and usage
     - **COPY EXACT CODE**: Always copy component code exactly from neobrutalism.dev - no modifications
     - **CHECK FIRST**: Before implementing ANY UI, check if NeoBrutalism.dev has that component
     - **NO EXCEPTIONS**: This is a strict requirement - no custom styling or components allowed