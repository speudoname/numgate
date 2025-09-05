# Vercel Wildcard Domain Setup

## Enable Tenant Subdomains (*.komunate.com)

To allow tenants to access their dashboard via subdomains (e.g., `aiacademy.komunate.com`), you need to configure wildcard domains in Vercel.

## Steps to Configure:

### 1. Via Vercel Dashboard:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Domains**
3. Click **Add**
4. Enter `*.komunate.com` (with the asterisk)
5. Vercel will ask you to verify DNS ownership
6. Add the provided TXT record to your DNS provider

### 2. Via Vercel CLI:

```bash
vercel domains add "*.komunate.com"
```

### 3. DNS Configuration:

Add these records to your DNS provider (where komunate.com is registered):

```
Type    Name    Value
----    ----    -----
CNAME   *       cname.vercel-dns.com
```

Or if using A records:

```
Type    Name    Value
----    ----    -----
A       *       76.76.21.21
```

## How It Works:

Once configured:
- `komunate.com` → Main platform (signup, marketing)
- `www.komunate.com` → Same as above
- `aiacademy.komunate.com` → AI Academy tenant dashboard
- `mybiz.komunate.com` → MyBiz tenant dashboard
- Any subdomain will be treated as a tenant slug

## Testing:

1. Create a tenant with slug "test"
2. Visit `test.komunate.com`
3. Should load the tenant's dashboard

## Important Notes:

- Wildcard SSL certificates are automatically provisioned by Vercel
- DNS propagation may take 5-30 minutes
- The middleware already handles subdomain → tenant resolution
- Tenants can use subdomains before adding custom domains

## Verification:

After setup, test with:
```bash
curl -I https://test.komunate.com
```

Should return HTTP 200 if configured correctly.