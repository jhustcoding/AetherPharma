# TrueNAS Web UI Deployment (No SSH Required)

## Step 1: Create Dataset
1. Go to **Storage** → **Pools**
2. Click on your pool
3. Click **Add Dataset**
4. Name: `apps`
5. Click **Save**

## Step 2: Create App via Web UI
1. Go to **Apps** → **Launch Docker Image**
2. Fill in:
   - **Application Name**: `aetherpharma`
   - **Image Repository**: `alpine`
   - **Image Tag**: `latest`

3. **Container Entrypoint**:
   ```
   /bin/sh
   ```

4. **Container Args**:
   ```
   -c
   apk add git go nodejs npm python3 && cd /mnt && git clone https://github.com/jhustcoding/AetherPharma.git app && cd app && go run cmd/server/main.go
   ```

5. **Port Forwarding**:
   - Container Port: `8080`
   - Node Port: `30080`
   - Protocol: `TCP`

6. **Storage** (Add Volume):
   - Host Path: `/mnt/YOUR_POOL/apps/aetherpharma`
   - Mount Path: `/mnt/app`
   - Type: `Host Path`

7. **Environment Variables**:
   - `JWT_SECRET` = `truenas-demo-secret`
   - `DB_TYPE` = `sqlite`
   - `GIN_MODE` = `release`

8. Click **Save**

## Step 3: Access Your App
- Go to: `http://192.168.0.9:30080`
- Login: `admin` / `admin123`

## Alternative: File Upload Method

1. **On your Mac, create a zip file:**
```bash
cd /Users/jday/dev/projects/AetherPharma
zip -r aetherpharma.zip . -x "*.git*" "node_modules/*"
```

2. **In TrueNAS Web UI:**
   - Go to **Storage** → **Pools**
   - Navigate to your dataset
   - Click **Upload**
   - Upload the zip file

3. **In TrueNAS Shell (System Settings → Shell):**
```bash
cd /mnt/YOUR_POOL/apps
unzip aetherpharma.zip -d aetherpharma
cd aetherpharma
docker-compose up -d
```