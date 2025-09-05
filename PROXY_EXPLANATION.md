# Complete Guide: How Nginx Proxy Works

## Table of Contents
1. [Overview](#overview)
2. [The Infrastructure](#the-infrastructure)
3. [How Nginx Configuration Works](#how-nginx-configuration-works)
4. [The Request Flow](#the-request-flow)
5. [File Locations and Management](#file-locations-and-management)
6. [How to Update the Configuration](#how-to-update-the-configuration)

## Overview

A proxy server sits between users and your actual applications, directing traffic like a smart traffic controller.

```
User types: https://komunate.com/page-builder
     ↓
Goes to your DigitalOcean server (104.248.51.150)
     ↓
Nginx looks at the URL path
     ↓
Forwards request to the right Vercel app
     ↓
Gets response from Vercel
     ↓
Sends it back to user
```

## The Infrastructure

### Your Current Setup:
1. **DigitalOcean VPS (Virtual Private Server)**
   - IP: 104.248.51.150
   - Running Ubuntu Linux
   - Has Nginx installed
   - This is YOUR server that YOU control

2. **Vercel Hosting**
   - numgate.vercel.app (gateway app)
   - pagenumgate.vercel.app (page builder app)
   - These are managed by Vercel, updated via GitHub

3. **GitHub Repositories**
   - Your code lives here
   - When you push to GitHub, Vercel automatically deploys

## How Nginx Configuration Works

### The Configuration File
Location on server: `/etc/nginx/sites-available/default`

Let's break down each part:

### Part 1: DNS Resolver
```nginx
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```
- **What it does**: Tells nginx how to look up domain names (like vercel.app)
- **Why needed**: So nginx can find where numgate.vercel.app actually is
- **8.8.8.8**: Google's public DNS server

### Part 2: HTTP to HTTPS Redirect
```nginx
server {
    listen 80;  # Port 80 = HTTP (not secure)
    server_name komunate.com www.komunate.com;
    return 301 https://$host$request_uri;  # Force HTTPS
}
```
- **What it does**: If someone types http://komunate.com, redirect to https://
- **Why**: Security - all traffic should be encrypted

### Part 3: Main HTTPS Server
```nginx
server {
    listen 443 ssl http2;  # Port 443 = HTTPS (secure)
    server_name komunate.com;
    
    # SSL certificates for HTTPS
    ssl_certificate /etc/letsencrypt/live/104.248.51.150.nip.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/104.248.51.150.nip.io/privkey.pem;
```
- **What it does**: Handles secure HTTPS traffic
- **SSL certificates**: Like an ID card proving your site is legitimate

### Part 4: Location Blocks (The Traffic Rules)

#### Example 1: API Routes
```nginx
location /api {
    proxy_pass https://numgate.vercel.app$request_uri;
    proxy_set_header Host numgate.vercel.app;
}
```
**What happens**:
1. User visits: `https://komunate.com/api/login`
2. Nginx sees `/api` at the start
3. Forwards to: `https://numgate.vercel.app/api/login`
4. Returns response to user

#### Example 2: Page Builder Routes
```nginx
location ~ ^/page-builder/(.*)$ {
    proxy_pass https://pagenumgate.vercel.app/$1$is_args$args;
    proxy_set_header Host pagenumgate.vercel.app;
}
```
**What happens**:
1. User visits: `https://komunate.com/page-builder/dashboard`
2. Nginx sees `/page-builder/` at the start
3. Strips `/page-builder` and forwards to: `https://pagenumgate.vercel.app/dashboard`
4. Returns response to user

### Part 5: Headers (Extra Information)
```nginx
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header Cookie $http_cookie;
```
- **X-Real-IP**: Tells Vercel the user's actual IP address
- **Cookie**: Passes authentication cookies through
- **Host**: Tells Vercel which domain was requested

## The Request Flow

Let's trace a complete request:

### Step 1: User Logs In
```
1. User goes to https://komunate.com/login
2. Nginx receives request
3. Checks location blocks - matches "/" (default)
4. Forwards to https://numgate.vercel.app/login
5. User enters credentials
6. Vercel app creates JWT token
7. Sets cookie: auth-token=xxxxx
8. Redirects to dashboard
```

### Step 2: User Navigates to Page Builder
```
1. User clicks "Page Builder" (goes to /page-builder)
2. Nginx receives request WITH the auth-token cookie
3. Matches location /page-builder
4. Extracts auth token from cookie
5. Forwards to https://pagenumgate.vercel.app/
6. Also sends auth token as header: x-auth-token
7. Page builder app validates token
8. Shows page builder interface
```

## File Locations and Management

### On Your DigitalOcean Server:

```bash
/etc/nginx/
├── nginx.conf                 # Main nginx config
├── sites-available/
│   └── default               # YOUR SITE CONFIG (this is what we edit)
├── sites-enabled/
│   └── default → ../sites-available/default  # Symlink to activate
└── ssl/                      # SSL certificates
```

### Important Commands:

```bash
# Test configuration (always do this first!)
sudo nginx -t

# Reload nginx (apply changes)
sudo nginx -s reload

# View nginx error logs
sudo tail -f /var/log/nginx/error.log

# Edit configuration
sudo nano /etc/nginx/sites-available/default
```

## How to Update the Configuration

### Method 1: Direct Server Edit (Quick fixes)
```bash
# 1. SSH into server
ssh root@104.248.51.150

# 2. Edit the file
sudo nano /etc/nginx/sites-available/default

# 3. Test it
sudo nginx -t

# 4. If test passes, reload
sudo nginx -s reload
```

### Method 2: From Your Local Computer (Safer)
```bash
# 1. Create/edit config locally
nano nginx-config.conf

# 2. Copy to server
scp nginx-config.conf root@104.248.51.150:/tmp/

# 3. SSH in and apply
ssh root@104.248.51.150
sudo cp /tmp/nginx-config.conf /etc/nginx/sites-available/default
sudo nginx -t
sudo nginx -s reload
```

## Key Differences from GitHub Deployment

### Nginx Configuration:
- **NOT connected to GitHub**
- Lives directly on your DigitalOcean server
- You update it manually via SSH
- Changes apply immediately when you reload nginx

### Your Apps (numgate, pagenumgate):
- **ARE connected to GitHub**
- Code in GitHub → Automatically deploys to Vercel
- You never touch Vercel servers directly
- Changes apply when you push to GitHub

## Common Patterns

### Pattern 1: Simple Proxy
```nginx
location /something {
    proxy_pass https://backend.com$request_uri;
}
```
Keeps the path as-is: `/something/test` → `https://backend.com/something/test`

### Pattern 2: Path Rewriting
```nginx
location ~ ^/app/(.*)$ {
    proxy_pass https://backend.com/$1;
}
```
Removes prefix: `/app/dashboard` → `https://backend.com/dashboard`

### Pattern 3: With Authentication
```nginx
location /protected {
    # Extract token from cookie
    set $auth_token "";
    if ($http_cookie ~* "auth-token=([^;]+)") {
        set $auth_token $1;
    }
    
    # Pass as header
    proxy_set_header Authorization "Bearer $auth_token";
    proxy_pass https://backend.com$request_uri;
}
```

## Why Use Nginx Proxy?

### Benefits:
1. **Single Domain**: All apps under komunate.com
2. **SSL Management**: One certificate for everything
3. **Security**: Hide actual Vercel URLs
4. **Control**: Add headers, modify requests
5. **Performance**: Can add caching

### The Alternative (Without Proxy):
- numgate would be at: numgate.vercel.app
- pagenumgate would be at: pagenumgate.vercel.app
- Need separate domains/subdomains
- Can't share cookies easily
- Payment gateways might not accept *.vercel.app

## Troubleshooting

### Check if nginx is running:
```bash
systemctl status nginx
```

### Check what's listening on ports:
```bash
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

### Test a specific route:
```bash
# From your computer
curl -I https://komunate.com/page-builder

# See full headers
curl -v https://komunate.com/api/test
```

### Common Issues:

1. **502 Bad Gateway**: Vercel app is down or URL wrong
2. **404 Not Found**: Location block not matching or path wrong
3. **403 Forbidden**: Permission issues
4. **SSL Error**: Certificate expired or misconfigured

## Summary

Think of nginx like a smart receptionist:
- Knows where everyone sits (location blocks)
- Directs visitors to the right person (proxy_pass)
- Carries messages between people (headers)
- Checks visitor IDs (SSL/authentication)

The configuration file is the receptionist's instruction manual, telling them exactly how to handle each type of visitor and where to send them.

Your DigitalOcean server is the building, Vercel apps are the offices inside, and nginx is the receptionist directing traffic between them.