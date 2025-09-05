# NumGate Deployment Guide

## Current Production Setup

### Access URL
**Production URL:** https://104.248.51.150.nip.io

> **Important:** Always use the full URL with `.nip.io` suffix to avoid SSL certificate errors. Do not access via raw IP address.

### Infrastructure

1. **Main Gateway (NumGate)**
   - GitHub: https://github.com/levanbakhia/numgate
   - Vercel: https://numgate.vercel.app
   - Path: `/` (root)

2. **Page Builder App**
   - GitHub: https://github.com/levanbakhia/pagenumgate
   - Vercel: https://pagenumgate.vercel.app
   - Path: `/page-builder`

3. **Nginx Proxy Server**
   - DigitalOcean Droplet: 104.248.51.150
   - Routes all traffic to appropriate Vercel deployments
   - Handles SSL termination
   - Manages authentication token passing

### Authentication Flow

1. User logs in at gateway (`/login`)
2. Gateway sets `auth-token` cookie
3. When navigating to `/page-builder`:
   - Nginx extracts token from cookie
   - Passes token as `x-auth-token` header to page builder
   - Page builder validates and creates session

### SSL Certificate

- Certificate issued for: `104.248.51.150.nip.io`
- Provider: Let's Encrypt
- Auto-renewal: Configured via certbot

### Future Domain Setup

When ready to use komunate.com:
1. Add A records pointing to 104.248.51.150
2. Update SSL certificate for komunate.com
3. Update nginx server_name configuration

### Deployment Workflow

1. Make changes locally
2. Commit to Git
3. Push to GitHub
4. Vercel automatically deploys
5. Changes are live through nginx proxy

**Never push directly to Vercel - always use GitHub**