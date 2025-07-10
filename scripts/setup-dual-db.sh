#!/bin/bash

# Dual PostgreSQL Database Setup Script
# Supports Local + Cloud database configuration for AetherPharma

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}"
    echo "=============================================="
    echo "  AetherPharma Dual Database Setup Script"
    echo "=============================================="
    echo -e "${NC}"
}

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if PostgreSQL is installed
check_postgresql() {
    print_step "Checking PostgreSQL installation..."
    
    if command -v psql &> /dev/null; then
        print_success "PostgreSQL is installed"
        psql --version
    else
        print_error "PostgreSQL is not installed!"
        echo "Please install PostgreSQL first:"
        echo "  Ubuntu/Debian: sudo apt install postgresql postgresql-contrib"
        echo "  macOS: brew install postgresql"
        echo "  Windows: Download from https://www.postgresql.org/download/"
        exit 1
    fi
}

# Check if Go is installed
check_go() {
    print_step "Checking Go installation..."
    
    if command -v go &> /dev/null; then
        print_success "Go is installed"
        go version
    else
        print_error "Go is not installed!"
        echo "Please install Go from https://golang.org/dl/"
        exit 1
    fi
}

# Create local PostgreSQL database
setup_local_database() {
    print_step "Setting up local PostgreSQL database..."
    
    read -p "Enter local database name [pharmacy_local]: " LOCAL_DB_NAME
    LOCAL_DB_NAME=${LOCAL_DB_NAME:-pharmacy_local}
    
    read -p "Enter local database user [pharmacy_user]: " LOCAL_DB_USER
    LOCAL_DB_USER=${LOCAL_DB_USER:-pharmacy_user}
    
    read -s -p "Enter local database password: " LOCAL_DB_PASSWORD
    echo
    
    # Create database and user
    echo "Creating database and user..."
    
    # Try to create database as current user first, then as postgres user
    if createdb "$LOCAL_DB_NAME" 2>/dev/null; then
        print_success "Database '$LOCAL_DB_NAME' created"
    else
        print_warning "Failed to create database as current user, trying as postgres user..."
        sudo -u postgres createdb "$LOCAL_DB_NAME" || {
            print_error "Failed to create database. Please create manually:"
            echo "  sudo -u postgres psql"
            echo "  CREATE DATABASE $LOCAL_DB_NAME;"
            echo "  CREATE USER $LOCAL_DB_USER WITH PASSWORD '$LOCAL_DB_PASSWORD';"
            echo "  GRANT ALL PRIVILEGES ON DATABASE $LOCAL_DB_NAME TO $LOCAL_DB_USER;"
            return 1
        }
    fi
    
    # Create user and grant privileges
    psql -d "$LOCAL_DB_NAME" -c "CREATE USER $LOCAL_DB_USER WITH PASSWORD '$LOCAL_DB_PASSWORD';" 2>/dev/null || {
        sudo -u postgres psql -d "$LOCAL_DB_NAME" -c "CREATE USER $LOCAL_DB_USER WITH PASSWORD '$LOCAL_DB_PASSWORD';" || true
    }
    
    psql -d "$LOCAL_DB_NAME" -c "GRANT ALL PRIVILEGES ON DATABASE $LOCAL_DB_NAME TO $LOCAL_DB_USER;" 2>/dev/null || {
        sudo -u postgres psql -d "$LOCAL_DB_NAME" -c "GRANT ALL PRIVILEGES ON DATABASE $LOCAL_DB_NAME TO $LOCAL_DB_USER;" || true
    }
    
    # Test connection
    if PGPASSWORD="$LOCAL_DB_PASSWORD" psql -h localhost -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME" -c "\q" 2>/dev/null; then
        print_success "Local database connection successful"
    else
        print_warning "Could not test local database connection"
    fi
}

# Get cloud database configuration
setup_cloud_database() {
    print_step "Setting up cloud database configuration..."
    
    echo "Cloud database providers:"
    echo "1. AWS RDS"
    echo "2. Google Cloud SQL"
    echo "3. Azure Database for PostgreSQL"
    echo "4. Custom/Other"
    
    read -p "Select cloud provider [1-4]: " PROVIDER_CHOICE
    
    case $PROVIDER_CHOICE in
        1)
            echo "AWS RDS Configuration:"
            echo "Example: mydb.cluster-xyz.us-east-1.rds.amazonaws.com"
            ;;
        2)
            echo "Google Cloud SQL Configuration:"
            echo "Example: 1.2.3.4 (External IP) or project:region:instance"
            ;;
        3)
            echo "Azure Database Configuration:"
            echo "Example: myserver.postgres.database.azure.com"
            ;;
        4)
            echo "Custom Configuration:"
            ;;
    esac
    
    read -p "Enter cloud database host: " CLOUD_DB_HOST
    read -p "Enter cloud database port [5432]: " CLOUD_DB_PORT
    CLOUD_DB_PORT=${CLOUD_DB_PORT:-5432}
    
    read -p "Enter cloud database name: " CLOUD_DB_NAME
    read -p "Enter cloud database user: " CLOUD_DB_USER
    read -s -p "Enter cloud database password: " CLOUD_DB_PASSWORD
    echo
    
    # Test cloud connection
    print_step "Testing cloud database connection..."
    if PGPASSWORD="$CLOUD_DB_PASSWORD" psql -h "$CLOUD_DB_HOST" -p "$CLOUD_DB_PORT" -U "$CLOUD_DB_USER" -d "$CLOUD_DB_NAME" -c "\q" 2>/dev/null; then
        print_success "Cloud database connection successful"
    else
        print_warning "Could not connect to cloud database. Please verify credentials and network access."
    fi
}

# Generate environment configuration
generate_env_files() {
    print_step "Generating environment configuration files..."
    
    # Development environment (.env.local)
    cat > .env.local << EOF
# Local Development Environment
ENV=development

# Primary Database (Local)
DB_HOST=localhost
DB_PORT=5432
DB_USER=${LOCAL_DB_USER}
DB_PASSWORD=${LOCAL_DB_PASSWORD}
DB_NAME=${LOCAL_DB_NAME}
DB_SSL_MODE=disable

# Cloud Database (Optional for development)
CLOUD_DB_HOST=${CLOUD_DB_HOST}
CLOUD_DB_PORT=${CLOUD_DB_PORT}
CLOUD_DB_USER=${CLOUD_DB_USER}
CLOUD_DB_PASSWORD=${CLOUD_DB_PASSWORD}
CLOUD_DB_NAME=${CLOUD_DB_NAME}
CLOUD_DB_SSL_MODE=require

# Database Configuration
DB_MAX_OPEN_CONNS=100
DB_MAX_IDLE_CONNS=10
DB_CONN_MAX_LIFETIME=3600

# Sync Configuration
DB_SYNC_ENABLED=true
DB_SYNC_INTERVAL=300  # 5 minutes
DB_BACKUP_ENABLED=true
DB_BACKUP_INTERVAL=3600  # 1 hour

# Security
ENCRYPTION_KEY=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)

# Server
SERVER_HOST=localhost
SERVER_PORT=8080
GIN_MODE=debug

# Redis (Local)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Logging
LOG_LEVEL=debug
LOG_FORMAT=text

# HIPAA Compliance
HIPAA_MODE=false  # Disabled for local development
AUDIT_LOGGING=true
EOF

    # Production environment (.env.production)
    cat > .env.production << EOF
# Production Environment
ENV=production

# Primary Database (Cloud)
DB_HOST=${CLOUD_DB_HOST}
DB_PORT=${CLOUD_DB_PORT}
DB_USER=${CLOUD_DB_USER}
DB_PASSWORD=${CLOUD_DB_PASSWORD}
DB_NAME=${CLOUD_DB_NAME}
DB_SSL_MODE=require

# Local Database (Backup/Sync)
LOCAL_DB_HOST=localhost
LOCAL_DB_PORT=5432
LOCAL_DB_USER=${LOCAL_DB_USER}
LOCAL_DB_PASSWORD=${LOCAL_DB_PASSWORD}
LOCAL_DB_NAME=${LOCAL_DB_NAME}_backup
LOCAL_DB_SSL_MODE=disable

# Database Configuration
DB_MAX_OPEN_CONNS=200
DB_MAX_IDLE_CONNS=50
DB_CONN_MAX_LIFETIME=3600

# Read Replica Configuration (Optional)
READ_REPLICA_ENABLED=false
READ_REPLICA_HOST=
READ_REPLICA_PORT=5432
READ_REPLICA_USER=
READ_REPLICA_PASSWORD=
READ_REPLICA_NAME=

# Sync Configuration
DB_SYNC_ENABLED=true
DB_SYNC_INTERVAL=900   # 15 minutes
DB_BACKUP_ENABLED=true
DB_BACKUP_INTERVAL=1800 # 30 minutes

# Security
ENCRYPTION_KEY=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRATION=3600

# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
GIN_MODE=release

# Redis (Cloud)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_SSL=false

# CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# HIPAA Compliance
HIPAA_MODE=true
AUDIT_LOGGING=true
DATA_RETENTION_DAYS=2555  # 7 years for HIPAA

# Monitoring
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true
TRACING_ENABLED=true
EOF

    print_success "Environment files created:"
    echo "  .env.local (development)"
    echo "  .env.production (production)"
}

# Install Go dependencies
install_dependencies() {
    print_step "Installing Go dependencies..."
    
    if [ -f "go.mod" ]; then
        go mod tidy
        go mod download
        print_success "Dependencies installed"
    else
        print_warning "go.mod not found. Make sure you're in the project root directory."
    fi
}

# Run database migrations
run_migrations() {
    print_step "Running database migrations..."
    
    read -p "Run migrations now? [y/N]: " RUN_MIGRATIONS
    
    if [[ $RUN_MIGRATIONS =~ ^[Yy]$ ]]; then
        export ENV=development
        if go run cmd/server/main.go migrate; then
            print_success "Migrations completed successfully"
        else
            print_warning "Migration failed. You can run it manually later with: go run cmd/server/main.go migrate"
        fi
    else
        echo "You can run migrations later with: ENV=development go run cmd/server/main.go migrate"
    fi
}

# Test the setup
test_setup() {
    print_step "Testing the setup..."
    
    read -p "Start the server to test? [y/N]: " START_SERVER
    
    if [[ $START_SERVER =~ ^[Yy]$ ]]; then
        echo "Starting server in development mode..."
        echo "Press Ctrl+C to stop"
        export ENV=development
        go run cmd/server/main.go || {
            print_error "Server failed to start. Check the logs above for errors."
            return 1
        }
    else
        echo "You can start the server manually with: ENV=development go run cmd/server/main.go"
    fi
}

# Main setup flow
main() {
    print_header
    
    echo "This script will help you set up dual PostgreSQL databases for AetherPharma."
    echo "You can configure both local and cloud databases with automatic synchronization."
    echo
    
    read -p "Continue with setup? [y/N]: " CONTINUE_SETUP
    
    if [[ ! $CONTINUE_SETUP =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
    
    # Check prerequisites
    check_postgresql
    check_go
    
    # Setup databases
    echo
    echo "=== Local Database Setup ==="
    setup_local_database
    
    echo
    echo "=== Cloud Database Setup ==="
    read -p "Do you want to configure a cloud database? [y/N]: " SETUP_CLOUD
    
    if [[ $SETUP_CLOUD =~ ^[Yy]$ ]]; then
        setup_cloud_database
    else
        # Set dummy values for cloud DB
        CLOUD_DB_HOST=""
        CLOUD_DB_PORT="5432"
        CLOUD_DB_NAME=""
        CLOUD_DB_USER=""
        CLOUD_DB_PASSWORD=""
    fi
    
    # Generate configuration
    echo
    echo "=== Configuration ==="
    generate_env_files
    
    # Install dependencies
    echo
    echo "=== Dependencies ==="
    install_dependencies
    
    # Run migrations
    echo
    echo "=== Database Migrations ==="
    run_migrations
    
    # Test setup
    echo
    echo "=== Testing ==="
    test_setup
    
    echo
    print_success "Setup completed successfully!"
    echo
    echo "Next steps:"
    echo "1. Review the generated .env.local and .env.production files"
    echo "2. Customize configuration as needed"
    echo "3. Start the server: ENV=development go run cmd/server/main.go"
    echo "4. Access the API at http://localhost:8080"
    echo
    echo "For production deployment:"
    echo "1. Update .env.production with your actual cloud database credentials"
    echo "2. Set ENV=production"
    echo "3. Deploy using your preferred method (Docker, systemd, etc.)"
    echo
    echo "Documentation: See DATABASE_SETUP_GUIDE.md for detailed information"
}

# Run main function
main "$@"