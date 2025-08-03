# Setting Up Custom URL "aetherpharma" for TrueNAS Deployment

## Option 1: Local Network DNS (Easiest for Testing)

### A. Using Your Router's DNS
1. Access your router's admin panel
2. Look for "DNS" or "Local DNS" settings
3. Add entry:
   ```
   aetherpharma → YOUR-TRUENAS-IP
   ```
4. Access via: `http://aetherpharma:30000`

### B. Using Pi-hole (If you have it)
1. Login to Pi-hole admin
2. Go to Local DNS → DNS Records
3. Add:
   ```
   Domain: aetherpharma
   IP: YOUR-TRUENAS-IP
   ```

### C. Edit Hosts File (Quick for Testing)

**On Your Mac:**
```bash
sudo nano /etc/hosts
# Add line:
192.168.1.100  aetherpharma  # Replace with your TrueNAS IP
```

**For Your Customer's Mac:**
```bash
# Send them this command:
echo "YOUR-TRUENAS-IP aetherpharma" | sudo tee -a /etc/hosts
```

## Option 2: Using TrueNAS Built-in Reverse Proxy

### Step 1: Install Traefik on TrueNAS
```yaml
# Create this as a Custom App in TrueNAS
Application Name: traefik-proxy

Container Image:
  Repository: traefik
  Tag: latest

Container Entrypoint:
  - "--api.insecure=true"
  - "--providers.docker=true"
  - "--entrypoints.web.address=:80"
  - "--entrypoints.websecure.address=:443"

Port Forwarding:
  - 80:80
  - 443:443
  - 8080:8080 (Traefik Dashboard)
```

### Step 2: Configure Your App with Labels
In your AetherPharma app configuration, add these labels:
```yaml
Labels:
  traefik.enable: "true"
  traefik.http.routers.aetherpharma.rule: "Host(`aetherpharma`)"
  traefik.http.services.aetherpharma.loadbalancer.server.port: "3000"
```

## Option 3: Using mDNS (Bonjour) - Works on Local Network

### Create mDNS Advertisement Script
```bash
#!/bin/bash
# Save as: /mnt/your-pool/apps/aetherpharma/advertise-mdns.sh

# Install avahi if not installed
apt-get update && apt-get install -y avahi-daemon avahi-utils

# Create service file
cat > /etc/avahi/services/aetherpharma.service << EOF
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name>AetherPharma</name>
  <service>
    <type>_http._tcp</type>
    <port>30000</port>
    <txt-record>path=/</txt-record>
  </service>
</service-group>
EOF

# Restart avahi
systemctl restart avahi-daemon

echo "AetherPharma now accessible at http://aetherpharma.local"
```

## Option 4: Using Nginx Proxy Manager (Visual Configuration)

### Step 1: Install Nginx Proxy Manager on TrueNAS
1. Apps → Available Applications → Search "Nginx Proxy Manager"
2. Install with default settings
3. Access at: `http://truenas-ip:81`
4. Default login: `admin@example.com` / `changeme`

### Step 2: Add Proxy Host
1. Click "Proxy Hosts" → "Add Proxy Host"
2. Configure:
   - Domain Names: `aetherpharma`
   - Forward Hostname: `YOUR-TRUENAS-IP`
   - Forward Port: `30000`
   - Enable "Block Common Exploits"

## Option 5: Complete Solution with Docker Compose

```yaml
# docker-compose.aetherpharma.yml
version: '3.8'

services:
  proxy:
    image: nginx:alpine
    container_name: aetherpharma-proxy
    ports:
      - "80:80"
    volumes:
      - ./nginx-proxy.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend
      - frontend
    networks:
      - aetherpharma-net

  backend:
    build: .
    container_name: aetherpharma-backend
    hostname: api.aetherpharma
    environment:
      - JWT_SECRET=your-secure-jwt-secret
      - ENCRYPTION_KEY=32-character-encryption-key-here
      - DB_TYPE=sqlite
    networks:
      - aetherpharma-net

  frontend:
    build: ./frontend
    container_name: aetherpharma-frontend
    hostname: app.aetherpharma
    environment:
      - REACT_APP_API_BASE_URL=http://aetherpharma/api
    networks:
      - aetherpharma-net

networks:
  aetherpharma-net:
    driver: bridge
```

### Nginx Configuration:
```nginx
# nginx-proxy.conf
server {
    listen 80;
    server_name aetherpharma;

    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Option 6: For External Access (Customer Testing)

### A. Using Tailscale Magic DNS
1. Install Tailscale on TrueNAS
2. Name your machine "aetherpharma" in Tailscale
3. Customer accesses: `http://aetherpharma` (when connected to Tailscale)

### B. Using Cloudflare Tunnel with Custom Subdomain
```bash
# Install cloudflared
docker run -d --name cloudflared \
  -e TUNNEL_HOSTNAME=aetherpharma.yourdomain.com \
  -e TUNNEL_URL=http://localhost:30000 \
  cloudflare/cloudflared:latest
```

### C. Using DuckDNS (Free Dynamic DNS)
1. Register at duckdns.org
2. Create subdomain: `aetherpharma`
3. Full URL: `http://aetherpharma.duckdns.org`
4. Update script for TrueNAS:
```bash
#!/bin/bash
# Update DuckDNS
curl "https://www.duckdns.org/update?domains=aetherpharma&token=YOUR-TOKEN&ip="
```

## Quick Setup Script for "aetherpharma" URL

```bash
#!/bin/bash
# save as setup-aetherpharma-url.sh

echo "Setting up 'aetherpharma' URL access..."

# Option 1: Local hosts file
echo "1. Adding to local hosts file..."
echo "$(hostname -I | awk '{print $1}') aetherpharma" >> /etc/hosts

# Option 2: Create systemd service for mDNS
cat > /etc/systemd/system/aetherpharma-mdns.service << EOF
[Unit]
Description=AetherPharma mDNS Advertisement
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/avahi-publish -s aetherpharma _http._tcp 80 "AetherPharma Pharmacy System"
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl enable aetherpharma-mdns
systemctl start aetherpharma-mdns

echo "Setup complete!"
echo "Access methods:"
echo "1. http://aetherpharma (if hosts file configured)"
echo "2. http://aetherpharma.local (via mDNS)"
echo "3. Configure your router's DNS for network-wide access"
```

## Recommended Setup for Your Use Case

Since you want customers to access via "aetherpharma":

1. **For Local Testing:**
   - Use hosts file modification (quickest)
   - Or router DNS configuration (network-wide)

2. **For Customer Access:**
   - Use Tailscale with machine name "aetherpharma"
   - Or set up DuckDNS for `aetherpharma.duckdns.org`

3. **Professional Setup:**
   - Register domain `aetherpharma.com`
   - Use Cloudflare Tunnel for secure access
   - No port forwarding needed