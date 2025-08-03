# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### Role-Based Access
- **Admin**: Full system access, user management, supplier management
- **Manager**: Customer/product/sales/supplier management, analytics
- **Pharmacist**: Limited customer/product access, sales processing, read-only suppliers
- **Assistant**: Read-only access, basic sales operations

## Database Architecture

### Connection Handling
- Primary: PostgreSQL with connection pooling
- Fallback: SQLite for development when PostgreSQL unavailable
- Auto-migration on startup creates/updates tables
- Redis for session management and rate limiting (optional)
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

## Pharmacy-Specific Features

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

### Customer Types
- **Full Customer**: Complete profile with medical history, allergies, medications
- **Guest Customer**: Minimal profile focused on discount eligibility only
- **Both types save to same database table with appropriate validation

### Order Management
- Online orders from customers (real-time notifications)
- In-store order processing with cart management
- USB barcode scanner support (keyboard event listeners, NOT camera-based)
- QR code generation for customer identification
- Inventory tracking with low-stock alerts

### Supplier Management
- Complete supplier profiles with contact information and agents
- Ordering instructions and payment terms
- Address management for delivery coordination
- Active/inactive status tracking for supplier relationships

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

## Troubleshooting

### Authentication Testing
Default credentials (change in production):
- Admin: `admin` / `admin123`
- Pharmacist: `pharmacist1` / `admin123`

### Database Fallback Behavior
System gracefully handles PostgreSQL unavailability by falling back to SQLite. Real production deployments should ensure PostgreSQL availability.

### File Uploads
ID documents and prescription images are handled as File objects in frontend. Backend expects file names in API payload - implement proper file storage as needed.

### USB Barcode Scanner Integration
- Uses keyboard event listeners to capture barcode input
- Does NOT use camera for barcode scanning
- Listens for rapid key sequences ending with Enter key
- Automatically processes scanned barcodes

### Frontend Cache Issues
If you encounter ESLint cache permission errors:
1. Use `./start-dev-safe.sh` or `./start-no-cache.sh` instead of `npm start`
2. These scripts disable ESLint caching and clean problematic cache directories
3. The `.env.local` file contains cache-disabling environment variables
4. If persistent, use `DISABLE_ESLINT_PLUGIN=true npm start`

### Authentication Issues
If frontend shows "Failed to load suppliers" or similar API errors:
1. The AuthContext.tsx may be using demo tokens instead of real JWT tokens
2. Use browser console to manually authenticate:
   ```javascript
   // Clear old tokens and login with real backend
   localStorage.removeItem('auth_token');
   fetch('http://localhost:8080/api/v1/auth/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ username: 'admin', password: 'admin123' })
   }).then(r => r.json()).then(d => {
     localStorage.setItem('auth_token', d.access_token);
     localStorage.setItem('user_info', JSON.stringify({...d.user, firstName: d.user.first_name, lastName: d.user.last_name}));
     location.reload();
   });
   ```
3. Ensure backend is running on port 8080 before starting frontend

### API Endpoints Coverage
The system includes complete CRUD operations for:
- Customers (with discount eligibility and encrypted medical data)
- Products (with prescription requirements and inventory tracking)  
- Sales (with discount calculations and refund capabilities)
- Suppliers (with contact management and ordering instructions)
- Analytics (dashboard metrics, sales trends, inventory movement)
- QR Code scanning for customer identification
- Online order processing with real-time notifications

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

## Deployment Notes

### Docker
```bash
docker-compose up -d            # Start all services
docker-compose logs -f backend  # View backend logs
docker-compose down             # Stop all services
```

### Production Checklist
- Set secure JWT_SECRET and ENCRYPTION_KEY
- Enable HIPAA_MODE
- Configure PostgreSQL with SSL
- Set up Redis for session management
- Enable rate limiting
- Configure CORS for production domain
- Set up SSL/TLS certificates
- Enable audit logging
- Configure backup strategy