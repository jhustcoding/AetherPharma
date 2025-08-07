# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AetherPharma is a comprehensive pharmacy management system with:
- **Fast order workflow** with USB barcode scanning
- **Customer management** with discount eligibility (Senior Citizen/PWD)
- **Prescription handling** with camera integration
- **Real-time online orders** with notifications
- **Supplier management** with ordering instructions
- **Analytics dashboard** with sales trends
- **Role-based authentication** with JWT tokens
- **HIPAA-compliant data encryption**

## Docker Deployment

This project uses Docker Compose for deployment. There are only **2 configurations**:

### 🚀 Production (TrueNAS SCALE) - MAIN DEPLOYMENT

**File:** `truenas-docker-compose-production.yaml`

**Usage:**
```bash
docker-compose -f truenas-docker-compose-production.yaml up -d
```

**Features:**
- ✅ Uses **Tailscale IP (100.104.33.63)** for cross-device access
- ✅ PostgreSQL database with migrations
- ✅ Production-optimized environment variables
- ✅ CORS configured for external access

**Access URLs:**
- Frontend: http://100.104.33.63:3000
- Backend: http://100.104.33.63:8080

### 🔧 Local Development

**File:** `docker-compose.yml`

**Usage:**
```bash
docker-compose up -d
```

**Features:**
- ✅ Uses localhost (127.0.0.1)
- ✅ Development mode settings
- ✅ Hot reloading enabled

**Access URLs:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8080

## Development Commands

### Full Development Environment
```bash
./run-dev.sh                    # Start both backend and frontend servers
# Backend: http://localhost:8080
# Frontend: http://localhost:3000
# Health check: http://localhost:8080/health
```

### Backend (Go) Commands
```bash
go run cmd/server/main.go       # Start backend server
go test ./...                   # Run all tests
go test -v ./internal/api/...   # Run specific package tests
go test -tags=integration ./... # Run integration tests
go mod tidy                     # Clean up dependencies
go build -o pharmacy-backend cmd/server/main.go  # Build binary
```

### Frontend (React/TypeScript) Commands
```bash
cd frontend
npm start                       # Start development server
./start-dev-safe.sh             # Start with cache issues bypassed (recommended)
npm run build                   # Build for production
npm test                        # Run tests
npm test -- --coverage          # Run tests with coverage
npm run lint                    # Run ESLint
npm run type-check              # Run TypeScript type checking
```

### Database Commands
```bash
# SQLite (development fallback)
sqlite3 pharmacy.db             # Open database CLI

# PostgreSQL (production)
psql -U postgres -d pharmacy_db # Connect to PostgreSQL
```

### Environment Setup
The `run-dev.sh` script automatically creates `.env.local` with development settings if it doesn't exist. For production, ensure these critical environment variables are set:
- `JWT_SECRET`: 32+ character secure key
- `ENCRYPTION_KEY`: Exactly 32 characters for AES-256
- `DB_PASSWORD`: Strong database password
- `HIPAA_MODE=true`: Enable compliance features
- `POSTGRES_HOST`: PostgreSQL hostname (defaults to localhost)
- `POSTGRES_PORT`: PostgreSQL port (defaults to 5432)

## Authentication & Access

### Default Login Credentials
```
Username: admin
Password: admin123
```

**Other test accounts:**
- Pharmacist: `pharmacist1` / `admin123`

### Role-Based Access
- **Admin**: Full system access, user management, supplier management
- **Manager**: Customer/product/sales/supplier management, analytics
- **Pharmacist**: Limited customer/product access, sales processing, read-only suppliers
- **Assistant**: Read-only access, basic sales operations

## Architecture Overview

### Backend (Go/Gin/GORM)
- **Entry Point**: `cmd/server/main.go`
- **API Handlers**: `internal/api/` - HTTP request handlers with authentication middleware
- **Models**: `internal/models/` - GORM database models with encrypted fields
- **Authentication**: `internal/auth/` - JWT-based auth with role-based permissions
- **Database**: `internal/database/` - Migrations and connection management
- **Security**: `internal/middleware/` - Rate limiting, CORS, audit logging
- **Services**: `internal/services/` - Business logic for QR codes and online orders
- **Config**: `internal/config/` - Configuration management

### Frontend (React/TypeScript/Tailwind)
- **Main App**: `src/App.tsx` - Route handling and authentication state
- **Components**: `src/components/` - Feature-specific UI components
- **Contexts**: `src/contexts/` - Global state management (Auth, Notifications)
- **Services**: `src/services/` - API client functions and data fetching
- **Types**: `src/types.ts` - TypeScript interfaces matching backend models

### Key Data Models
- **Customer**: Includes discount eligibility (Senior Citizen/PWD) with encrypted ID fields
- **Product**: Pharmacy inventory with prescription requirements and medical metadata
- **Sale/Order**: Transaction records with discount calculations and prescription handling
- **Supplier**: Medicine supplier management with contact details and ordering instructions
- **User**: Authentication with role-based permissions (admin, manager, pharmacist, assistant)

## Security & Compliance Architecture

### Data Encryption
- Medical data uses `EncryptedString` and `EncryptedStringArray` types
- Automatic encryption/decryption via GORM hooks
- AES-256-GCM encryption for HIPAA compliance

### Authentication Flow
1. Login via `/api/v1/auth/login` with credentials
2. JWT token returned with role and permissions
3. Frontend stores token in localStorage
4. All API requests include `Authorization: Bearer <token>` header
5. Backend middleware validates token and permissions

### Token Persistence Issues (RESOLVED)
- **Problem**: AuthContext was calling non-existent `/auth/verify` endpoint
- **Solution**: Removed backend verification, restored user from localStorage
- **Problem**: API service cleared tokens on any 401 error
- **Solution**: Only clear tokens for specific invalid/expired/malformed errors

## Database Architecture

### Connection Handling
- Primary: PostgreSQL with connection pooling
- Fallback: SQLite for development when PostgreSQL unavailable
- Auto-migration on startup creates/updates tables
- **Important**: When using SQLite, use `LIKE ? COLLATE NOCASE` instead of `ILIKE` for case-insensitive searches

### Key Relationships
- Customer → Sales (one-to-many)
- Product → SaleItems (one-to-many)
- Supplier → Products (one-to-many supplier relationship)
- User → AuditLogs (one-to-many for compliance)
- OnlineOrder → Customer (many-to-one with discount calculations)

## Frontend State Management

### Contexts
- **AuthContext**: User authentication, role permissions, login/logout
- **NotificationContext**: Online order management, real-time updates

### API Integration
- All components use real database APIs (not mock data)
- Consistent error handling with toast notifications
- Automatic retry for failed requests
- Customer creation syncs between Orders and Customer pages
- **Field Naming**: Backend uses snake_case, frontend handles both camelCase and snake_case

### React Error Fixes Applied
- **Orders component**: Fixed `useNotification` import to match actual exports (`onlineOrders` not `notifications`)
- **Analytics component**: Added null safety checks for array operations
- **NotificationContext**: Added array safety checks to prevent "prev is not iterable" errors

## Pharmacy-Specific Features

### Fast Order Workflow (USB Barcode Scanning)
- **Always-on barcode scanning** in Orders tab using USB scanners
- Uses **keyboard event listeners** (NOT camera-based scanning)
- Listens for rapid key sequences ending with Enter key
- Automatically processes scanned barcodes
- Multi-step workflow: Product scanning → Customer identification → Prescription handling → Payment

### Customer Identification
- **Existing members**: QR code scanning for fast identification
- **New customers**: Full registration with medical history
- **Guest customers**: Minimal profile for discount eligibility only

### Discount System
- Senior Citizen (20% discount) takes priority over PWD (20% discount)
- Automatic eligibility detection with manual approval workflow
- ID document upload via camera or file upload
- Real-time discount calculations in order flow

### Prescription Handling
- Products marked with `prescriptionRequired: boolean` or `prescription_required: boolean`
- Order validation requires prescription number OR uploaded prescription images
- Camera integration for capturing prescription letters
- Multiple prescription images supported per order
- Batch prescription processing after product scanning

### Order Management
- Online orders from customers (real-time notifications)
- In-store order processing with cart management
- QR code generation for customer identification
- Inventory tracking with low-stock alerts

### Supplier Management
- Complete supplier profiles with contact information and agents
- Ordering instructions and payment terms
- Address management for delivery coordination
- Active/inactive status tracking for supplier relationships

## Network Configuration

### Tailscale Integration
- **Production IP**: `100.104.33.63` (configured in truenas-docker-compose-production.yaml)
- **Local Network**: `192.168.0.9` (for local development)
- Enables secure cross-device access without port forwarding

### CORS Configuration
- Backend configured with `CORS_ALLOWED_ORIGINS: "*"` for external access
- Supports requests from any origin (appropriate for internal Tailscale network)

## Common Development Tasks

### Adding a New API Endpoint
1. Define the handler in `internal/api/handlers.go`
2. Add route in `cmd/server/main.go` with appropriate middleware
3. Update frontend service in `frontend/src/services/`
4. Add TypeScript types in `frontend/src/types.ts`

### Running with Custom Configuration
```bash
# Backend with custom config
JWT_SECRET=your-secret-key go run cmd/server/main.go

# Frontend with custom API URL
REACT_APP_API_BASE_URL=https://api.example.com npm start
```

### Database Migrations
- Migrations run automatically on startup
- Located in `internal/database/migrations.go`
- Use GORM's AutoMigrate for schema changes
- Default admin user created automatically: `admin` / `admin123`

## Troubleshooting Guide

### Frontend Cache Issues
If you encounter ESLint cache permission errors:
1. Use `./start-dev-safe.sh` instead of `npm start`
2. These scripts disable ESLint caching and clean problematic cache directories
3. The `.env.local` file contains cache-disabling environment variables
4. If persistent, use `DISABLE_ESLINT_PLUGIN=true npm start`

### Authentication Debugging
If frontend shows API errors or token issues:
1. Check browser console for errors
2. Verify token in localStorage: `localStorage.getItem('auth_token')`
3. Clear tokens manually if needed:
   ```javascript
   localStorage.removeItem('auth_token');
   localStorage.removeItem('user_info');
   localStorage.removeItem('refresh_token');
   ```
4. Test backend directly: `curl http://100.104.33.63:8080/health`
5. Ensure backend is running before starting frontend

### Database Connection Issues
1. **PostgreSQL not available**: System falls back to SQLite automatically
2. **Migration errors**: Check database user permissions
3. **Empty users table**: Default admin user should be created automatically

### Container Permission Issues
If Docker containers create root-owned files:
1. Files may be owned by root due to container execution
2. Use `sudo chown -R $(whoami):staff <directory>` to fix ownership
3. This commonly affects `.env`, `node_modules/`, and generated files

## API Endpoints Coverage
The system includes complete CRUD operations for:
- **Customers** (with discount eligibility and encrypted medical data)
- **Products** (with prescription requirements and inventory tracking)  
- **Sales** (with discount calculations and refund capabilities)
- **Suppliers** (with contact management and ordering instructions)
- **Analytics** (dashboard metrics, sales trends, inventory movement)
- **QR Code scanning** for customer identification
- **Online order processing** with real-time notifications

## Performance Optimization

### Backend
- Connection pooling for PostgreSQL
- Indexed fields for common queries
- Batch operations for bulk updates
- Caching headers for static resources

### Frontend  
- Lazy loading for route components
- Memoization for expensive calculations
- Debounced search inputs
- Optimistic UI updates

## Production Deployment Checklist

### Security Configuration
- ✅ Set secure JWT_SECRET (32+ characters)
- ✅ Set ENCRYPTION_KEY (exactly 32 characters for AES-256)
- ✅ Enable HIPAA_MODE=true
- ✅ Configure strong database passwords
- ✅ Enable audit logging

### Network & Access
- ✅ Configure Tailscale IP (100.104.33.63)
- ✅ Set up CORS for production domain
- ✅ Test cross-device access via Tailscale
- ✅ Verify ports 3000, 8080 are accessible

### Database & Persistence
- ✅ PostgreSQL with SSL enabled
- ✅ Connection pooling configured
- ✅ Backup strategy implemented
- ✅ Migration verification

### Monitoring & Maintenance
- ✅ Container restart policies set
- ✅ Log aggregation configured
- ✅ Health check endpoints verified
- ✅ Performance monitoring enabled

## File Organization

### Essential Files (Keep These)
- `truenas-docker-compose-production.yaml` - **Main production deployment**
- `docker-compose.yml` - Local development
- `run-dev.sh` - Development startup script
- `CLAUDE.md` - This comprehensive documentation

### Cleaned Up (Removed)
- All temporary fix scripts (*.sh debug files)
- Multiple redundant YAML variants
- Debug HTML files
- Backup component files

## Important Notes
- **Always use the production YAML file** for TrueNAS deployment
- **Tailscale IP (100.104.33.63)** is configured for cross-device access
- **Authentication tokens persist** when switching tabs (issue resolved)
- **USB barcode scanners** use keyboard input (not camera)
- **Default credentials** should be changed in production
- **All major component crashes** have been resolved