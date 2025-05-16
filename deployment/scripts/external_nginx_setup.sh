#!/bin/bash
set -e

if [[ $EUID -ne 0 ]]; then
  echo "Please run this script as root (use sudo)." >&2
  exit 1
fi

if [[ -z $1 || -z $2 ]]; then 
  echo "Usage: $0 <domain> <email>" >&2
  exit 1
fi

DOMAIN=$1
EMAIL=$2
NGINX_CONFIG_FILE="/etc/nginx/sites-available/$DOMAIN.conf"
NGINX_CONFIG_SYMLINK="/etc/nginx/sites-enabled/$DOMAIN.conf"


#==============================================================================#
echo ">>> Installing nginx..."

apt-get update
apt-get install -y curl gnupg2 ca-certificates lsb-release ubuntu-keyring

curl https://nginx.org/keys/nginx_signing.key | gpg --dearmor \
    | tee /usr/share/keyrings/nginx-archive-keyring.gpg >/dev/null

echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] \
http://nginx.org/packages/mainline/ubuntu `lsb_release -cs` nginx" \
    | tee /etc/apt/sources.list.d/nginx.list

echo -e "Package: *\nPin: origin nginx.org\nPin: release o=nginx\nPin-Priority: 900\n" \
    | tee /etc/apt/preferences.d/99nginx

apt-get update
apt-get install -y nginx


#==============================================================================#
echo ">>> Starting nginx..."
systemctl enable nginx
systemctl start nginx


#==============================================================================#
echo ">>> Setting up temporary http server for certbot..."
tee "$NGINX_CONFIG_FILE" > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location / {
        return 404;
    }
}
EOF

ln -sf "$NGINX_CONFIG_FILE" "$NGINX_CONFIG_SYMLINK"

nginx -t
systemctl reload nginx


#==============================================================================#
echo ">>> Installing certbot and python3-certbot-nginx..."
apt-get update
apt-get install -y certbot python3-certbot-nginx


#==============================================================================#
echo ">>> Getting certificate..."
certbot certonly --nginx --non-interactive --agree-tos -m "$EMAIL" -d "$DOMAIN"


#==============================================================================#
echo ">>> Reload nginx with reverse proxy configuration"

tee "$NGINX_CONFIG_FILE" > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    charset utf-8;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    charset utf-8;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    location / {
        # CORS
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
        add_header Access-Control-Max-Age 3600 always;
        
        # Reverse proxy
        proxy_pass http://localhost:9864/;
        proxy_pass_request_headers on;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

nginx -t
systemctl reload nginx


#==============================================================================#
echo ">>> Setting up cron job for automatized certificate renewal..."
CRON_JOB="0 0 * * * /usr/bin/certbot renew --nginx --quiet && systemctl reload nginx"
(crontab -l 2>/dev/null | grep -Fv "$CRON_JOB"; echo "$CRON_JOB") | crontab -

echo ">>> nginx deployment done"
