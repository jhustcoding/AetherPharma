# NAS Deployment Guide for AetherPharma

## Prerequisites
- NAS with Docker support (Synology, QNAP, etc.)
- SSH access to your NAS
- Git installed on NAS (or ability to upload files)

## Method 1: Using Docker on Synology NAS

### Step 1: Prepare Your NAS
1. Open Synology DSM
2. Install "Container Manager" (formerly Docker) from Package Center
3. Enable SSH in Control Panel → Terminal & SNMP

### Step 2: Upload Project Files
```bash
# On your Mac, create deployment package
cd /Users/jday/dev/projects/AetherPharma
tar -czf aetherpharma.tar.gz --exclude=node_modules --exclude=.git .

# Upload to NAS (replace NAS_IP with your NAS IP)
scp aetherpharma.tar.gz admin@NAS_IP:/volume1/docker/
```

### Step 3: Deploy on NAS
```bash
# SSH into your NAS
ssh admin@NAS_IP

# Extract files
cd /volume1/docker
mkdir aetherpharma
tar -xzf aetherpharma.tar.gz -C aetherpharma
cd aetherpharma

# Update docker-compose.nas.yml with your NAS IP
sed -i 's/YOUR-NAS-IP/192.168.1.100/g' docker-compose.nas.yml

# Build and run
docker-compose -f docker-compose.nas.yml up -d
```

### Step 4: Access the Application
- Frontend: http://YOUR-NAS-IP:3000
- Backend API: http://YOUR-NAS-IP:8080
- Default login: admin / admin123

## Method 2: Using QNAP Container Station

1. Open Container Station
2. Click "Create" → "Create Application"
3. Import docker-compose.nas.yml
4. Modify environment variables
5. Click "Create"

## Method 3: Direct Installation (Without Docker)

### For Go Backend:
```bash
# Install Go on NAS (if available)
# Or cross-compile on your Mac:
GOOS=linux GOARCH=amd64 go build -o pharmacy-backend-linux cmd/server/main.go

# Copy binary to NAS
scp pharmacy-backend-linux admin@NAS_IP:/volume1/web/
```

### For Frontend:
```bash
# Build frontend
cd frontend
npm run build

# Copy to NAS web folder
scp -r build/* admin@NAS_IP:/volume1/web/aetherpharma/
```

## Security Configuration

### 1. Set Up Reverse Proxy (Recommended)
In DSM Control Panel → Login Portal → Advanced → Reverse Proxy:
- Source: https://pharmacy.yourdomain.com
- Destination: http://localhost:3000

### 2. Configure Firewall
Only allow specific IPs:
- Your IP
- Customer's IP

### 3. Enable HTTPS
Use Let's Encrypt in DSM:
Control Panel → Security → Certificate

## Customer Access Options

### Option 1: Direct IP Access
Share: http://YOUR-NAS-IP:3000

### Option 2: Dynamic DNS
1. Set up DDNS in DSM
2. Share: https://yournas.synology.me:3000

### Option 3: VPN Access (Most Secure)
1. Enable VPN Server on NAS
2. Create VPN user for customer
3. They connect via VPN then access local IP

### Option 4: Tailscale (Easiest Secure Option)
```bash
# Install Tailscale on NAS
# Synology: Available in Package Center
# QNAP: Use Container Station

# Share Tailscale network with customer
# Access via: http://nas-hostname:3000
```

## Monitoring & Maintenance

### View Logs:
```bash
# Docker logs
docker-compose -f docker-compose.nas.yml logs -f

# Or in DSM
Container Manager → Container → aetherpharma → Logs
```

### Backup Database:
```bash
# Automated backup
cp /volume1/docker/aetherpharma/pharmacy.db /volume1/backup/pharmacy-$(date +%Y%m%d).db
```

### Update Application:
```bash
cd /volume1/docker/aetherpharma
git pull
docker-compose -f docker-compose.nas.yml down
docker-compose -f docker-compose.nas.yml up -d --build
```

## Troubleshooting

### Port Already in Use:
Change ports in docker-compose.nas.yml:
```yaml
ports:
  - "8081:8080"  # Change to different port
```

### Permission Issues:
```bash
chmod -R 755 /volume1/docker/aetherpharma
```

### Can't Access from Outside:
1. Check NAS firewall settings
2. Configure port forwarding on router
3. Ensure containers are running

## Performance Tips

1. **Allocate Sufficient Resources:**
   - RAM: At least 2GB for containers
   - CPU: 2 cores recommended

2. **Use SSD Volume:**
   - Place Docker folder on SSD if available

3. **Enable Caching:**
   - Configure Redis for better performance

## Security Checklist

- [ ] Change default passwords
- [ ] Enable firewall rules
- [ ] Use HTTPS only
- [ ] Set up VPN or Tailscale
- [ ] Regular backups configured
- [ ] Monitor access logs
- [ ] Update containers regularly