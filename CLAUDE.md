## Important Development Rules
     - **NEVER ASSUME**: Always align with the user before making implementation decisions
     - **ASK QUESTIONS**: When unclear about requirements, ask for clarification
     - **AMBIGUITY RULE**: When something is not clear and there's ~50/50 understanding, ALWAYS ask for clarification instead of guessing
     - **SLOW AND STEADY**: Build features incrementally and verify each step with the user
     - **CONFIRM APPROACH**: Before implementing, explain the approach and get approval

## 🔒 CRITICAL SECURITY RULES - MUST FOLLOW

### Supabase Client Usage
**NEVER use service key (supabaseAdmin) unless absolutely necessary!**

#### When to use SERVICE KEY (supabaseAdmin):
- ONLY for user registration (creating new users/tenants)
- System migrations or setup scripts
- Background jobs that need to bypass RLS
- **Nothing else!**

#### When to use ANON KEY (supabase client):
- ALL tenant-scoped operations
- ALL user queries within their tenant
- ALL domain management
- ALL normal CRUD operations
- **This is the default - use this 99% of the time**

### Security Checklist for New Features:
1. ✅ Use anon key with RLS (not service key)
2. ✅ Validate ALL inputs with zod schemas from `/lib/validations/`
3. ✅ Check tenant_id from JWT (never trust client)
4. ✅ Ensure user belongs to tenant before any operation
5. ✅ Never expose sensitive data in console.log
6. ✅ Add rate limiting to public endpoints
7. ✅ Sanitize user inputs to prevent XSS
8. ✅ Use parameterized queries (Supabase does this)

### Example of CORRECT implementation:
```typescript
// ✅ CORRECT - Uses anon key with RLS
import { createServerClient } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id')
  
  // Use anon client - RLS will handle isolation
  const supabase = createServerClient()
  
  // This query is automatically filtered by RLS policies
  const { data, error } = await supabase
    .from('custom_domains')
    .select('*')
    .eq('tenant_id', tenantId)
}
```

### Example of WRONG implementation:
```typescript
// ❌ WRONG - Don't use service key for tenant operations!
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  // This bypasses RLS - security risk!
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