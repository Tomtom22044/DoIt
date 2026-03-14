#!/bin/bash

# Configuration
DOMAIN="doit.alink.co.il"
APP_PORT=3000
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root (use sudo)"
  exit
fi

echo "--- Installing Nginx and Certbot ---"
apt update
apt install -y nginx certbot python3-certbot-nginx

echo "--- Creating Nginx Configuration ---"
cat > $NGINX_CONF <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Security headers for Push Notifications
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

echo "--- Enabling Configuration ---"
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo "--- Testing Nginx and Restarting ---"
nginx -t
if [ $? -eq 0 ]; then
    systemctl restart nginx
else
    echo "Nginx configuration test failed. Please check the logs."
    exit 1
fi

echo "--- Requesting SSL Certificate (Let's Encrypt) ---"
echo "Note: You will be asked for an email for renewal alerts."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --redirect -m admin@alink.co.il

echo "----------------------------------------------------"
echo "SUCCESS!"
echo "Your app should now be available at: https://$DOMAIN"
echo "Push notifications (Service Workers) are now enabled."
echo "----------------------------------------------------"
