# TrueNAS SCALE Deployment Guide for AetherPharma

## TrueNAS SCALE Deployment Options

### Option 1: Using TrueNAS Apps (Easiest)

#### Step 1: Prepare Custom App
1. Go to **Apps** in TrueNAS web interface
2. Click **Discover Apps** → **Custom App**
3. Click **Install**

#### Step 2: Configure Backend Container
**Application Name:** `aetherpharma-backend`

**Container Images:**
- Image Repository: `golang`
- Image Tag: `1.21-alpine`

**Container Entrypoint:**
```bash
sh -c "cd /app && go run cmd/server/main.go"
```

**Container Environment Variables:**
- `JWT_SECRET`: `your-secure-jwt-secret`
- `ENCRYPTION_KEY`: `32-character-encryption-key-here`
- `DB_TYPE`: `sqlite`
- `GIN_MODE`: `release`

**Port Forwarding:**
- Container Port: `8080`
- Node Port: `30080`
- Protocol: `TCP`

**Storage:**
- Add Host Path Volume:
  - Host Path: `/mnt/pool-name/apps/aetherpharma`
  - Mount Path: `/app`

#### Step 3: Configure Frontend Container
Create another Custom App:

**Application Name:** `aetherpharma-frontend`

**Container Images:**
- Image Repository: `node`
- Image Tag: `18-alpine`

**Container Entrypoint:**
```bash
sh -c "cd /app/frontend && npm install && npm start"
```

**Container Environment Variables:**
- `REACT_APP_API_BASE_URL`: `http://YOUR-TRUENAS-IP:30080`

**Port Forwarding:**
- Container Port: `3000`
- Node Port: `30000`

### Option 2: Using Docker Compose (More Control)

#### Step 1: Enable Docker in TrueNAS
```bash
# SSH into TrueNAS
ssh root@YOUR-TRUENAS-IP

# Create app directory
mkdir -p /mnt/your-pool/apps/aetherpharma
cd /mnt/your-pool/apps/aetherpharma
```

#### Step 2: Upload Project Files
On your Mac:
```bash
# Create deployment package
cd /Users/jday/dev/projects/AetherPharma
rsync -av --exclude=node_modules --exclude=.git . root@TRUENAS-IP:/mnt/your-pool/apps/aetherpharma/
```

#### Step 3: Create TrueNAS-Specific Docker Compose
```yaml
# /mnt/your-pool/apps/aetherpharma/docker-compose.truenas.yml
version: '3.8'

services:
  backend:
    build: .
    container_name: aetherpharma-backend
    restart: unless-stopped
    ports:
      - "30080:8080"
    environment:
      - JWT_SECRET=${JWT_SECRET:-truenas-secure-jwt-secret}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY:-32-character-key-for-truenas-use}
      - DB_TYPE=sqlite
      - DB_PATH=/data/pharmacy.db
      - GIN_MODE=release
    volumes:
      - /mnt/your-pool/apps/aetherpharma/data:/data
      - /mnt/your-pool/apps/aetherpharma:/app
    networks:
      - aetherpharma-net

  frontend:
    build: ./frontend
    container_name: aetherpharma-frontend
    restart: unless-stopped
    ports:
      - "30000:80"
    environment:
      - REACT_APP_API_BASE_URL=http://${TRUENAS_IP}:30080
    depends_on:
      - backend
    networks:
      - aetherpharma-net

networks:
  aetherpharma-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

#### Step 4: Deploy with Docker
```bash
# Set your TrueNAS IP
export TRUENAS_IP=$(hostname -I | awk '{print $1}')

# Build and run
docker-compose -f docker-compose.truenas.yml up -d
```

### Option 3: Using TrueCharts (Community Apps)

#### Step 1: Add TrueCharts Catalog
1. Go to **Apps** → **Manage Catalogs**
2. Add TrueCharts catalog if not already added

#### Step 2: Deploy Custom App
1. Use **Custom-App** from TrueCharts
2. Configure with your container settings

### Option 4: Native Kubernetes Deployment

Create Kubernetes manifests:

```yaml
# aetherpharma-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aetherpharma-backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: aetherpharma-backend
  template:
    metadata:
      labels:
        app: aetherpharma-backend
    spec:
      containers:
      - name: backend
        image: aetherpharma-backend:latest
        ports:
        - containerPort: 8080
        env:
        - name: JWT_SECRET
          value: "your-secure-secret"
        - name: DB_TYPE
          value: "sqlite"
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        hostPath:
          path: /mnt/your-pool/apps/aetherpharma/data
---
apiVersion: v1
kind: Service
metadata:
  name: aetherpharma-backend
spec:
  type: NodePort
  ports:
  - port: 8080
    targetPort: 8080
    nodePort: 30080
  selector:
    app: aetherpharma-backend
```

## Quick Deployment Script for TrueNAS SCALE

```bash
#!/bin/bash
# Save as deploy-truenas.sh

POOL_PATH="/mnt/your-pool/apps/aetherpharma"
TRUENAS_IP=$(hostname -I | awk '{print $1}')

echo "Deploying AetherPharma on TrueNAS SCALE..."

# Create directories
mkdir -p $POOL_PATH/data
mkdir -p $POOL_PATH/logs

# Copy docker compose
cat > $POOL_PATH/docker-compose.yml << EOF
version: '3.8'
services:
  app:
    image: golang:1.21-alpine
    working_dir: /app
    command: sh -c "go build -o pharmacy-backend cmd/server/main.go && ./pharmacy-backend"
    ports:
      - "30080:8080"
    environment:
      - JWT_SECRET=truenas-demo-secret-change-this
      - ENCRYPTION_KEY=32-chars-for-truenas-encryption1
      - DB_TYPE=sqlite
      - DB_PATH=/data/pharmacy.db
    volumes:
      - $POOL_PATH:/app
      - $POOL_PATH/data:/data
    restart: unless-stopped
EOF

# Start the application
cd $POOL_PATH
docker-compose up -d

echo "AetherPharma deployed!"
echo "Backend: http://$TRUENAS_IP:30080"
echo "Upload frontend files to: $POOL_PATH/frontend"
```

## Accessing Your Application

### From Local Network:
- Frontend: `http://TRUENAS-IP:30000`
- Backend: `http://TRUENAS-IP:30080`

### From Outside (Customer Access):

#### Option 1: WireGuard VPN (Built into TrueNAS)
1. Go to **System** → **Services** → **WireGuard**
2. Configure WireGuard
3. Share config with customer
4. They connect via VPN and use local IP

#### Option 2: Cloudflare Tunnel (Secure & Free)
```bash
# Install cloudflared
docker run -d \
  --name=cloudflared \
  -v /mnt/your-pool/cloudflared:/home/nonroot/.cloudflared \
  cloudflare/cloudflared:latest \
  tunnel run
```

#### Option 3: Tailscale (Easiest)
1. Install Tailscale from TrueNAS Apps
2. Share Tailscale network
3. Access via: `http://truenas-hostname:30000`

## TrueNAS-Specific Considerations

### Storage:
- Use a dataset specifically for apps
- Enable snapshots for easy rollback
- Set up automated backups

### Networking:
- Use bridge network for containers
- Configure static IPs if needed
- Set up firewall rules

### Performance:
- Allocate sufficient RAM to Apps
- Use SSD pool for database
- Enable container resource limits

### Security:
- Use TrueNAS built-in firewall
- Enable 2FA for web interface
- Regular security updates

## Monitoring on TrueNAS

### View Container Logs:
```bash
# Via CLI
docker logs aetherpharma-backend

# Via Web UI
Apps → Installed → aetherpharma → Logs
```

### Resource Usage:
- System → Reporting → CPU/Memory
- Apps → Installed → View Resources

Would you like me to:
1. Create a one-click TrueNAS deployment script?
2. Set up Cloudflare Tunnel configuration?
3. Configure WireGuard VPN settings?