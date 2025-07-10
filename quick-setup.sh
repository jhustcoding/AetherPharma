#!/bin/bash

# AetherPharma Quick Setup Script
# Automates the local development environment setup

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 AetherPharma Quick Setup${NC}"
echo "Setting up your local development environment..."

# Check prerequisites
echo -e "\n${YELLOW}📋 Checking Prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 16+ from https://nodejs.org${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

# Check Go
if ! command -v go &> /dev/null; then
    echo -e "${RED}❌ Go not found. Please install Go 1.19+ from https://golang.org/dl${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Go $(go version | cut -d' ' -f3)${NC}"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL not found. Installing with Docker...${NC}"
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker not found. Please install PostgreSQL or Docker${NC}"
        exit 1
    fi
fi

# Step 1: Setup Backend
echo -e "\n${YELLOW}📡 Setting up Backend...${NC}"

# Create environment file
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local for development..."
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

# Setup Go dependencies
echo "Installing Go dependencies..."
go mod tidy
go mod download
echo -e "${GREEN}✅ Go dependencies installed${NC}"

# Step 2: Setup Database
echo -e "\n${YELLOW}🗄️ Setting up Database...${NC}"

# Try to create database
if command -v psql &> /dev/null; then
    # Local PostgreSQL
    echo "Setting up local PostgreSQL database..."
    
    # Create database and user
    sudo -u postgres psql -c "CREATE DATABASE pharmacy_local;" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE USER pharmacy_user WITH PASSWORD 'password123';" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE pharmacy_local TO pharmacy_user;" 2>/dev/null || true
    
    echo -e "${GREEN}✅ Database setup complete${NC}"
else
    # Docker PostgreSQL
    echo "Starting PostgreSQL with Docker..."
    docker run -d \
        --name pharmacy-postgres \
        -e POSTGRES_DB=pharmacy_local \
        -e POSTGRES_USER=pharmacy_user \
        -e POSTGRES_PASSWORD=password123 \
        -p 5432:5432 \
        postgres:13 2>/dev/null || echo "Database container already running"
    
    # Wait for database to be ready
    echo "Waiting for database to be ready..."
    sleep 5
    echo -e "${GREEN}✅ Database running in Docker${NC}"
fi

# Run migrations
echo "Running database migrations..."
ENV=development go run cmd/server/main.go migrate || {
    echo -e "${YELLOW}⚠️  Migration failed. The database might already be set up.${NC}"
}

# Step 3: Setup Frontend
echo -e "\n${YELLOW}🎨 Setting up Frontend...${NC}"

if [ ! -d "frontend" ]; then
    echo "Creating React TypeScript project..."
    npx create-react-app frontend --template typescript --yes
    
    cd frontend
    
    # Install additional dependencies
    echo "Installing UI dependencies..."
    npm install recharts lucide-react date-fns react-hot-toast
    npm install -D tailwindcss postcss autoprefixer
    npx tailwindcss init -p
    
    # Configure Tailwind
    cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
}
EOF

    # Update CSS
    cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
EOF

    # Copy existing components
    cp -r ../src/* src/ 2>/dev/null || true
    
    # Set API proxy
    npm pkg set proxy="http://localhost:8080"
    
    cd ..
    echo -e "${GREEN}✅ Frontend setup complete${NC}"
else
    echo -e "${GREEN}✅ Frontend already exists${NC}"
fi

# Step 4: Create development script
echo -e "\n${YELLOW}🔧 Creating development scripts...${NC}"

# Create run script
cat > run-dev.sh << 'EOF'
#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting AetherPharma Development Environment${NC}"

# Start backend in background
echo -e "${GREEN}📡 Starting Backend Server...${NC}"
ENV=development go run cmd/server/main.go &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo -e "${GREEN}🎨 Starting Frontend Server...${NC}"
cd frontend && npm start &
FRONTEND_PID=$!

# Wait for user to stop
echo -e "${GREEN}✅ Both servers running!${NC}"
echo "Backend:  http://localhost:8080"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Handle cleanup
trap 'kill $BACKEND_PID $FRONTEND_PID; exit' INT
wait
EOF

chmod +x run-dev.sh

# Create test script
cat > test-setup.sh << 'EOF'
#!/bin/bash

echo "🧪 Testing setup..."

# Test backend
echo "Testing backend..."
ENV=development timeout 10s go run cmd/server/main.go &
BACKEND_PID=$!
sleep 3

if curl -s http://localhost:8080/health > /dev/null; then
    echo "✅ Backend is working"
else
    echo "❌ Backend test failed"
fi

kill $BACKEND_PID 2>/dev/null

# Test frontend dependencies
if [ -d "frontend" ]; then
    cd frontend
    if npm list > /dev/null 2>&1; then
        echo "✅ Frontend dependencies are installed"
    else
        echo "❌ Frontend dependencies missing"
    fi
    cd ..
fi

echo "🎉 Setup test complete!"
EOF

chmod +x test-setup.sh

echo -e "${GREEN}✅ Development scripts created${NC}"

# Final instructions
echo -e "\n${BLUE}🎉 Setup Complete!${NC}"
echo ""
echo -e "${GREEN}Quick Start:${NC}"
echo "1. Run both servers: ${YELLOW}./run-dev.sh${NC}"
echo "2. Visit frontend: ${YELLOW}http://localhost:3000${NC}"
echo "3. Test backend: ${YELLOW}curl http://localhost:8080/health${NC}"
echo ""
echo -e "${GREEN}Optional:${NC}"
echo "• Test setup: ${YELLOW}./test-setup.sh${NC}"
echo "• Read guide: ${YELLOW}cat LOCAL_DEVELOPMENT_GUIDE.md${NC}"
echo "• Install Air for Go hot reload: ${YELLOW}go install github.com/cosmtrek/air@latest${NC}"
echo ""
echo -e "${BLUE}Happy coding! 🚀${NC}"