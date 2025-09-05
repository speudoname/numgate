# Supabase Client Usage Guide

## 🔴 Operations that MUST use Service Key (supabaseAdmin)

### 1. User Registration (`/api/auth/register`)
**Why:** Creating new users and tenants requires bypassing RLS
```typescript
// Only these specific operations:
- Creating new user in users table
- Creating new tenant in tenants table  
- Creating tenant_users relationship
- Setting up initial app_access
```

### 2. System Setup Scripts
**Why:** Initial setup and migrations need full access
```typescript
// Scripts in /scripts/ directory:
- create-komunate-tenant.ts
- migrate-blob-structure.ts
- setup scripts
```

## 🟢 Operations that MUST use Anon Key (with RLS)

### ALL Other Operations Including:

#### Domain Management (`/api/domains/*`)
```typescript
// ✅ Use anon client - RLS ensures tenant isolation
- List domains (filtered by tenant)
- Add domain (checked against tenant)
- Update domain (verified ownership)
- Delete domain (verified ownership)
- Verify domain status
```

#### Tenant Operations (`/api/tenant/*`)
```typescript
// ✅ Use anon client
- Get tenant info (RLS filters)
- Update tenant settings (RLS checks admin role)
- List tenant users (RLS filters)
```

#### User Operations (`/api/users/*`)
```typescript
// ✅ Use anon client
- Get user profile (RLS checks same tenant)
- Update profile (RLS checks own profile)
- List users in tenant (RLS filters)
```

#### App Access (`/api/apps/*`)
```typescript
// ✅ Use anon client
- Check app access (RLS filters by tenant)
- Update app settings (RLS checks admin)
```

## 📝 Implementation Pattern

### For Service Key Operations (RARE):
```typescript
import { supabaseAdmin } from '@/lib/supabase/server'

// ONLY in /api/auth/register
const { data: user } = await supabaseAdmin
  .from('users')
  .insert([userData])
  .select()
  .single()
```

### For Anon Key Operations (DEFAULT):
```typescript
import { createServerClient } from '@/lib/supabase/client'

export async function handler(request: NextRequest) {
  const supabase = createServerClient()
  
  // Pass JWT claims for RLS
  const { data } = await supabase
    .from('custom_domains')
    .select('*')
    // RLS automatically filters by tenant!
}
```

## ⚠️ Security Rules

1. **DEFAULT TO ANON KEY** - If unsure, use anon key
2. **SERVICE KEY IS EXCEPTIONAL** - Only for user creation
3. **NEVER EXPOSE SERVICE KEY** - Keep it server-side only
4. **ALWAYS USE RLS** - Let database handle isolation
5. **VALIDATE EVERYTHING** - Use zod schemas

## Current Files Using Service Key (TO BE UPDATED):

### Keep Service Key:
- `/api/auth/register/route.ts` - User registration only
- `/scripts/*` - Setup scripts

### MUST Change to Anon Key:
- `/api/auth/login/route.ts` ❌
- `/api/domains/route.ts` ❌
- `/api/domains/[id]/route.ts` ❌
- `/api/domains/[id]/verify/route.ts` ❌
- `/api/domains/[id]/status/route.ts` ❌
- `/api/domains/[id]/primary/route.ts` ❌
- `/api/tenant/route.ts` ❌
- `/api/tenants/users/route.ts` ❌
- `/api/tenants/users/[userId]/route.ts` ❌

## Summary

**Service Key = 1% of operations (user registration only)**
**Anon Key = 99% of operations (everything else)**

This ensures complete tenant isolation through RLS!