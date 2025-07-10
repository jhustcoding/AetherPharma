# 🚀 Local Development Guide: Running UI + Backend

## 📋 **Prerequisites**

Make sure you have these installed:

```bash
# Check Node.js (for React frontend)
node --version  # Should be 16+ 
npm --version   # or yarn --version

# Check Go (for backend)
go version      # Should be 1.19+

# Check PostgreSQL (for database)
psql --version  # Should be 12+
```

**Install if missing:**
- **Node.js**: https://nodejs.org/en/download/
- **Go**: https://golang.org/dl/
- **PostgreSQL**: https://www.postgresql.org/download/

## 🗃️ **Step 1: Setup Database**

### **Quick Database Setup**
```bash
# Run the automated setup script
./scripts/setup-dual-db.sh

# OR manually create local database:
sudo -u postgres psql
CREATE DATABASE pharmacy_local;
CREATE USER pharmacy_user WITH PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE pharmacy_local TO pharmacy_user;
\q
```

## ⚙️ **Step 2: Setup Backend Server**

### **1. Install Go Dependencies**
```bash
# From project root directory
go mod tidy
go mod download
```

### **2. Create Environment File**
```bash
# Create .env.local for development
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
```

### **3. Run Database Migrations**
```bash
# Set environment and run migrations
export ENV=development
go run cmd/server/main.go migrate

# Or with explicit env file
ENV=development go run cmd/server/main.go
```

### **4. Start Backend Server**
```bash
# Start the Go server
ENV=development go run cmd/server/main.go

# Server will start on http://localhost:8080
# Check health: curl http://localhost:8080/health
```

## 🎨 **Step 3: Setup React Frontend**

### **1. Initialize React Project**
```bash
# Create React TypeScript project in frontend directory
npx create-react-app frontend --template typescript
cd frontend

# Install additional dependencies for the pharmacy UI
npm install recharts lucide-react date-fns react-hot-toast
npm install @types/react @types/react-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### **2. Configure Tailwind CSS**
```bash
# Update tailwind.config.js
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

# Add Tailwind to CSS
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
```

### **3. Copy Components to React Project**
```bash
# Copy the existing TypeScript components
cp -r ../src/* src/

# Update package.json to include API proxy
npm pkg set proxy="http://localhost:8080"
```

### **4. Create API Service Layer**
```bash
# Create API service to connect to backend
cat > src/services/api.ts << 'EOF'
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Authentication
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  // Customers
  async getCustomers() {
    return this.request('/customers');
  }

  async createCustomer(customer: any) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  }

  // Products
  async getProducts() {
    return this.request('/products');
  }

  async createProduct(product: any) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  // Sales
  async getSales() {
    return this.request('/sales');
  }

  async createSale(sale: any) {
    return this.request('/sales', {
      method: 'POST',
      body: JSON.stringify(sale),
    });
  }

  // Analytics
  async getDashboardAnalytics() {
    return this.request('/analytics/dashboard');
  }

  // QR Code
  async scanQR(code: string) {
    return this.request('/qr/scan', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  // Online Orders
  async addToCart(item: any) {
    return this.request('/cart/add', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async getCart() {
    return this.request('/cart');
  }

  async createOrder(order: any) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }
}

export const apiService = new ApiService();
export default ApiService;
EOF
```

### **5. Update App.tsx**
```bash
cat > src/App.tsx << 'EOF'
import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Analytics from './components/Analytics';
import Customers from './components/Customers';
import Inventory from './components/Inventory';
import InventoryMovementAnalysis from './components/InventoryMovementAnalysis';

type Page = 'analytics' | 'customers' | 'inventory' | 'movement-analysis';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('analytics');

  const navigation = [
    { id: 'analytics' as Page, name: 'Analytics', icon: '📊' },
    { id: 'customers' as Page, name: 'Customers', icon: '👥' },
    { id: 'inventory' as Page, name: 'Inventory', icon: '📦' },
    { id: 'movement-analysis' as Page, name: 'Movement Analysis', icon: '📈' },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'analytics':
        return <Analytics />;
      case 'customers':
        return <Customers />;
      case 'inventory':
        return <Inventory />;
      case 'movement-analysis':
        return <InventoryMovementAnalysis />;
      default:
        return <Analytics />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">💊 AetherPharma</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      currentPage === item.id
                        ? 'border-primary-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
EOF
```

## 🚀 **Step 4: Run Both Servers**

### **Option 1: Run in Separate Terminals**

**Terminal 1 - Backend:**
```bash
# Start Go backend server
cd /path/to/your/project
ENV=development go run cmd/server/main.go

# Output: Server running on http://localhost:8080
```

**Terminal 2 - Frontend:**
```bash
# Start React development server  
cd frontend
npm start

# Output: React app running on http://localhost:3000
```

### **Option 2: Use Development Script**
```bash
# Create development runner script
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
./run-dev.sh
```

## 🔗 **Step 5: Connect Frontend to Backend**

### **Update Service Layer to Use Real API**
```bash
# Update your existing services to use API instead of mock data
cat > src/services/realApiService.ts << 'EOF'
import { apiService } from './api';

// Replace mock services with real API calls
export class RealCustomerService {
  static async getCustomers() {
    return apiService.getCustomers();
  }

  static async createCustomer(customer: any) {
    return apiService.createCustomer(customer);
  }
}

export class RealInventoryService {
  static async getProducts() {
    return apiService.getProducts();
  }

  static async createProduct(product: any) {
    return apiService.createProduct(product);
  }
}

export class RealAnalyticsService {
  static async getDashboardData() {
    return apiService.getDashboardAnalytics();
  }
}
EOF
```

## 🔧 **Step 6: Development Workflow**

### **Daily Development Process**
```bash
# 1. Start development environment
./run-dev.sh

# 2. Make changes to either:
#    - Go backend files (auto-restart needed)
#    - React frontend files (auto-reload)

# 3. Test API endpoints
curl http://localhost:8080/api/v1/health
curl http://localhost:8080/api/v1/products

# 4. Access frontend
open http://localhost:3000
```

### **Hot Reload Setup**

**For Go Backend (using Air):**
```bash
# Install Air for Go hot reload
go install github.com/cosmtrek/air@latest

# Create .air.toml
cat > .air.toml << 'EOF'
root = "."
testdata_dir = "testdata"
tmp_dir = "tmp"

[build]
  args_bin = []
  bin = "./tmp/main"
  cmd = "go build -o ./tmp/main ./cmd/server"
  delay = 1000
  exclude_dir = ["assets", "tmp", "vendor", "testdata", "frontend"]
  exclude_file = []
  exclude_regex = ["_test.go"]
  exclude_unchanged = false
  follow_symlink = false
  full_bin = ""
  include_dir = []
  include_ext = ["go", "tpl", "tmpl", "html"]
  kill_delay = "0s"
  log = "build-errors.log"
  send_interrupt = false
  stop_on_root = false

[color]
  app = ""
  build = "yellow"
  main = "magenta"
  runner = "green"
  watcher = "cyan"

[log]
  time = false

[misc]
  clean_on_exit = false

[screen]
  clear_on_rebuild = false
EOF

# Start with hot reload
ENV=development air
```

## 🐳 **Step 7: Docker Development (Optional)**

```bash
# Create docker-compose.dev.yml for complete development environment
cat > docker-compose.dev.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: pharmacy_local
      POSTGRES_USER: pharmacy_user
      POSTGRES_PASSWORD: password123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  backend:
    build:
      context: .
      dockerfile: Dockerfile.dev
    environment:
      - ENV=development
      - DB_HOST=postgres
      - REDIS_HOST=redis
    ports:
      - "8080:8080"
    volumes:
      - .:/app
    depends_on:
      - postgres
      - redis

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
    environment:
      - REACT_APP_API_URL=http://localhost:8080/api/v1

volumes:
  postgres_data:
EOF

# Start all services
docker-compose -f docker-compose.dev.yml up
```

## 🌐 **Step 8: Access Your Application**

### **URLs:**
- **Frontend (React)**: http://localhost:3000
- **Backend API**: http://localhost:8080/api/v1
- **API Health Check**: http://localhost:8080/health
- **API Documentation**: http://localhost:8080/swagger (if implemented)

### **Test the Integration:**
```bash
# Test backend API
curl http://localhost:8080/api/v1/health
curl http://localhost:8080/api/v1/products

# Test QR scanning
curl -X POST http://localhost:8080/api/v1/qr/scan \
  -H "Content-Type: application/json" \
  -d '{"code": "test-qr-code"}'

# Test cart functionality
curl -X POST http://localhost:8080/api/v1/cart/add \
  -H "Content-Type: application/json" \
  -d '{"product_id": "uuid", "quantity": 2}'
```

## 🛠️ **Troubleshooting**

### **Common Issues:**

1. **Backend won't start:**
   ```bash
   # Check database connection
   pg_isready -h localhost -p 5432 -U pharmacy_user
   
   # Check environment variables
   echo $ENV
   cat .env.local
   ```

2. **Frontend can't connect to backend:**
   ```bash
   # Check CORS settings in .env.local
   CORS_ALLOWED_ORIGINS=http://localhost:3000
   
   # Test backend directly
   curl http://localhost:8080/health
   ```

3. **Database migration errors:**
   ```bash
   # Reset database
   psql -U pharmacy_user -d pharmacy_local -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
   
   # Re-run migrations
   ENV=development go run cmd/server/main.go migrate
   ```

## ✅ **You're Ready!**

Now you can:
- ✅ **Develop frontend** with React components
- ✅ **Develop backend** with Go APIs  
- ✅ **Test QR scanning** functionality
- ✅ **Test online ordering** system
- ✅ **Access real-time data** from database
- ✅ **Hot reload** for efficient development

**Start developing**: Run `./run-dev.sh` and visit http://localhost:3000! 🚀