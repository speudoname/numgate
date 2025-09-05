# URGENT: Fix Nginx Configuration

## Quick Fix Commands

SSH into your server and run these commands:

```bash
# 1. SSH into server
ssh root@104.248.51.150

# 2. Backup current config
cp /etc/nginx/sites-available/komunate /etc/nginx/sites-available/komunate.broken

# 3. Create new fixed config
cat > /etc/nginx/sites-available/komunate << 'EOF'
# DNS resolver (CRITICAL - MUST BE AT TOP)
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name komunate.com www.komunate.com 104.248.51.150.nip.io 104.248.51.150;
    return 301 https://$host$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name komunate.com www.komunate.com 104.248.51.150.nip.io 104.248.51.150;

    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/104.248.51.150.nip.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/104.248.51.150.nip.io/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    proxy_cookie_path ~*^/.* /;
    
    # Main gateway static assets - MUST USE $request_uri
    location /_next {
        proxy_pass https://numgate.vercel.app$request_uri;
        proxy_http_version 1.1;
        proxy_set_header Host numgate.vercel.app;
        proxy_ssl_server_name on;
        proxy_ssl_protocols TLSv1.2 TLSv1.3;
    }

    # Main gateway API
    location /api {
        proxy_pass https://numgate.vercel.app$request_uri;
        proxy_http_version 1.1;
        proxy_set_header Host numgate.vercel.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Cookie $http_cookie;
        proxy_ssl_server_name on;
        proxy_ssl_protocols TLSv1.2 TLSv1.3;
    }

    # Page builder static assets
    location ~ ^/page-builder/_next/(.*)$ {
        proxy_pass https://pagenumgate.vercel.app/_next/$1$is_args$args;
        proxy_http_version 1.1;
        proxy_set_header Host pagenumgate.vercel.app;
        proxy_ssl_server_name on;
        proxy_ssl_protocols TLSv1.2 TLSv1.3;
    }

    # Page builder API
    location ~ ^/page-builder/api/(.*)$ {
        proxy_pass https://pagenumgate.vercel.app/api/$1$is_args$args;
        proxy_http_version 1.1;
        proxy_set_header Host pagenumgate.vercel.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Cookie $http_cookie;
        proxy_ssl_server_name on;
        proxy_ssl_protocols TLSv1.2 TLSv1.3;
        
        set $auth_token "";
        if ($http_cookie ~* "auth-token=([^;]+)") {
            set $auth_token $1;
        }
        proxy_set_header x-auth-token $auth_token;
    }

    # Page builder root
    location ~ ^/page-builder(.*)$ {
        proxy_pass https://pagenumgate.vercel.app$1$is_args$args;
        proxy_http_version 1.1;
        proxy_set_header Host pagenumgate.vercel.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Cookie $http_cookie;
        proxy_ssl_server_name on;
        proxy_ssl_protocols TLSv1.2 TLSv1.3;
        
        set $auth_token "";
        if ($http_cookie ~* "auth-token=([^;]+)") {
            set $auth_token $1;
        }
        proxy_set_header x-auth-token $auth_token;
    }

    # Main gateway root
    location / {
        proxy_pass https://numgate.vercel.app$request_uri;
        proxy_http_version 1.1;
        proxy_set_header Host numgate.vercel.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Cookie $http_cookie;
        proxy_ssl_server_name on;
        proxy_ssl_protocols TLSv1.2 TLSv1.3;
    }
}
EOF

# 4. Test configuration
nginx -t

# 5. Reload nginx
systemctl reload nginx

# 6. Test it's working
curl -I https://104.248.51.150.nip.io/_next/static/css/test.css
```

## Key Issues Fixed:

1. **DNS Resolver** - Added at top of config (CRITICAL)
2. **$request_uri** - Using for main gateway to preserve query strings
3. **SSL protocols** - Added explicit TLSv1.2 TLSv1.3 support
4. **Query strings** - Using $is_args$args for page-builder

## If Still Broken:

Check logs:
```bash
tail -f /var/log/nginx/error.log
```

Test Vercel is accessible:
```bash
curl -I https://numgate.vercel.app
curl -I https://pagenumgate.vercel.app
```