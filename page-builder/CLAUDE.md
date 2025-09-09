# Page Builder Component Guidelines CLAUDE.md

## 🎯 PROJECT CONTEXT
**This is a COMPONENT LIBRARY for the PageNumGate static HTML page builder.** It provides UI components for the admin interface of the page builder, which is part of the NumGate multi-tenant SaaS platform.

### Architecture Overview
- **Component Library**: UI components for PageNumGate admin interface
- **Gateway Dependency**: PageNumGate is accessed via NumGate gateway
- **Multi-Tenant**: Components must work with tenant isolation
- **Static Output**: Components help build static HTML pages

### Integration Context
- **Parent Application**: PageNumGate (static HTML page builder)
- **Gateway**: NumGate (authentication and routing)
- **Purpose**: Admin interface components for building static HTML pages

## 🎨 UI/UX DESIGN STANDARDS - STRICT REQUIREMENTS

### NeoBrutalism.dev Requirements
- **USE NEOBRUTALISM.DEV EXCLUSIVELY**: For ALL UI components, use ONLY components from NeoBrutalism.dev
- **NO CUSTOM COMPONENTS**: Do NOT create custom UI components or invent new designs
- **STRICT ADHERENCE**: Every button, card, form, modal, and UI element MUST be from NeoBrutalism.dev
- **COPY EXACT CODE**: Always copy component code exactly from neobrutalism.dev - no modifications
- **CHECK FIRST**: Before implementing ANY UI, check if NeoBrutalism.dev has that component
- **NO EXCEPTIONS**: This is a strict requirement - no custom styling or components allowed

### Implementation Process
1. Visit https://www.neobrutalism.dev/components
2. Find the component you need
3. Copy the exact code from their documentation
4. Place in `components/ui/` directory
5. Import and use without modifications
6. If component doesn't exist, ask for alternatives - DON'T create custom

### Available Components
- **Core**: Button, Card, Input, Textarea, Select, Checkbox, Radio, Switch
- **Feedback**: Dialog, Drawer, Popover, Tooltip, Alert, Badge
- **Data**: Table, Form, Tabs, Accordion, Navigation Menu
- **Advanced**: Calendar, Date Picker, Command, Combobox
- **And 40+ more components** - See neobrutalism.dev for complete list

## 🔒 CRITICAL SECURITY RULES

### Authentication Pattern (MUST MATCH NUMGATE)
- **Custom JWT Authentication** (not Supabase Auth)
- **Service Key Pattern**: Use `supabaseAdmin` with STRICT tenant filtering
- **Security Rule**: EVERY query MUST include `.eq('tenant_id', tenantId)`

### Security Checklist
1. ✅ Use service key with MANDATORY tenant filtering
2. ✅ Validate JWT token from NumGate gateway
3. ✅ Check user belongs to tenant
4. ✅ NEVER trust client-provided tenant_id
5. ✅ Validate ALL inputs with zod schemas

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

## 📋 CRITICAL: Clean Code Policy
- **Remove ALL custom CSS** that isn't from NeoBrutalism
- **Delete any custom-styled components**
- **Replace everything** with NeoBrutalism.dev components
- **No inline styles** unless copying from NeoBrutalism docs
- **Maintain consistency** with NumGate design system