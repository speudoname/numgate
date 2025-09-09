# NumGate - Gateway Platform CLAUDE.md

## 🎯 PROJECT CONTEXT
**NumGate is the MAIN GATEWAY for a multi-tenant SaaS platform.** It handles authentication, tenant management, and proxies requests to sub-applications.

### Architecture Overview
- **Gateway Role**: Central authentication and routing hub
- **Proxy Applications**: ContactGate (contacts), PageNumGate (page builder)
- **Multi-Tenant**: Each tenant has isolated data and custom domains
- **Shared Infrastructure**: Supabase database, Vercel deployment

### Sub-Applications
- **ContactGate**: Contact management system (proxied at `/contacts`)
- **PageNumGate**: Static HTML page builder (proxied at `/page-builder`)

## 🔒 CRITICAL SECURITY RULES

### Authentication Pattern (FINAL ARCHITECTURE)
- **Custom JWT Authentication** (not Supabase Auth)
- **Service Key Pattern**: Use `supabaseAdmin` with STRICT tenant filtering
- **Security Rule**: EVERY query MUST include `.eq('tenant_id', tenantId)`

### Service Key Usage
```typescript
// ✅ CORRECT - Always filter by tenant
const { data } = await supabaseAdmin
  .from('table_name')
  .select('*')
  .eq('tenant_id', tenantId) // MANDATORY
```

### Security Checklist
1. ✅ Use service key with MANDATORY tenant filtering
2. ✅ Validate JWT token before operations
3. ✅ Check user belongs to tenant
4. ✅ NEVER trust client-provided tenant_id
5. ✅ Validate ALL inputs with zod schemas

## 🎨 UI/UX STANDARDS
- **USE NEOBRUTALISM.DEV EXCLUSIVELY**: All UI components from NeoBrutalism.dev
- **NO CUSTOM COMPONENTS**: Never create custom UI elements
- **STRICT ADHERENCE**: Copy exact code from neobrutalism.dev
- **NO EXCEPTIONS**: No custom styling allowed

## 🚀 DEPLOYMENT STRATEGY
- **NEVER deploy directly to Vercel**
- **ALWAYS push to GitHub first** → Auto-deployment
- **Workflow**: Changes → Build locally → Commit → Push → Auto-deploy

## 🛠️ DEVELOPMENT RULES
- **NEVER ASSUME**: Always align with user before implementation
- **ASK QUESTIONS**: When unclear, ask for clarification
- **SLOW AND STEADY**: Build incrementally, verify each step
- **CONFIRM APPROACH**: Explain approach and get approval

## 🔧 AVAILABLE TOOLS & ACCESS
- **Vercel CLI**: Full access to Vercel platform
- **Supabase**: Complete access to database (hbopxprpgvrkucztsvnq)
- **Postmark**: Full email system access and configuration
- **Environment Variables**: All necessary keys and secrets available
- **GitHub**: Full repository access for deployment

## 📋 PROXY ROUTING
- `/contacts` → Proxies to ContactGate
- `/page-builder` → Proxies to PageNumGate
- Custom domains → Tenant-specific routing
- JWT tokens → Passed to sub-applications