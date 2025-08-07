# AetherPharma Project Structure

## 🏗️ Current Clean Architecture

```
AetherPharma/
├── 🗂️ Backend (Go/Gin/GORM)
│   ├── cmd/server/main.go              # Application entry point
│   ├── internal/
│   │   ├── api/handlers.go             # HTTP request handlers
│   │   ├── auth/auth.go               # JWT authentication
│   │   ├── config/config.go           # Configuration management
│   │   ├── database/migrations.go     # Database setup
│   │   ├── middleware/middleware.go   # Security & CORS
│   │   ├── models/models.go           # Database models
│   │   ├── services/                  # Business logic
│   │   └── utils/encryption.go        # HIPAA compliance
│   ├── go.mod & go.sum                # Go dependencies
│   └── pharmacy.db                    # SQLite database
│
├── 🗂️ Frontend (React/TypeScript/Tailwind)
│   ├── src/
│   │   ├── components/                # UI components
│   │   │   ├── Analytics.tsx          # Dashboard analytics
│   │   │   ├── Customers.tsx          # Customer management
│   │   │   ├── Inventory.tsx          # Product inventory
│   │   │   ├── Login.tsx              # Authentication
│   │   │   ├── Orders.tsx             # Order processing
│   │   │   ├── QRScanner.tsx          # QR code scanning
│   │   │   └── Suppliers.tsx          # Supplier management
│   │   ├── contexts/                  # Global state
│   │   │   ├── AuthContext.tsx        # User authentication
│   │   │   └── NotificationContext.tsx # Notifications
│   │   ├── services/                  # API clients
│   │   │   ├── api.ts                 # Base API service
│   │   │   ├── authService.ts         # Authentication API
│   │   │   ├── customerService.ts     # Customer API
│   │   │   ├── inventoryService.ts    # Inventory API
│   │   │   ├── salesService.ts        # Sales API
│   │   │   ├── supplierService.ts     # Supplier API
│   │   │   └── serviceService.ts      # Medical services API
│   │   ├── types.ts                   # TypeScript interfaces
│   │   └── App.tsx                    # Main application
│   ├── package.json                   # Node.js dependencies
│   └── tailwind.config.js             # Styling configuration
│
├── 🗂️ Infrastructure
│   ├── docker/postgres/init.sql       # PostgreSQL setup
│   ├── docker-compose.yml             # Container orchestration
│   └── Dockerfile                     # Backend container
│
├── 🗂️ Development
│   ├── run-dev.sh                     # Start both servers
│   ├── fix-permissions.sh             # Fix cache issues
│   ├── CLAUDE.md                      # Project instructions
│   └── scripts/setup-dual-db.sh       # Database setup
│
└── 🗂️ Archive
    ├── unused-components/             # Archived code
    ├── scripts/                       # Old setup scripts
    ├── logs/                          # Development logs
    ├── docs/                          # Historical documentation
    └── README.md                      # Archive guide
```

## 🚀 Quick Start

```bash
# Start development environment
./run-dev.sh

# Backend: http://localhost:8080
# Frontend: http://localhost:3000
```

## 🔑 Key Features

- **🏥 Pharmacy Management**: Complete inventory and sales system
- **🛒 Grocery Items**: Non-prescription products and supplies
- **💊 Prescription Drugs**: Full medication management
- **📱 QR Code System**: Customer identification and order tracking
- **🏪 Supplier Management**: Medicine supplier relationships
- **🔐 HIPAA Compliance**: Medical data encryption and audit logs
- **👥 Role-Based Access**: Admin, Manager, Pharmacist, Assistant roles
- **📊 Analytics Dashboard**: Sales, inventory, and customer insights

## 🔧 Development Tools

- **Backend**: Go 1.21+, Gin framework, GORM ORM
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Database**: PostgreSQL (production) / SQLite (development)
- **Authentication**: JWT tokens with role-based permissions
- **Security**: AES-256 encryption, rate limiting, audit logging

## 📚 Documentation

- **Setup**: See `CLAUDE.md` for detailed instructions
- **API**: Backend exposes RESTful API at `/api/v1/`
- **Authentication**: JWT Bearer tokens required for protected routes
- **Database**: Auto-migration on startup, dual database support

---
*Clean architecture implemented: August 2025*