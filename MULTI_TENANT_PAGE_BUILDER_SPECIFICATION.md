# Multi-App Platform: Gateway + Page Builder Specification

## Project Overview

A multi-tenant platform ecosystem where tenants can access multiple business applications through a single gateway. The system consists of a central gateway for authentication and tenant management, with separate Vercel projects for each application (Page Builder, Email Marketing, Webinar Platform, etc.).

## Core Architecture

### Technology Stack
- **Gateway**: Next.js 14 + App Router (central auth and routing)
- **Page Builder**: Next.js 14 + App Router (separate Vercel project)
- **Future Apps**: Next.js 14 (separate Vercel projects)
- **Database**: Supabase (shared across all apps)
- **Storage**: Vercel Blob (static HTML pages)
- **Configuration**: Vercel Edge Config (theme configs)
- **Caching**: Vercel KV (sessions, small data)
- **Hosting**: Vercel (Edge Network)
- **Auth**: JWT tokens (cross-app authentication)
- **Admin UI**: Neobrutalism.dev components
- **Page Components**: Shadcn/Tailwind components

### Multi-App Architecture
```
Tenant Domain (mybusiness.com)
├── Gateway (yourapp.com) - Auth & Tenant Management
├── Page Builder (yourapp.com/page-builder) - Landing Pages
├── Email Marketing (yourapp.com/email) - Email Campaigns
├── Webinar Platform (yourapp.com/webinar) - Webinar Management
├── LMS (yourapp.com/lms) - Course Management
└── Future Apps...
```

## Gateway Architecture

### Gateway Responsibilities
- **Tenant Registration & Authentication**
- **Domain Verification & Management**
- **Single Sign-On (SSO)**
- **App Routing & Navigation**
- **Billing & Subscription Management**
- **Tenant Settings & Profile**

### Authentication Flow
1. **Login**: Tenant logs into gateway (`yourapp.com`)
2. **JWT Generation**: Gateway creates JWT with tenant context
3. **App Access**: JWT allows access to all apps
4. **Cross-App Validation**: Each app validates JWT to get tenant context

### Domain Management
- **Custom Domain Addition**: Tenant adds `mybusiness.com` to gateway
- **Domain Verification**: Gateway handles DNS verification
- **SSL Provisioning**: Automatic SSL certificates
- **App Routing**: All apps work under tenant's custom domain

## JWT Authentication System

### JWT Token Structure
```json
{
  "tenant_id": "uuid",
  "user_id": "uuid",
  "email": "user@example.com",
  "permissions": ["page_builder", "email", "webinar"],
  "exp": 1234567890,
  "iat": 1234567890
}
```

### Token Flow
1. **Gateway Login**: User authenticates, receives JWT
2. **App Access**: JWT stored in localStorage/cookies
3. **API Calls**: JWT sent with each request to apps
4. **Validation**: Each app validates JWT and extracts tenant context

### Security Considerations
- **Token Expiration**: 24-hour tokens with refresh mechanism
- **HTTPS Only**: All communication over HTTPS
- **Token Storage**: Secure storage in browser
- **Cross-App Validation**: Each app independently validates tokens

## Multi-App Routing

### URL Structure
```
Tenant Custom Domain: mybusiness.com
├── /page-builder → Page Builder App
├── /email → Email Marketing App
├── /webinar → Webinar Platform App
├── /lms → LMS App
└── / (root) → Gateway Dashboard
```

### Routing Implementation
- **Gateway**: Handles initial routing and auth
- **App Routing**: Each app handles its own routes
- **Shared Domain**: All apps work under tenant's verified domain
- **Seamless Experience**: Users don't notice multiple apps

## Database Schema (Shared Supabase)

### Core Tables
```sql
-- Tenants (Gateway manages)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  custom_domains TEXT[],
  subscription_plan TEXT DEFAULT 'free',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (Gateway manages)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- Custom Domains (Gateway manages)
CREATE TABLE custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  domain TEXT UNIQUE NOT NULL,
  verified BOOLEAN DEFAULT false,
  ssl_certificate JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App Access (Gateway manages)
CREATE TABLE app_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL, -- 'page_builder', 'email', 'webinar'
  enabled BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, app_name)
);

-- Page Builder Tables (Page Builder App manages)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  theme_config JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT,
  meta_description TEXT,
  content JSONB DEFAULT '{}',
  html_content TEXT,
  tags TEXT[],
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, slug)
);

-- AI Conversations (Page Builder App manages)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Gateway Implementation

### File Structure (Gateway App)
```
src/
├── app/
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── domains/
│   │   └── page.tsx
│   ├── settings/
│   │   └── page.tsx
│   ├── page-builder/
│   │   └── page.tsx (redirects to Page Builder App)
│   ├── email/
│   │   └── page.tsx (redirects to Email App)
│   ├── webinar/
│   │   └── page.tsx (redirects to Webinar App)
│   └── layout.tsx
├── api/
│   ├── auth/
│   │   ├── login/
│   │   ├── register/
│   │   └── logout/
│   ├── tenants/
│   ├── domains/
│   └── apps/
├── components/
│   ├── neobrutalism/
│   ├── auth/
│   └── dashboard/
├── lib/
│   ├── auth/
│   ├── jwt/
│   └── database/
└── middleware.ts
```

### Gateway Services
```typescript
// lib/auth/jwt-service.ts
export class JWTService {
  static generateToken(tenant: Tenant, user: User): string {
    // Generate JWT with tenant and user context
  }
  
  static validateToken(token: string): { tenant_id: string, user_id: string } {
    // Validate JWT and extract tenant context
  }
  
  static refreshToken(token: string): string {
    // Refresh JWT token
  }
}

// lib/auth/auth-middleware.ts
export function withAuth(handler: Function) {
  return async (req: Request) => {
    const token = extractToken(req)
    const tenantContext = JWTService.validateToken(token)
    return handler(req, tenantContext)
  }
}
```

### App Routing Logic
```typescript
// app/page-builder/page.tsx
export default function PageBuilderRedirect({ params }) {
  const token = getJWTToken()
  const pageBuilderUrl = `${process.env.PAGE_BUILDER_URL}?token=${token}`
  
  return <Redirect to={pageBuilderUrl} />
}
```

## Page Builder App Implementation

### File Structure (Page Builder App)
```
src/
├── app/
│   ├── projects/
│   │   └── [projectId]/
│   │       └── builder/
│   │           └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   ├── projects/
│   │   ├── pages/
│   │   └── themes/
│   └── layout.tsx
├── components/
│   ├── admin/
│   ├── builder/
│   └── pages/
├── lib/
│   ├── auth/
│   ├── database/
│   └── services/
└── middleware.ts
```

### Authentication Middleware
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  try {
    const tenantContext = JWTService.validateToken(token)
    // Add tenant context to request
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-tenant-id', tenantContext.tenant_id)
    requestHeaders.set('x-user-id', tenantContext.user_id)
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

### API Route with Tenant Context
```typescript
// app/api/projects/route.ts
export async function GET(request: Request) {
  const tenantId = request.headers.get('x-tenant-id')
  const userId = request.headers.get('x-user-id')
  
  if (!tenantId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const projects = await getProjectsByTenant(tenantId)
  return Response.json({ projects })
}
```

## Cross-App Communication

### Shared Utilities
```typescript
// Shared JWT validation across all apps
export function validateTenantToken(token: string): TenantContext {
  // Same validation logic used by all apps
}

// Shared database connection
export function getSupabaseClient(tenantId: string) {
  // Supabase client with tenant context
}
```

### App Discovery
```typescript
// Gateway provides app list to frontend
export async function getAvailableApps(tenantId: string) {
  const apps = await getAppAccess(tenantId)
  return apps.filter(app => app.enabled)
}
```

## Development Phases

### Phase 1: Gateway Foundation (Weeks 1-2)
- [ ] Gateway app setup with Next.js
- [ ] JWT authentication system
- [ ] Tenant registration and management
- [ ] Basic dashboard with app navigation
- [ ] Domain verification system

### Phase 2: Page Builder App (Weeks 3-6)
- [ ] Separate Page Builder Vercel project
- [ ] JWT token validation middleware
- [ ] Multi-tenant page builder functionality
- [ ] Theme system with Edge Config
- [ ] Static page serving with Blob storage

### Phase 3: Cross-App Integration (Weeks 7-8)
- [ ] Seamless navigation between apps
- [ ] Shared authentication flow
- [ ] Domain routing for all apps
- [ ] Performance optimization

### Phase 4: Future Apps (Future)
- [ ] Email Marketing App
- [ ] Webinar Platform App
- [ ] LMS App
- [ ] Additional business tools

## Security Considerations

### Multi-Tenant Security
- **JWT Validation**: Each app independently validates tokens
- **Tenant Isolation**: Row-level security in Supabase
- **Domain Verification**: Secure domain ownership verification
- **Cross-App Protection**: No data leakage between tenants

### Authentication Security
- **Token Expiration**: Short-lived tokens with refresh mechanism
- **HTTPS Enforcement**: All communication over HTTPS
- **Token Storage**: Secure browser storage
- **CSRF Protection**: Cross-site request forgery prevention

## Performance Optimization

### Gateway Performance
- **JWT Caching**: Cache validated tokens
- **App Discovery**: Cache available apps
- **Domain Resolution**: Fast domain lookups

### Cross-App Performance
- **Shared Resources**: Common libraries and utilities
- **Optimized Routing**: Efficient app-to-app navigation
- **Caching Strategy**: Shared caching across apps

## Deployment Strategy

### Vercel Projects
1. **Gateway Project**: `yourapp-gateway.vercel.app`
2. **Page Builder Project**: `yourapp-pagebuilder.vercel.app`
3. **Future App Projects**: Separate deployments

### Domain Configuration
- **Gateway Domain**: `yourapp.com`
- **Custom Domains**: `mybusiness.com` (tenant domains)
- **SSL Certificates**: Automatic provisioning
- **DNS Management**: Centralized domain management

## Success Metrics

### Technical Metrics
- **Cross-App Auth**: < 100ms authentication
- **App Switching**: < 200ms navigation
- **Domain Resolution**: < 50ms routing
- **Zero Auth Failures**: 99.9% success rate

### Business Metrics
- **Tenant Onboarding**: < 5 minutes to first app
- **App Adoption**: Multiple apps per tenant
- **Domain Verification**: > 95% success rate
- **User Satisfaction**: Seamless multi-app experience

## Conclusion

This architecture provides a scalable foundation for a multi-app business platform. The gateway handles all cross-cutting concerns while individual apps focus on their specific functionality. JWT-based authentication ensures secure, scalable access across all applications while maintaining tenant isolation.

The key innovation is the seamless user experience where tenants don't notice they're using multiple applications, while developers benefit from the modular architecture that allows independent development and deployment of each app.
