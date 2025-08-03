# 🚀 AetherPharma Deployment Guide

## 📋 **DEPLOYMENT RULES & PROCEDURES**

This guide enforces the deployment rules defined in `PROJECT_RULES.md` and provides step-by-step procedures for all environments.

---

## 🌍 **ENVIRONMENT OVERVIEW**

### Development Environment
- **Purpose**: Local development and testing
- **Database**: SQLite (pharmacy.db)
- **URL**: http://localhost:3000
- **Command**: `./run-dev.sh`

### Staging Environment
- **Purpose**: Pre-production testing and validation
- **Database**: PostgreSQL (managed)
- **URL**: https://staging.aetherpharma.com
- **Deploy**: Automatic on `develop` branch

### Production Environment
- **Purpose**: Live system serving real users
- **Database**: PostgreSQL (managed with backups)
- **URL**: https://aetherpharma.com
- **Deploy**: Manual approval required

---

## 🔧 **PRE-DEPLOYMENT CHECKLIST**

### ✅ **Code Quality Requirements**
```bash
# 1. Validate project structure
./scripts/validate-project-structure.sh

# 2. Run all tests
cd frontend && npm test -- --coverage
go test -v ./...

# 3. Build verification
cd frontend && npm run build
go build ./cmd/server

# 4. Security scan
# Run vulnerability scanning tools
```

### ✅ **Environment Configuration**
```bash
# Required environment variables:
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-32-character-secret-key
ENCRYPTION_KEY=exactly-32-character-encryption-key
REDIS_URL=redis://host:6379
HIPAA_MODE=true
```

### ✅ **Infrastructure Requirements**
- [ ] SSL certificates configured
- [ ] Database backups enabled
- [ ] Monitoring alerts set up
- [ ] Log aggregation configured
- [ ] Health checks implemented
- [ ] Auto-scaling configured

---

## 🚀 **DEPLOYMENT PROCEDURES**

### 🏠 **Local Development Deployment**

```bash
# 1. Clone repository
git clone <repository-url>
cd AetherPharma

# 2. Validate structure
./scripts/validate-project-structure.sh

# 3. Start development environment
./run-dev.sh

# 4. Verify deployment
curl http://localhost:8080/health
curl http://localhost:3000
```

### 🧪 **Staging Deployment**

```bash
# 1. Push to develop branch (triggers auto-deployment)
git checkout develop
git push origin develop

# 2. Monitor deployment
# Check GitHub Actions for deployment status

# 3. Validate staging environment
curl -f https://staging.aetherpharma.com/health
curl -f https://staging.aetherpharma.com/api/v1/health

# 4. Run integration tests
./scripts/test-staging-environment.sh
```

### 🌟 **Production Deployment**

```bash
# 1. Merge to main branch (requires approval)
git checkout main
git merge develop
git push origin main

# 2. Manual approval in GitHub Actions
# Navigate to Actions tab and approve production deployment

# 3. Monitor deployment metrics
# Check monitoring dashboard for deployment progress

# 4. Validate production environment
curl -f https://aetherpharma.com/health
curl -f https://aetherpharma.com/api/v1/health

# 5. Post-deployment verification
./scripts/test-production-health.sh
```

---

## 🐳 **DOCKER DEPLOYMENT**

### Development Docker Setup
```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f

# Stop environment
docker-compose down
```

### Production Docker Setup
```bash
# Set environment variables
export DATABASE_URL="your-production-db-url"
export JWT_SECRET="your-jwt-secret"
export ENCRYPTION_KEY="your-encryption-key"

# Deploy production stack
docker-compose -f docker-compose.production.yml up -d

# Health check
docker-compose -f docker-compose.production.yml ps
```

---

## ☁️ **CLOUD DEPLOYMENT OPTIONS**

### Option 1: AWS ECS/Fargate

```yaml
# ecs-task-definition.json
{
  "family": "aetherpharma",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "aetherpharma/backend:latest",
      "portMappings": [{"containerPort": 8080}],
      "environment": [
        {"name": "DATABASE_URL", "valueFrom": "arn:aws:ssm:..."},
        {"name": "JWT_SECRET", "valueFrom": "arn:aws:ssm:..."}
      ]
    }
  ]
}
```

### Option 2: Google Cloud Run

```bash
# Deploy backend
gcloud run deploy aetherpharma-backend \
  --image gcr.io/project/aetherpharma-backend:latest \
  --platform managed \
  --region us-central1 \
  --set-env-vars DATABASE_URL="...",JWT_SECRET="..."

# Deploy frontend to Cloud Storage + CDN
gsutil -m cp -r frontend/build/* gs://aetherpharma-frontend/
```

### Option 3: Kubernetes

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aetherpharma-backend
spec:
  replicas: 3
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
        image: aetherpharma/backend:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: aetherpharma-secrets
              key: database-url
```

---

## 📊 **MONITORING & HEALTH CHECKS**

### Health Check Endpoints
```bash
# Backend health
GET /health
Response: {"status": "healthy", "database": "connected"}

# API health
GET /api/v1/health
Response: {"api": "ready", "version": "1.0.0"}
```

### Monitoring Setup
```bash
# Prometheus metrics
GET /metrics
# Returns application metrics in Prometheus format

# Custom health checks
curl -f https://your-domain.com/health || exit 1
```

### Alerting Rules
```yaml
# prometheus-alerts.yml
groups:
- name: aetherpharma
  rules:
  - alert: HighResponseTime
    expr: http_request_duration_seconds{quantile="0.95"} > 1
    for: 5m
    annotations:
      summary: "High response time detected"
  
  - alert: DatabaseDown
    expr: up{job="postgres"} == 0
    for: 1m
    annotations:
      summary: "Database is down"
```

---

## 🔐 **SECURITY CONSIDERATIONS**

### SSL/TLS Configuration
```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name aetherpharma.com;
    
    ssl_certificate /etc/ssl/certs/aetherpharma.com.crt;
    ssl_certificate_key /etc/ssl/private/aetherpharma.com.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    location / {
        proxy_pass http://frontend:3000;
    }
    
    location /api/ {
        proxy_pass http://backend:8080;
    }
}
```

### Environment Secrets Management
```bash
# Use environment variables for secrets
export JWT_SECRET=$(openssl rand -base64 32)
export ENCRYPTION_KEY=$(openssl rand -base64 32)

# Or use cloud secret managers
# AWS Systems Manager Parameter Store
# Google Secret Manager
# Azure Key Vault
```

---

## 🚨 **ROLLBACK PROCEDURES**

### Automatic Rollback
```bash
# Health check failure triggers automatic rollback
if ! curl -f https://aetherpharma.com/health; then
    echo "Health check failed, rolling back..."
    # Revert to previous version
fi
```

### Manual Rollback
```bash
# Docker rollback
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --scale backend=0
docker-compose -f docker-compose.production.yml up -d

# Kubernetes rollback
kubectl rollout undo deployment/aetherpharma-backend

# Cloud platform rollback
# Follow platform-specific procedures
```

---

## 📝 **DEPLOYMENT LOGS & AUDIT**

### Required Logging
```bash
# Application logs
tail -f /var/log/aetherpharma/application.log

# Deployment logs
tail -f /var/log/aetherpharma/deployment.log

# Security audit logs
tail -f /var/log/aetherpharma/audit.log
```

### Log Aggregation
```yaml
# docker-compose.yml logging configuration
logging:
  driver: "json-file"
  options:
    max-size: "100m"
    max-file: "5"
```

---

## 🆘 **TROUBLESHOOTING**

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database connectivity
   pg_isready -h database-host -p 5432
   
   # Verify credentials
   psql -h database-host -U username -d database
   ```

2. **Frontend Build Failures**
   ```bash
   # Clear cache and rebuild
   cd frontend
   rm -rf node_modules/.cache
   npm ci
   npm run build
   ```

3. **Backend Health Check Failures**
   ```bash
   # Check backend logs
   docker-compose logs backend
   
   # Verify environment variables
   docker-compose exec backend env | grep -E "(DATABASE|JWT|ENCRYPTION)"
   ```

4. **SSL Certificate Issues**
   ```bash
   # Check certificate validity
   openssl x509 -in certificate.crt -text -noout
   
   # Test SSL connection
   openssl s_client -connect aetherpharma.com:443
   ```

---

## 📞 **SUPPORT & ESCALATION**

### Deployment Issues
1. Check deployment logs
2. Verify health checks
3. Review monitoring alerts
4. Contact development team

### Emergency Contacts
- **Development Team**: dev-team@aetherpharma.com
- **DevOps Team**: devops@aetherpharma.com
- **On-Call Engineer**: +1-xxx-xxx-xxxx

---

**⚠️ IMPORTANT: Always follow the deployment checklist and never skip security validations!**

*Last Updated: August 2025*