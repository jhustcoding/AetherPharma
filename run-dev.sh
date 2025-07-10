#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting AetherPharma Development Environment${NC}"

# Check if .env.local exists, if not create it
if [ ! -f .env.local ]; then
    echo -e "${BLUE}📋 Creating development environment file...${NC}"
    cat > .env.local << 'EOF'
# Development Environment
ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=pharmacy_user
DB_PASSWORD=password123
DB_NAME=pharmacy_local
DB_SSL_MODE=disable

# Server Configuration
SERVER_HOST=localhost
SERVER_PORT=8080
GIN_MODE=debug

# Security (for development)
ENCRYPTION_KEY=12345678901234567890123456789012
JWT_SECRET=your-jwt-secret-key-for-development

# CORS (allow frontend)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Redis (optional for development)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Logging
LOG_LEVEL=debug
LOG_FORMAT=text

# HIPAA (disabled for development)
HIPAA_MODE=false
AUDIT_LOGGING=true
EOF
    echo -e "${GREEN}✅ Created .env.local${NC}"
fi

# Function to cleanup background processes
cleanup() {
    echo -e "\n${RED}🛑 Stopping servers...${NC}"
    # Kill all background jobs
    jobs -p | xargs -r kill
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo -e "${RED}❌ Go is not installed. Please install Go first.${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Start backend server
echo -e "${GREEN}📡 Starting Backend Server...${NC}"
ENV=development go run cmd/server/main.go &
BACKEND_PID=$!

# Wait for backend to start
echo -e "${BLUE}⏳ Waiting for backend to start...${NC}"
sleep 5

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start backend server${NC}"
    exit 1
fi

# Install frontend dependencies if node_modules doesn't exist
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

# Start frontend server
echo -e "${GREEN}🎨 Starting Frontend Server...${NC}"
cd frontend && npm start &
FRONTEND_PID=$!
cd ..

# Display status
echo -e "${GREEN}✅ Both servers are running!${NC}"
echo -e "${BLUE}🔗 URLs:${NC}"
echo -e "   Backend:  http://localhost:8080"
echo -e "   Frontend: http://localhost:3000"
echo -e "   Health:   http://localhost:8080/health"
echo ""
echo -e "${BLUE}📝 To stop both servers, press Ctrl+C${NC}"
echo ""

# Wait for processes to finish
wait