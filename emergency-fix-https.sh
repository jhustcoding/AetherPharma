#!/bin/bash
# Emergency fix for HTTPS redirect issue in running containers
# Run this inside TrueNAS if the Docker Compose update fails

echo "=== Emergency HTTPS Redirect Fix ==="

# Method 1: Update environment variable in running container
echo "1. Setting DISABLE_SSL_REDIRECT environment variable..."
docker exec -it aetherpharma-backend sh -c 'export DISABLE_SSL_REDIRECT=true && export ENV=development && export ENVIRONMENT=development'

# Method 2: Restart backend with new environment
echo "2. Restarting backend container with development mode..."
docker stop aetherpharma-backend
docker rm aetherpharma-backend

# Recreate backend container with development mode
docker run -d \
  --name aetherpharma-backend \
  --network aetherpharma_default \
  -p 8080:8080 \
  -e ENV=development \
  -e ENVIRONMENT=development \
  -e DISABLE_SSL_REDIRECT=true \
  -e DB_TYPE=postgres \
  -e DB_HOST=postgres \
  -e DB_PORT=5432 \
  -e DB_USER=pharmacy_user \
  -e DB_PASSWORD=pharmacy_password \
  -e DB_NAME=pharmacy_db \
  -e DB_SSL_MODE=disable \
  -e CLOUD_DB_ENABLED=false \
  -e LOCAL_DB_ENABLED=false \
  -e READ_REPLICA_ENABLED=false \
  -e DUAL_DB_MODE=false \
  -e REDIS_HOST=redis \
  -e REDIS_PORT=6379 \
  -e REDIS_DB=0 \
  -e JWT_SECRET="truenas-demo-secret-key-32-chars" \
  -e ENCRYPTION_KEY="abcdefghijklmnopqrstuvwxyz123456" \
  -e SERVER_HOST="0.0.0.0" \
  -e SERVER_PORT="8080" \
  -e GIN_HOST="0.0.0.0" \
  -e GIN_PORT="8080" \
  -e GIN_MODE=debug \
  -e HIPAA_MODE=true \
  -e CORS_ALLOWED_ORIGINS="*" \
  -e CORS_ALLOWED_METHODS="GET,POST,PUT,DELETE,OPTIONS,PATCH" \
  -e CORS_ALLOWED_HEADERS="*" \
  --restart unless-stopped \
  golang:1.23-alpine \
  sh -c "apk add --no-cache git curl gcc musl-dev postgresql-client && until PGPASSWORD=pharmacy_password psql -h postgres -U pharmacy_user -d pharmacy_db -c 'SELECT 1;' > /dev/null 2>&1; do sleep 2; done && PGPASSWORD=pharmacy_password psql -h postgres -U pharmacy_user -d pharmacy_db -c 'CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";' && rm -rf /app && git clone --depth 1 https://github.com/jhustcoding/AetherPharma.git /app && cd /app && go get -u gorm.io/gorm@latest && go get -u gorm.io/driver/postgres@latest && go get -u github.com/jackc/pgx/v5@latest && go mod tidy && go mod download && CGO_ENABLED=1 go run cmd/server/main.go"

echo "3. Testing the fix..."
sleep 30
curl -v http://192.168.0.9:8080/health

echo "=== Fix complete! ==="
echo "Backend should now respond with HTTP 200 instead of 301 redirect"