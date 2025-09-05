#!/bin/bash

# Script to fix nginx configuration on the server
# Run this on your DigitalOcean droplet

echo "Updating nginx configuration to fix page-builder API routing..."

# Backup current config
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# Create the fixed configuration
cat << 'EOF' | sudo tee /etc/nginx/sites-available/default
# DNS resolver for external domain resolution (MUST BE FIRST)
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

    # SSL Certificate - using nip.io for now
    ssl_certificate /etc/letsencrypt/live/104.248.51.150.nip.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/104.248.51.150.nip.io/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Important: Set cookie path for all cookies to work across apps
    proxy_cookie_path ~*^/.* /;
    
    # Main gateway app static assets
    location /_next {
        proxy_pass https://numgate.vercel.app$request_uri;
        proxy_http_version 1.1;
        proxy_set_header Host numgate.vercel.app;
        proxy_ssl_server_name on;
        proxy_ssl_protocols TLSv1.2 TLSv1.3;
        proxy_cache_valid 200 60m;
        proxy_cache_bypass $http_cache_control;
        add_header X-Proxy-Cache $upstream_cache_status;
    }

    # Main gateway API routes
    location /api {
        proxy_pass https://numgate.vercel.app$request_uri;
        proxy_http_version 1.1;
        proxy_set_header Host numgate.vercel.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Cookie $http_cookie;
        proxy_ssl_server_name on;
        proxy_ssl_protocols TLSv1.2 TLSv1.3;
    }

    # Page builder app static assets
    location ~ ^/page-builder/_next/(.*)$ {
        proxy_pass https://pagenumgate.vercel.app/_next/$1$is_args$args;
        proxy_http_version 1.1;
        proxy_set_header Host pagenumgate.vercel.app;
        proxy_ssl_server_name on;
        proxy_ssl_protocols TLSv1.2 TLSv1.3;
        proxy_cache_valid 200 60m;
        proxy_cache_bypass $http_cache_control;
        add_header X-Proxy-Cache $upstream_cache_status;
    }

    # Page builder API routes - FIXED: Using prefix location with rewrite
    location ^~ /page-builder/api/ {
        # Extract auth token from cookie
        set $auth_token "";
        if ($http_cookie ~* "auth-token=([^;]+)") {
            set $auth_token $1;
        }
        
        # Rewrite the path to remove /page-builder prefix
        rewrite ^/page-builder/api/(.*)$ /api/$1 break;
        
        proxy_pass https://pagenumgate.vercel.app;
        proxy_http_version 1.1;
        proxy_set_header Host pagenumgate.vercel.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Cookie $http_cookie;
        proxy_set_header x-auth-token $auth_token;
        proxy_ssl_server_name on;
        proxy_ssl_protocols TLSv1.2 TLSv1.3;
    }

    # Page builder app - all other routes
    location ~ ^/page-builder/(.*)$ {
        proxy_pass https://pagenumgate.vercel.app/$1$is_args$args;
        proxy_http_version 1.1;
        proxy_set_header Host pagenumgate.vercel.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_ssl_server_name on;
        proxy_ssl_protocols TLSv1.2 TLSv1.3;
        
        # Pass cookies properly
        proxy_set_header Cookie $http_cookie;
        
        # Pass auth token from gateway cookie to page builder header
        set $auth_token "";
        if ($http_cookie ~* "auth-token=([^;]+)") {
            set $auth_token $1;
        }
        proxy_set_header x-auth-token $auth_token;
    }

    # Page builder root path
    location = /page-builder {
        proxy_pass https://pagenumgate.vercel.app/;
        proxy_http_version 1.1;
        proxy_set_header Host pagenumgate.vercel.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_ssl_server_name on;
        proxy_ssl_protocols TLSv1.2 TLSv1.3;
        
        # Pass cookies properly
        proxy_set_header Cookie $http_cookie;
        
        # Pass auth token from gateway cookie to page builder header
        set $auth_token "";
        if ($http_cookie ~* "auth-token=([^;]+)") {
            set $auth_token $1;
        }
        proxy_set_header x-auth-token $auth_token;
    }

    # Main gateway app (everything else)
    location / {
        proxy_pass https://numgate.vercel.app$request_uri;
        proxy_http_version 1.1;
        proxy_set_header Host numgate.vercel.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Cookie $http_cookie;
        proxy_ssl_server_name on;
        proxy_ssl_protocols TLSv1.2 TLSv1.3;
    }
}
EOF

# Test the configuration
echo "Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "Configuration is valid. Reloading nginx..."
    sudo nginx -s reload
    echo "✅ Nginx configuration updated and reloaded successfully!"
    
    echo ""
    echo "Testing the API route..."
    curl -v https://104.248.51.150.nip.io/page-builder/api/auth/me 2>&1 | head -20
else
    echo "❌ Configuration test failed. Rolling back..."
    sudo cp /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/default
fi