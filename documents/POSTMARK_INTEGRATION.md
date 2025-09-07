# Postmark Email Integration Documentation

## Overview
This document describes the complete Postmark email integration system built for the NUM Gate multi-tenant SaaS platform. The system provides enterprise-grade email capabilities with both shared and dedicated server options, supporting transactional and marketing emails with different tracking configurations.

## Architecture Overview

### Dual-Mode Email System
The platform supports two email infrastructure modes:

1. **Shared Mode** (Free Tier)
   - All tenants share a single Postmark server
   - Cost-effective for small tenants
   - Limited customization options
   - Default sender domains

2. **Dedicated Mode** (Premium Tier)
   - Each tenant gets their own Postmark servers
   - Full customization capabilities
   - Custom domains and signatures
   - Separate tracking policies

### Two-Server Strategy
For dedicated mode, we create two separate Postmark servers per tenant:

1. **Transactional Server** (`{postmark_id}-trans`)
   - Open tracking: DISABLED
   - Link tracking: DISABLED
   - Purpose: Authentication emails, receipts, notifications
   - Better deliverability due to no tracking pixels

2. **Marketing Server** (`{postmark_id}-market`)
   - Open tracking: ENABLED
   - Link tracking: ENABLED
   - Purpose: Newsletters, campaigns, promotional emails
   - Full analytics and engagement metrics

## Database Schema

### Tables Structure

#### `contacts.postmark_settings`
Stores tenant-specific Postmark configurations:
```sql
- tenant_id (UUID) - Links to tenant
- postmark_id (TEXT) - Unique 6-character identifier (e.g., KOM001)
- transactional_server_id (INTEGER) - Postmark server ID for transactional emails
- transactional_server_token (TEXT) - API token for transactional server
- transactional_stream_id (TEXT) - Message stream for transactional emails
- marketing_server_id (INTEGER) - Postmark server ID for marketing emails
- marketing_server_token (TEXT) - API token for marketing server
- marketing_stream_id (TEXT) - Message stream for marketing emails
- server_mode (TEXT) - 'shared' or 'dedicated'
- default_from_email (TEXT) - Default sender email
- default_from_name (TEXT) - Default sender name
- default_reply_to (TEXT) - Default reply-to address
```

#### `contacts.shared_postmark_config`
Stores default/shared Postmark configuration:
```sql
- transactional_server_id (INTEGER)
- transactional_server_token (TEXT)
- transactional_stream_id (TEXT)
- marketing_server_id (INTEGER)
- marketing_server_token (TEXT)
- marketing_stream_id (TEXT)
- default_from_email (TEXT)
- default_from_name (TEXT)
- default_reply_to (TEXT)
```

## Postmark ID System

### Format
Each tenant receives a unique 6-character identifier:
- Format: `[3 LETTERS][3 NUMBERS]`
- Example: `KOM001`, `ABC123`, `XYZ999`

### Generation Logic
1. Take first 3 letters from tenant name/slug
2. Convert to uppercase
3. If less than 3 letters, pad with 'X'
4. Add 3-digit incremental number
5. Ensure uniqueness across all tenants

### Usage
- Server naming: `{postmark_id}-trans`, `{postmark_id}-market`
- Domain suggestions: `noreply@{postmark_id}.komunate.com`
- Easy identification in Postmark dashboard

## API Endpoints

### Configuration Management

#### `GET /api/super-admin/postmark/config`
Fetches current Postmark configuration for a tenant.
- Query params: `tenantId` (optional, defaults to 'default')
- Returns: Current configuration with fallback to defaults

#### `POST /api/super-admin/postmark/config`
Updates Postmark configuration for a tenant.
- Body: Configuration object with server tokens and IDs
- Creates or updates tenant-specific settings

### Server Management

#### `GET /api/super-admin/postmark/servers`
Lists all available Postmark servers from the account.
- Fetches directly from Postmark API
- Shows server names, IDs, and tracking status

#### `POST /api/super-admin/postmark/create-servers`
Creates both transactional and marketing servers for a tenant.
- Creates two servers with appropriate tracking settings
- Updates database with new server information
- Atomic operation (rolls back on failure)

#### `POST /api/super-admin/postmark/create-server`
Creates a single server (transactional OR marketing).
- Body: `serverType` ('transactional' or 'marketing')
- Configures appropriate tracking settings
- Updates only the relevant server configuration

### Signature Management

#### `GET /api/super-admin/postmark/signatures`
Fetches domains and sender signatures from Postmark.
- Returns both verified domains and individual sender signatures
- Includes DNS records for domain verification

#### `POST /api/super-admin/postmark/signatures`
Creates new sender signature or domain.
- Body: `signatureType` ('domain' or 'sender'), signature details
- Returns DNS records for domain verification
- Handles both domain and individual sender creation

### Domain Management

#### `GET /api/super-admin/tenant-domains`
Fetches verified custom domains for a tenant.
- Used for signature suggestions
- Returns only verified domains from the database

## Webhook System

### Webhook Handler
Located at: `contactgate/supabase/functions/postmark-webhook`

### Event Types Handled
- **Bounce Events**: Hard bounces, soft bounces
- **Delivery Events**: Successful deliveries
- **Open Events**: Email opens (marketing only)
- **Click Events**: Link clicks (marketing only)
- **Spam Complaints**: User marked as spam
- **Subscription Changes**: Unsubscribes
- **Inbound Emails**: Incoming email processing

### Webhook Processing Flow
1. Receive webhook from Postmark
2. Extract `ServerID` from payload
3. Look up tenant using `transactional_server_id` or `marketing_server_id`
4. Store event in database (future: `email_webhook_events` table)
5. Update contact status for bounces/complaints
6. Return 200 OK to prevent retries

## Super Admin Interface

### Access Control
- Only accessible to `komunate.com` tenant (super admin)
- Located at `/super-admin/postmark`
- Protected by tenant ID verification

### Features

#### Configuration View
- Select tenant from dropdown
- View current configuration
- See sender details with defaults

#### Server Management
- **Green "Create Servers" Button**: Creates both servers
- **Individual Dropdowns**: Create/select specific servers
- **Stream Selection**: Choose message streams
- **Tracking Controls**: Toggle open/click tracking

#### Signature Management
- View all domains and senders
- Create new signatures
- Display DNS records for verification
- Auto-suggest based on tenant domains

#### Smart Suggestions
- Tenant selector with search
- Server suggestions based on postmark_id
- Signature filtering by tenant domains
- Stream suggestions per server

## Configuration Flow

### Initial Setup (Super Admin)
1. Generate postmark_id for tenant (automatic on tenant creation)
2. Choose email mode (shared vs dedicated)
3. If dedicated:
   - Click "Create Servers" to create both servers
   - Or use dropdowns to create individually
4. Configure sender details (from email, name, reply-to)
5. Save configuration

### Fallback Mechanism
1. Check for tenant-specific configuration
2. If not found, use default shared configuration
3. For sender details, tenant config overrides defaults
4. Ensures emails always have valid configuration

## Security Considerations

### API Security
- All endpoints require super-admin authorization
- Service key usage with explicit tenant filtering
- No cross-tenant data access

### Token Management
- Server tokens stored encrypted in database
- Never exposed in client-side code
- Only accessible via service key

### Webhook Security
- Always returns 200 to prevent retry attacks
- Validates server ID against known tenants
- Gracefully handles unknown servers

## Column Name Resolution

### The Issue
Initial implementation had mismatched column names between code and database:
- Database used: `transactional_server_id`, `transactional_server_token`
- Some code used: `server_id`, `server_token`

### The Solution
Updated all code to use the full column names matching the database schema:
- Safer than modifying production database
- Maintains consistency across codebase
- No data migration required

### Files Updated
- `/app/api/super-admin/postmark/config/route.ts`
- `/app/api/super-admin/postmark/create-servers/route.ts`
- `/app/api/super-admin/postmark/create-server/route.ts`
- `/contactgate/supabase/functions/postmark-webhook/index.ts`

## Permissions

### Database Permissions
Required permissions for `service_role`:
```sql
GRANT ALL ON contacts.postmark_settings TO service_role;
GRANT ALL ON contacts.shared_postmark_config TO service_role;
GRANT SELECT ON contacts.postmark_settings TO anon, authenticated;
```

### Why Service Key?
- Custom JWT doesn't integrate with Supabase RLS
- Service key with explicit tenant filtering is secure
- Standard pattern for multi-tenant SaaS

## Testing Checklist

### Configuration
- [ ] Save configuration for a tenant
- [ ] Load configuration with defaults
- [ ] Update existing configuration
- [ ] Verify fallback to shared config

### Server Creation
- [ ] Create both servers with green button
- [ ] Create individual transactional server
- [ ] Create individual marketing server
- [ ] Verify naming convention

### Tracking Controls
- [ ] Toggle open tracking on/off
- [ ] Toggle click tracking on/off
- [ ] Verify settings persist

### Signatures
- [ ] Create domain signature
- [ ] Create sender signature
- [ ] View DNS records
- [ ] Filter by tenant domains

### Webhooks
- [ ] Process bounce events
- [ ] Handle delivery confirmations
- [ ] Track opens (marketing only)
- [ ] Track clicks (marketing only)

## Future Enhancements

### Planned Features
1. Email template management per tenant
2. Bounce rate monitoring dashboard
3. Automated suppression list management
4. Email analytics dashboard
5. A/B testing capabilities
6. Scheduled email campaigns

### Database Additions
1. `email_webhook_events` table for event storage
2. `email_templates` table for tenant templates
3. `email_campaigns` table for marketing campaigns
4. `email_analytics` table for aggregated metrics

## Troubleshooting

### Common Issues

#### "Permission denied for table postmark_settings"
Run the permissions script: `/scripts/fix-postmark-permissions.sql`

#### "Column not found in schema cache"
1. Check actual database columns with `/scripts/check-postmark-table.sql`
2. Verify code uses correct column names
3. Clear Supabase schema cache if needed

#### "Cannot find tenant for server ID"
1. Verify server ID is correctly stored in database
2. Check both transactional and marketing server IDs
3. Ensure webhook uses correct column names

## Migration Scripts

### Available Scripts
1. `add-postmark-email-system.sql` - Initial schema creation
2. `generate-postmark-ids-for-tenants.sql` - Generate IDs for existing tenants
3. `fix-postmark-permissions.sql` - Fix permission issues
4. `check-postmark-table.sql` - Diagnostic script

### Running Migrations
1. Always backup database before migrations
2. Run in Supabase SQL editor
3. Verify with diagnostic scripts
4. Test in development first

## Best Practices

### Email Sending
1. Use transactional server for critical emails
2. Use marketing server for bulk/promotional emails
3. Always set appropriate sender details
4. Monitor bounce rates

### Configuration Management
1. Set defaults in shared_postmark_config
2. Override per-tenant as needed
3. Keep tokens secure
4. Regular verification of signatures

### Monitoring
1. Check webhook processing logs
2. Monitor delivery rates
3. Track bounce/complaint rates
4. Review email analytics regularly