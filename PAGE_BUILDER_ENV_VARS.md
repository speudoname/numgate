# Environment Variables for Page Builder App

The page builder app needs access to the same backend services as the main NumGate app. Here are the required environment variables:

## Required Variables for Page Builder

### 1. Supabase (Database Access)
```env
NEXT_PUBLIC_SUPABASE_URL=https://hbopxprpgvrkucztsvnq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
**Why needed**: To read/write tenant data, user authentication, and page metadata

### 2. JWT Configuration
```env
JWT_SECRET=E5q8Ta2a5trFFtfL7MaIlLUr9OKAFaoXFXKB88Jnt6I=
JWT_EXPIRES_IN=24h
```
**Why needed**: To validate auth tokens from the main app and maintain session

### 3. Vercel Blob Storage
```env
# Option A: If Blob store is NOT connected via Vercel Dashboard
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_cz6NJM6738v25s9K_UubYPMgzvCCNW6xLVG2WsePLmiIvlN

# Option B: If Blob store IS connected via Vercel Dashboard
# No token needed! Vercel handles authentication automatically
```
**Why needed**: To store and retrieve landing pages created by tenants

### 4. Vercel API (Optional - only if managing domains from page builder)
```env
VERCEL_API_TOKEN=kRPWBEat5wHfSk2nYdXmMoJX
VERCEL_PROJECT_ID=prj_ALWAE3X32HhBvyzKSX83M396LmwC
```
**Why needed**: Only if page builder needs to manage custom domains directly

## How to Set Up

### For Local Development (page-builder/.env.local)
Copy all required variables to the page builder's `.env.local` file

### For Production (Vercel Dashboard)
1. Deploy page builder app to Vercel
2. Go to Project Settings → Environment Variables
3. Add all required variables
4. If using connected Blob store:
   - Connect the same Blob store to page builder project
   - Remove BLOB_READ_WRITE_TOKEN variable

## Architecture Notes

### Shared Resources
Both apps share:
- Same Supabase database
- Same Blob storage for pages
- Same JWT secret for token validation
- Same Vercel project for domain management

### Data Flow
1. User logs in via main NumGate app → Gets JWT token
2. Token is passed to page builder app
3. Page builder validates token using same JWT_SECRET
4. Page builder reads/writes to:
   - Supabase for metadata
   - Blob storage for page content
   - Both using the tenant_id from the JWT

### Security Considerations
- Never expose SERVICE_KEY in client-side code
- JWT_SECRET must be identical across both apps
- Consider using Vercel's connected stores instead of tokens when possible

## Testing the Connection

After setting up variables, test:
```bash
# In page-builder directory
npm run dev

# Test authentication flow
# Test Blob storage read/write
# Test Supabase queries
```