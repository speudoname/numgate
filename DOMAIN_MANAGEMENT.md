# Domain Management Features

This document outlines the comprehensive domain management features implemented for the NumGate platform.

## Features Overview

### 1. Enhanced Delete Domain Functionality
The DELETE endpoint now handles various Vercel errors gracefully:
- **Domain Parked**: Detects when a domain is parked elsewhere and provides clear instructions
- **Domain In Use**: Identifies when a domain is used by another Vercel project
- **Network Errors**: Handles communication failures with helpful error messages
- **Not Found**: Gracefully handles domains that don't exist in Vercel

### 2. Domain Ownership Check
Before adding a domain, the system checks if it already exists:
- **API Endpoint**: `/api/domains/check`
- **Method**: POST with `{ domain: "example.com" }`
- **Returns**: Availability status and current owner information (if exists)

### 3. Domain Claiming Flow
When a domain is already owned by another tenant, users can claim it through DNS verification:

#### Step 1: Start Claim Process
- **API Endpoint**: `/api/domains/claim`
- **Method**: POST with `{ domain: "example.com", action: "start" }`
- **Returns**: Verification token and TXT record details

#### Step 2: DNS Verification
- Add TXT record: `_numgate-verification.domain.com` → `numgate-verify-{token}`
- Wait for DNS propagation (5-30 minutes)
- Click verify to complete the claim

#### Step 3: Domain Transfer
- **API Endpoint**: `/api/domains/claim`
- **Method**: POST with `{ domain: "example.com", action: "verify" }`
- **Process**: Verifies TXT record and transfers domain ownership

## Database Schema

### Domain Claims Table
```sql
CREATE TABLE domain_claims (
  id UUID PRIMARY KEY,
  domain TEXT NOT NULL,
  claiming_tenant_id UUID NOT NULL,
  current_tenant_id UUID,
  verification_token TEXT UNIQUE NOT NULL,
  txt_record_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL, -- 24 hours from creation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Frontend Features

### 1. Add Domain Flow
1. User enters domain name
2. System checks ownership
3. If available → Add directly
4. If owned → Show claim flow

### 2. Claim Flow UI
- Shows current owner information
- Displays DNS instructions
- Real-time verification status
- 24-hour expiration timer

### 3. Enhanced Domain List
- Delete buttons with improved error handling
- Status indicators for all domain states
- Contextual actions based on domain status

## Error Handling

### Delete Domain Errors
- `DOMAIN_PARKED`: Domain is parked with a parking service
- `DOMAIN_IN_USE`: Domain is used by another Vercel project
- `VERCEL_ERROR`: General Vercel API error
- `NETWORK_ERROR`: Communication failure

### Claim Process Errors
- Expired claims (24-hour limit)
- DNS verification failures
- Transfer process errors

## Security Features

1. **Row Level Security (RLS)**: All domain operations respect tenant isolation
2. **DNS Verification**: Ownership proven through DNS TXT records
3. **Expiration**: Claims expire after 24 hours for security
4. **Audit Trail**: All claim attempts are logged

## Usage Examples

### Check Domain Ownership
```javascript
const response = await fetch('/api/domains/check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ domain: 'example.com' })
});

const data = await response.json();
// { available: false, owner: { tenant_name: "...", ... } }
```

### Start Domain Claim
```javascript
const response = await fetch('/api/domains/claim', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    domain: 'example.com', 
    action: 'start' 
  })
});

const data = await response.json();
// { verification_token: "numgate-verify-...", txt_record_name: "_numgate-verification.example.com", ... }
```

### Verify and Transfer Domain
```javascript
const response = await fetch('/api/domains/claim', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    domain: 'example.com', 
    action: 'verify' 
  })
});

const data = await response.json();
// { verified: true, transferred: true, message: "Domain successfully claimed..." }
```

## Files Modified/Created

### Backend API Routes
- `/app/api/domains/[id]/route.ts` - Enhanced DELETE endpoint
- `/app/api/domains/check/route.ts` - New ownership check endpoint
- `/app/api/domains/claim/route.ts` - New claiming flow endpoint

### Utilities
- `/lib/dns/verification.ts` - DNS verification utilities
- `/supabase/migrations/012_add_domain_claims.sql` - Database migration

### Frontend
- `/app/dashboard/domains/page.tsx` - Updated with claiming flow UI

## Testing

To test the claiming flow:
1. Add a domain to one tenant
2. Try to add the same domain to another tenant
3. Follow the claim process with DNS verification
4. Verify successful transfer

## Deployment Notes

1. Run the database migration: `012_add_domain_claims.sql`
2. Ensure DNS resolution works in production environment
3. Test Vercel API integration thoroughly
4. Verify RLS policies are working correctly