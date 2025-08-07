# Docker Deployment

This project uses Docker Compose for deployment. There are only **2 configurations**:

## 🚀 Production (TrueNAS SCALE)

**File:** `truenas-docker-compose-production.yaml`

**Usage:**
```bash
docker-compose -f truenas-docker-compose-production.yaml up -d
```

**Features:**
- ✅ Uses Tailscale IP (100.104.33.63) for cross-device access
- ✅ PostgreSQL database with migrations
- ✅ Production-optimized environment variables
- ✅ CORS configured for external access

## 🔧 Local Development

**File:** `docker-compose.yml`

**Usage:**
```bash
docker-compose up -d
```

**Features:**
- ✅ Uses localhost (127.0.0.1)
- ✅ Development mode settings
- ✅ Hot reloading enabled

---

## 🌐 Access URLs

**Production (Tailscale):**
- Frontend: http://100.104.33.63:3000
- Backend: http://100.104.33.63:8080

**Development (Local):**
- Frontend: http://localhost:3000
- Backend: http://localhost:8080

## 👤 Default Login

```
Username: admin
Password: admin123
```